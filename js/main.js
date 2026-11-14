/**
 * SHIP 3D V3 启动入口
 * 宁远电鲲 · 纯电动智能船舶数字展示平台
 */
import * as THREE from 'three';
import { createStage } from './scene.js';
import { createNingyuanShip } from './ship.js';
import { CameraDirector } from './controls.js';
import { PerformanceManager } from './performance.js';
import { UI } from './ui.js';

const canvas = document.querySelector('#scene-canvas');
const ui = new UI({
  onMode: (mode) => activateMode(mode),
  onView: (view) => selectView(view),
  onAutoRotate: () => toggleAutoRotate(),
  onReset: () => resetView(),
  onQuality: () => cycleQuality(),
  onComponentSelect: (id) => selectComponent(id),
  onFocus: (target) => focusSystem(target),
  onHome: () => home()
});

let stage = null;
let ship = null;
let director = null;
let perfManager = null;
let animationFrame = 0;
let waterOpacity = 1;
let waterTarget = 1;
let disposed = false;
let currentMode = 'exterior';
const pointerState = {
  down: false,
  x: 0,
  y: 0,
  lastHoverAt: 0
};

init();

async function init() {
  try {
    ui.setProgress(4, 'INITIALIZING WEBGL 2');
    await nextFrame();

    stage = createStage(canvas);
    stage.setWaterOpacity(1);
    stage.setWaterMode('exterior');
    ui.setProgress(17, 'LOADING PHOTO-RECONSTRUCTION MODEL');
    await wait(90);

    ui.setProgress(31, 'LOFTING HULL / 108 STATIONS');
    await nextFrame();
    ship = createNingyuanShip();
    stage.scene.add(ship.root);
    ui.attachShip(ship);
    ui.setProgress(64, 'ASSEMBLING DECKHOUSE & RAILINGS');
    await wait(80);

    director = new CameraDirector(stage.camera, canvas);
    ui.setProgress(76, 'MAPPING BATTERY & PROPULSION SYSTEMS');
    await nextFrame();

    perfManager = new PerformanceManager({
      stage,
      onStats: (stats) => ui.setStats(stats),
      onQualityChange: (quality) => ui.setQuality(quality),
      onDetailLevel: (level) => ship?.setDetailLevel(level)
    });
    ui.setQuality({
      mode: perfManager.mode,
      profile: perfManager.activeProfile,
      label: 'AUTO'
    });

    bindCameraEvents();
    bindCanvasPicking();
    bindLifecycle();
    applyModeState('exterior', { initial: true });
    ui.setActiveView('perspective');

    startRenderLoop();
    ui.setProgress(88, 'CALIBRATING DIGITAL WATERLINE');
    await wait(160);
    ui.setProgress(96, 'VERIFYING DATA LAYERS & MODE BINDINGS');
    await wait(220);

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      director.intro();
    }

    ui.setProgress(100, 'DIGITAL TWIN READY');
    ui.finishLoading();
    document.documentElement.dataset.ship3dReady = 'true';

    window.__SHIP3D__ = {
      ready: true,
      stage,
      ship,
      director,
      performance: perfManager,
      ui,
      setMode: (mode) => activateMode(mode),
      setView: (view) => selectView(view),
      setQuality: (mode) => perfManager.setMode(mode),
      getState: () => ({
        mode: currentMode,
        autoRotate: director.autoRotate,
        camera: stage.camera.position.toArray().map((n) => Number(n.toFixed(2))),
        selected: ship.selectedComponentId,
        quality: perfManager.activeProfile.id,
        qualityMode: perfManager.mode,
        stats: perfManager.getStats(),
        detailLevel: ship.detailLevel,
        waterOpacity
      }),
      getStats: () => perfManager.getStats(),
      getSceneInfo: () => ({
        drawCalls: stage.renderer.info.render.calls,
        triangles: stage.renderer.info.render.triangles,
        geometries: stage.renderer.info.memory.geometries,
        textures: stage.renderer.info.memory.textures
      }),
      exportGLB: () => exportShipGLB()
    };

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setTimeout(() => {
        ui.showToast('基于实船照片与公开资料重建。内部电池/轴系排布为概念示意，非实船图纸。', 5200);
      }, 3600);
    }
  } catch (error) {
    console.error('[SHIP 3D V3] 初始化失败：', error);
    ui.showFatal(
      '三维场景初始化失败。请确认浏览器支持 WebGL 2，并已开启硬件加速；建议使用最新版 Edge 或 Chrome。'
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 模式 / 视角 / 质量                                                           */
/* -------------------------------------------------------------------------- */
function activateMode(mode) {
  if (!ship || !stage || !director) return;
  if (!['exterior', 'structure', 'energy', 'technical'].includes(mode)) return;
  currentMode = mode;
  ship.clearSelection();
  ship.setMode(mode);
  ui.setMode(mode);
  ui.closeMobilePanel();
  stage.setWaterMode(mode);
  waterTarget = mode === 'structure' ? 0.16 : mode === 'energy' ? 0.12 : mode === 'technical' ? 0.68 : 1;

  if (mode === 'exterior') {
    director.flyTo('perspective');
  } else {
    director.flyTo(mode);
  }
}

function applyModeState(mode, { initial = false } = {}) {
  currentMode = mode;
  ship?.setMode(mode);
  stage?.setWaterMode(mode);
  ui.setMode(mode);
  waterTarget = mode === 'exterior' ? 1 : 0.5;
  if (initial) {
    waterOpacity = 1;
    stage?.setWaterOpacity(1);
  }
}

function selectView(view) {
  if (!director) return;
  director.flyTo(view);
  ui.setActiveView(view);
}

function toggleAutoRotate() {
  director?.toggleAutoRotate();
}

function resetView() {
  if (!director) return;
  director.reset();
  ui.setActiveView('perspective');
}

function cycleQuality() {
  perfManager?.cycleMode();
}

function home() {
  if (!director) return;
  activateMode('exterior');
  director.reset();
  ui.setActiveView('perspective');
}

function focusSystem(target) {
  if (!director) return;
  if (target === 'battery') {
    director.flyTo('battery-focus', { duration: 1.35 });
    return;
  }
  if (target === 'propulsion') {
    director.flyTo('propulsion-focus', { duration: 1.35 });
    return;
  }
  const fallback = currentMode === 'structure' ? 'structure' : currentMode === 'energy' ? 'energy' : 'perspective';
  director.flyTo(fallback, { duration: 1.15 });
}

function bindCameraEvents() {
  director.onAutoRotateChange((enabled) => ui.setAutoRotate(enabled));
  director.onViewChange((view) => ui.setActiveView(view));
  director.onInteraction(() => {
    if (!director.autoRotate) ui.clearActiveView();
  });

  canvas.addEventListener('dblclick', () => {
    director.reset();
    ui.setActiveView('perspective');
  });

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      ui.showFatal('WebGL 渲染上下文意外中断。请刷新页面重新建立三维视图。');
    },
    false
  );
}

