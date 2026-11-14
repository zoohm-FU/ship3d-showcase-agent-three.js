/**
 * 三维舞台
 * - WebGLRenderer / ACES 色调映射 / 物理光照
 * - 程序化水面与接触阴影
 * - 工业蓝绿环境反射、可控辉光
 * - 提供运行期画质切换接口
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    stencil: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 由主循环每帧手动重置，让性能 HUD 聚合阴影、场景与后处理 pass 的真实调用量
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020a10, 0.0017);

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.5, 1400);
  camera.position.set(198, 78, 158);

  const environment = setupEnvironment(renderer, scene);
  const lights = setupLights(scene);
  const water = createWater();
  scene.add(water.group);
  const particles = createAtmosphereParticles();
  scene.add(particles.group);
  scene.add(createContactShadow());

  const renderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      type: THREE.HalfFloatType,
      samples: IS_TOUCH ? 0 : 4,
      colorSpace: THREE.LinearSRGBColorSpace
    }
  );

  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2,
    0.5,
    0.88
  );
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  const qualityState = {
    id: 'balanced',
    pixelRatio: 1.5,
    shadows: true,
    bloom: true,
    composer: true,
    waterDetail: 1,
    samples: IS_TOUCH ? 0 : 4,
    shadowMapSize: 2048
  };

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(height, 1);

    camera.aspect = aspect;
    camera.fov = aspect < 0.72 ? 43 : aspect < 1.05 ? 37 : 32;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualityState.pixelRatio));
    renderer.setSize(width, height, false);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualityState.pixelRatio));
    composer.setSize(width, height);
    bloomPass.setSize(width, height);
  }

  function render() {
    renderer.info.reset();
    if (qualityState.composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  /**
   * 画质切换不修改船舶几何、动画与可见性，只调整渲染成本项。
   * @param {object} profile performance.js 中的质量档
   */
  function applyQuality(profile) {
    qualityState.id = profile.id;
    qualityState.pixelRatio = profile.maxPixelRatio;
    qualityState.shadows = profile.shadows;
    qualityState.bloom = profile.bloom;
    qualityState.composer = profile.composer;
    qualityState.waterDetail = profile.waterDetail;
    qualityState.shadowMapSize = profile.shadowMapSize;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
    renderer.shadowMap.enabled = profile.shadows;
    lights.key.castShadow = profile.shadows;
    lights.key.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
    if (lights.key.shadow.map) {
      lights.key.shadow.map.dispose();
      lights.key.shadow.map = null;
    }
    bloomPass.enabled = profile.bloom;
    bloomPass.strength = profile.bloomStrength;
    water.setDetail(profile.waterDetail);
    resize();
    renderer.shadowMap.needsUpdate = true;
  }

  function setWaterOpacity(opacity) {
    water.setOpacity(opacity);
  }

  function setWaterMode(mode) {
    water.setMode(mode);
  }

  function dispose() {
    composer.dispose();
    environment.texture?.dispose?.();
    water.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    renderer.dispose();
    window.removeEventListener('resize', resize);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  return {
    scene,
    camera,
    renderer,
    composer,
    bloomPass,
    lights,
    water,
    particles,
    resize,
    render,
    applyQuality,
    setWaterOpacity,
    setWaterMode,
    dispose,
    getQualityState: () => ({ ...qualityState })
  };
}

/* -------------------------------------------------------------------------- */
/* 环境反射                                                                     */
/* -------------------------------------------------------------------------- */
function setupEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room = new RoomEnvironment();
  const renderTarget = pmrem.fromScene(room, 0.035);
  scene.environment = renderTarget.texture;
  scene.environmentIntensity = 0.42;
  room.dispose?.();
  pmrem.dispose();
  return renderTarget;
}

/* -------------------------------------------------------------------------- */
/* 灯光                                                                         */
/* -------------------------------------------------------------------------- */
function setupLights(scene) {
  const hemisphere = new THREE.HemisphereLight(0x74a9b3, 0x02070b, 0.52);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xf0fff7, 2.15);
  key.position.set(96, 128, 74);
  key.target.position.set(0, 4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 480;
  key.shadow.camera.left = -100;
  key.shadow.camera.right = 100;
  key.shadow.camera.top = 90;
  key.shadow.camera.bottom = -90;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.18;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(0x53d9cb, 1.25);
  rim.position.set(-88, 46, -108);
  rim.target.position.set(0, 8, 0);
  scene.add(rim);
  scene.add(rim.target);

  const fill = new THREE.DirectionalLight(0x769ec9, 0.62);
  fill.position.set(16, 25, 150);
  fill.target.position.set(0, 5, 0);
  scene.add(fill);
  scene.add(fill.target);

  const under = new THREE.PointLight(0x36cfae, 42, 100, 2);
  under.position.set(0, 2, 0);
  scene.add(under);

  return { hemisphere, key, rim, fill, under };
}