/* -------------------------------------------------------------------------- */
/* 部件拾取                                                                     */
/* -------------------------------------------------------------------------- */
function bindCanvasPicking() {
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerState.down = true;
    pointerState.x = event.clientX;
    pointerState.y = event.clientY;
  });

  canvas.addEventListener('pointerup', (event) => {
    if (event.button !== 0 || !pointerState.down) return;
    pointerState.down = false;
    const moved = Math.hypot(event.clientX - pointerState.x, event.clientY - pointerState.y);
    if (moved > 6) return;
    if (currentMode === 'technical') return;

    const componentId = pickAt(event.clientX, event.clientY);
    if (componentId) {
      selectComponent(componentId);
      ui.selectComponentFromScene(componentId);
    } else if (ship.selectedComponentId) {
      ship.clearSelection();
      ui.clearSelection();
    }
  });

  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (pointerState.down || currentMode === 'technical') return;
      const now = window.performance.now();
      if (now - pointerState.lastHoverAt < 70) return;
      pointerState.lastHoverAt = now;
      const componentId = pickAt(event.clientX, event.clientY);
      canvas.style.cursor = componentId ? 'pointer' : '';
    },
    { passive: true }
  );

  canvas.addEventListener('pointerleave', () => {
    pointerState.down = false;
    canvas.style.cursor = '';
  });
}

function pickAt(clientX, clientY) {
  if (!ship || !stage) return null;
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  return ship.pick(ndc, stage.camera);
}

function selectComponent(componentId) {
  if (!ship) return;
  if (!componentId) {
    ship.clearSelection();
    return;
  }
  ship.selectComponent(componentId);
  if (window.innerWidth <= 1180) {
    ui.openMobilePanel('context');
  }
}

/* -------------------------------------------------------------------------- */
/* 渲染循环                                                                     */
/* -------------------------------------------------------------------------- */
function startRenderLoop() {
  const clock = new THREE.Clock();

  const loop = () => {
    if (disposed) return;
    animationFrame = requestAnimationFrame(loop);

    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    if (Math.abs(waterOpacity - waterTarget) > 0.001) {
      waterOpacity += (waterTarget - waterOpacity) * Math.min(1, delta * 3.6);
      stage.setWaterOpacity(waterOpacity);
    }

    ship.update(delta, elapsed);
    director.update(delta);
    stage.water.update(delta, elapsed);
    stage.particles.update(delta, elapsed);
    stage.render();
    ui.updateOverlays(stage.camera);
    perfManager.frame(window.performance.now());
  };

  animationFrame = requestAnimationFrame(loop);
}

/* -------------------------------------------------------------------------- */
/* 生命周期 / 小工具                                                             */
/* -------------------------------------------------------------------------- */
function bindLifecycle() {
  window.addEventListener('pagehide', () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    director?.dispose();
    ui.dispose();
  });
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/**
 * 将当前外观模型导出为 GLB。
 * 仅包含船体与外观结构；概念能源层、尺寸线和标签不进入静态模型。
 * 坐标单位为米，设计水线位于 y = 0。
 */
async function exportShipGLB() {
  if (!ship) throw new Error('Ship is not ready');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');

  const previousMode = currentMode;
  const previousWaterTarget = waterTarget;
  const discardedGeometries = [];

  ship.applyModeImmediate('exterior');
  ship.energy.setMode('exterior');
  ship.clearSelection();
  ship.root.updateMatrixWorld(true);

  try {
    // 克隆静态外观，去掉交互层、尺寸标注和概念能源层；
    // 将 InstancedMesh 烘焙为普通网格，避免部分 DCC/查看器依赖扩展。
    const exportRoot = ship.root.clone(true);
    exportRoot.position.set(0, 0, 0);
    exportRoot.rotation.set(0, 0, 0);
    exportRoot.scale.set(1, 1, 1);

    [
      'FloatingHullAssembly',
      'ConceptualElectricSystem',
      'DimensionOverlay',
      'HullStructuralLines'
    ].forEach((name) => {
      const object = exportRoot.getObjectByName(name);
      if (name === 'FloatingHullAssembly' && object) {
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        return;
      }
      object?.removeFromParent();
    });

    const instancedMeshes = [];
    exportRoot.traverse((object) => {
      if (object.isInstancedMesh) instancedMeshes.push(object);
    });

    instancedMeshes.forEach((instanced) => {
      instanced.updateMatrix();
      const parts = [];
      const instanceMatrix = new THREE.Matrix4();
      const combined = new THREE.Matrix4();
      for (let index = 0; index < instanced.count; index += 1) {
        instanceMatrix.fromArray(instanced.instanceMatrix.array, index * 16);
        combined.multiplyMatrices(instanced.matrix, instanceMatrix);
        const part = instanced.geometry.clone();
        part.applyMatrix4(combined);
        parts.push(part);
      }
      if (!parts.length) return;
      const bakedGeometry = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!bakedGeometry) return;
      bakedGeometry.computeBoundingSphere();
      discardedGeometries.push(bakedGeometry);
      const baked = new THREE.Mesh(bakedGeometry, instanced.material);
      baked.name = instanced.name || 'BakedInstances';
      baked.castShadow = instanced.castShadow;
      baked.receiveShadow = instanced.receiveShadow;
      baked.userData = { ...instanced.userData };
      instanced.parent.add(baked);
      instanced.removeFromParent();
    });

    exportRoot.updateMatrixWorld(true);
    const arrayBuffer = await new GLTFExporter().parseAsync(exportRoot, {
      binary: true,
      onlyVisible: true,
      includeCustomExtensions: false
    });

    const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ningyuan-diankun.glb';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { size: arrayBuffer.byteLength, filename: 'ningyuan-diankun.glb' };
  } finally {
    discardedGeometries.forEach((geometry) => geometry.dispose());
    ship.applyModeImmediate(previousMode);
    stage.setWaterMode(previousMode);
    waterTarget = previousWaterTarget;
  }
}