/* -------------------------------------------------------------------------- */
/* 数字水面                                                                     */
/* -------------------------------------------------------------------------- */
function createWater() {
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uMode: { value: 0 },
    uDetail: { value: 1 },
    uDeep: { value: new THREE.Color(0x01070c) },
    uShallow: { value: new THREE.Color(0x041720) },
    uGrid: { value: new THREE.Color(0x2c7581) },
    uSky: { value: new THREE.Color(0x234b58) }
  };

  const geometry = new THREE.PlaneGeometry(940, 720, 1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      varying vec3 vWorld;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uMode;
      uniform float uDetail;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uGrid;
      uniform vec3 uSky;

      float lineGrid(vec2 coord, float spacing) {
        vec2 scaled = coord / spacing;
        vec2 width = fwidth(scaled);
        vec2 dist = abs(fract(scaled - 0.5) - 0.5) / max(width, vec2(0.0001));
        return 1.0 - min(min(dist.x, dist.y), 1.0);
      }

      void main() {
        vec2 p = vWorld.xz;
        float dist = length(p);

        float longWave = sin(p.x * 0.043 + uTime * 0.25) * 0.5
                       + cos(p.y * 0.055 - uTime * 0.18) * 0.5;
        float fineWave = sin(p.x * 0.45 + p.y * 0.23 + uTime * 0.65) * 0.5 + 0.5;
        fineWave *= 0.16 * uDetail;

        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - clamp(viewDirection.y, 0.0, 1.0), 3.2);

        vec3 color = mix(uDeep, uShallow, 0.25 + longWave * 0.05 + fineWave * 0.18);
        color = mix(color, uSky, fresnel * 0.2);

        float minor = lineGrid(p, 4.0);
        float major = lineGrid(p, 20.0);
        float fade = 1.0 - smoothstep(42.0, 285.0, dist);
        color = mix(color, uGrid, minor * 0.034 * fade + major * 0.12 * fade);

        float sweep = sin(dist * 0.08 - uTime * 0.32) * 0.5 + 0.5;
        sweep = smoothstep(0.97, 1.0, sweep) * (1.0 - smoothstep(10.0, 200.0, dist));
        color += vec3(0.16, 0.6, 0.44) * sweep * (0.09 + uMode * 0.06);

        float nearGlow = 1.0 - smoothstep(8.0, 88.0, dist);
        color += vec3(0.015, 0.09, 0.075) * nearGlow;

        float edgeFade = 1.0 - smoothstep(300.0, 455.0, dist);
        float alpha = uOpacity * edgeFade * (0.71 + fresnel * 0.1);

        gl_FragColor = vec4(color, alpha);
      }
    `
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.03;
  plane.renderOrder = 3;

  const group = new THREE.Group();
  group.add(plane);

  // 水线附近的发光椭圆，增加船体与水面的接触层次
  const contactMaterial = new THREE.MeshBasicMaterial({
    color: 0x37e4b6,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const contactBaseOpacity = 0.075;
  const contactRing = new THREE.Mesh(new THREE.RingGeometry(38, 43, 132), contactMaterial);
  contactRing.rotation.x = -Math.PI / 2;
  contactRing.scale.set(1.45, 1, 0.55);
  contactRing.position.y = 0.02;
  contactRing.renderOrder = 4;
  group.add(contactRing);

  const innerRingMaterial = contactMaterial.clone();
  innerRingMaterial.opacity = 0.045;
  const innerBaseOpacity = 0.045;
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(22, 23, 128), innerRingMaterial);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.scale.set(1.55, 1, 0.6);
  innerRing.position.y = 0.03;
  innerRing.renderOrder = 4;
  group.add(innerRing);

  function update(delta, elapsed) {
    uniforms.uTime.value = elapsed;
    contactRing.rotation.z += delta * 0.025;
    innerRing.rotation.z -= delta * 0.018;
    contactMaterial.opacity = contactBaseOpacity + Math.sin(elapsed * 0.65) * 0.012;
  }

  function setDetail(value) {
    uniforms.uDetail.value = value;
  }

  function setOpacity(value) {
    uniforms.uOpacity.value = value;
    contactMaterial.opacity = contactBaseOpacity * value;
    innerRingMaterial.opacity = innerBaseOpacity * value;
    contactRing.visible = value > 0.08;
    innerRing.visible = value > 0.08;
  }

  function setMode(mode) {
    uniforms.uMode.value = mode === 'energy' ? 1 : 0;
  }

  return { group, update, setDetail, setOpacity, setMode, uniforms };
}

/* -------------------------------------------------------------------------- */
/* 细微空气粒子：工业空间的悬浮尘埃，不参与拾取或数据表达                          */
/* -------------------------------------------------------------------------- */
function createAtmosphereParticles() {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const baseY = new Float32Array(count);
  const phases = new Float32Array(count);
  let seed = 20260415;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i += 1) {
    const index = i * 3;
    positions[index] = (random() - 0.5) * 235;
    positions[index + 1] = 2 + random() * 46;
    positions[index + 2] = (random() - 0.5) * 185;
    baseY[i] = positions[index + 1];
    phases[i] = random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 64;
  spriteCanvas.height = 64;
  const ctx = spriteCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(226,255,244,0.9)');
  gradient.addColorStop(0.28, 'rgba(108,235,204,0.5)');
  gradient.addColorStop(1, 'rgba(20,80,72,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(spriteCanvas);
  sprite.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.PointsMaterial({
    color: 0x81d7c3,
    map: sprite,
    size: 0.4,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'AtmosphereDust';
  points.frustumCulled = false;
  points.renderOrder = 2;

  const group = new THREE.Group();
  group.add(points);

  function update(delta, elapsed) {
    const array = geometry.attributes.position.array;
    for (let i = 0; i < count; i += 1) {
      const index = i * 3;
      array[index + 1] = baseY[i] + Math.sin(elapsed * 0.17 + phases[i]) * 1.1;
      array[index] += Math.sin(elapsed * 0.12 + phases[i]) * 0.004;
    }
    geometry.attributes.position.needsUpdate = true;
    material.opacity = 0.28 + Math.sin(elapsed * 0.35) * 0.035;
  }

  return { group, update, points };
}

/* -------------------------------------------------------------------------- */
/* 软接触阴影                                                                   */
/* -------------------------------------------------------------------------- */
function createContactShadow() {
  const material = new THREE.ShadowMaterial({ color: 0x00070a, opacity: 0.34 });
  const geometry = new THREE.PlaneGeometry(220, 110);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.12;
  mesh.receiveShadow = true;
  mesh.renderOrder = 5;
  return mesh;
}
