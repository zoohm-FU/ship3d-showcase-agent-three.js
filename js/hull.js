/**
 * 主船体 / 甲板 / 货舱井
 * ------------------------------------------------------------------
 * 1:1 米制比例：LOA 127.8 m，型宽 21.6 m，型深 10.5 m，设计吃水 6.5 m。
 * 船体由 100 个横剖面放样成型，包含艏部收窄、艉部丰满度、舷弧、
 * 平底、收窄艏柱、绿色上船体与暗红色防污底分区；
 * 艏部由绿色全包裹结构承接白色桥楼下部。
 *
 * 注：公开资料未发布实船型线图。本网格是依据照片和主尺度进行的视觉重建，
 * 不应当用于船舶设计、稳性计算或建造。
 */
import * as THREE from 'three';
import {
  clamp,
  smoothstep,
  loftHull,
  tubeGeometry,
  roundedRectPoints,
  mergeGeometryList,
  mergeMeshes
} from './utils.js';

export const HULL = {
  length: 127.8,
  beam: 21.6,
  depth: 10.5,
  draft: 6.5,
  stern: -63.9,
  bow: 63.9,
  halfBeam: 10.8,
  deckY: 4.0,
  keelY: -6.5,
  paintLineY: 1.12,
  bootTopY: 1.34,
  holdFront: 30,
  holdBack: -37.5,
  holdHalfWidth: 8.85
};

export function halfBeamAt(x) {
  const b = HULL.halfBeam;
  if (x > 31) {
    const t = clamp((x - 31) / (HULL.bow - 31), 0, 1);
    // 实船艏部比早期版本更饱满：桥楼必须落在船体宽度以内，
    // 到极艏才快速收成细艏柱。
    const fullness = Math.pow(1 - Math.pow(t, 2.65), 0.58);
    return Math.max(0.16, b * fullness);
  }
  if (x < -38) {
    const t = clamp((-x - 38) / (-HULL.stern - 38), 0, 1);
    return b * (1 - 0.085 * Math.pow(t, 1.28));
  }
  return b;
}

export function keelYAt(x) {
  const bow = smoothstep(38, HULL.bow, x);
  const stern = smoothstep(0, 1, clamp((-x - 50) / 13.9, 0, 1));
  return HULL.keelY + 3.7 * Math.pow(bow, 1.62) + 0.28 * stern;
}

export function deckYAt() {
  return HULL.deckY;
}

export function hullDepthAt(x) {
  return HULL.deckY - keelYAt(x);
}

/** 船体侧表面在某个 x 的近似外轮廓 */
export function sidePointAt(x, y, side = 1) {
  const half = halfBeamAt(x);
  const depth = hullDepthAt(x);
  const t = clamp((HULL.deckY - y) / depth, 0, 1);
  // 与船体剖面近似的侧壁收缩：上层接近垂直，下部向平底收
  const widthFactor = 1 - 0.38 * Math.pow(smoothstep(0.38, 1, t), 1.35);
  return new THREE.Vector3(x, y, side * half * widthFactor);
}

/* -------------------------------------------------------------------------- */
/* 主构建                                                                       */
/* -------------------------------------------------------------------------- */
export function buildHull(materials) {
  const group = new THREE.Group();
  group.name = 'MainHull';

  const stations = buildStations();
  const ringSize = stations[0].ring.length;
  const hullGeometry = loftHull(stations, ringSize);
  const hullMaterialArray = [materials.hullGreen, materials.hullRed, materials.bootStripe];

  const hullMesh = new THREE.Mesh(hullGeometry, hullMaterialArray);
  hullMesh.name = 'HullShell';
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  hullMesh.renderOrder = 1;
  group.add(hullMesh);

  // stations 由艉向艏排列：首站为艉部，末站为艏部
  group.add(buildTransom(stations[0], materials));
  group.add(buildBowTipCap(stations[stations.length - 1], materials));
  group.add(buildBowStemRidge(materials));

  const deck = buildDeck(materials);
  group.add(deck.group);
  group.add(buildCargoHold(deck.hole, materials));
  const bowEnclosure = buildBowEnclosure(materials);
  group.add(bowEnclosure);
  group.add(buildHullDetails(stations, materials));
  group.add(buildHullDecals(materials));
  group.add(buildHullSeams(stations, materials));

  const structuralLines = buildStructuralLines(stations);
  group.add(structuralLines);

  return {
    group,
    hullMesh,
    deckMesh: deck.mesh,
    structuralLines,
    stations,
    hullMaterialArray,
    hole: deck.hole,
    bowEnclosure
  };
}

/* -------------------------------------------------------------------------- */
/* 船体放样                                                                     */
/* -------------------------------------------------------------------------- */
function buildStations() {
  const count = 108;
  const profile = [
    [0.0, 1.0],
    [0.06, 1.0],
    [0.15, 0.998],
    [0.28, 0.995],
    [0.41, 0.986],
    [0.54, 0.968],
    [0.66, 0.934],
    [0.77, 0.884],
    [0.86, 0.805],
    [0.93, 0.69],
    [0.975, 0.52],
    [1.0, 0.3]
  ];
  const stations = [];

  for (let i = 0; i <= count; i += 1) {
    const rawX = HULL.stern + (HULL.length * i) / count;
    const x = Math.abs(rawX - HULL.bow) < 0.001 ? HULL.bow : rawX;
    const half = halfBeamAt(x);
    const keel = keelYAt(x);
    const depth = HULL.deckY - keel;
    const bowFactor = smoothstep(37, HULL.bow, x);

    // 在水线漆带上下缘插入环线，保证红/绿/白三组材质拥有真实的水平分界，
    // 而不是把整块大三角面误判成白色漆带。
    const sectionProfile = profile.slice();
    [HULL.paintLineY, HULL.bootTopY].forEach((targetY) => {
      const relative = clamp((HULL.deckY - targetY) / depth, 0.0001, 0.9999);
      const t = Math.pow(relative, 1 / 0.985);
      // 每站都固定插入两条环线，保证所有 station 的 ring 长度一致
      sectionProfile.push([t, widthFactorAtT(profile, t)]);
    });
    sectionProfile.sort((a, b) => a[0] - b[0]);

    const ring = [];
    // 左舷：甲板向下到平底
    sectionProfile.forEach(([t, widthFactor]) => {
      const flare = 1 + 0.09 * bowFactor * Math.pow(1 - t, 2.4);
      const lowerEntryTaper = 1 - 0.24 * bowFactor * smoothstep(0.08, 0.86, t);
      const w = half * widthFactor * flare * lowerEntryTaper;
      const y = HULL.deckY - depth * Math.pow(t, 0.985);
      ring.push(new THREE.Vector3(x, y, -w));
    });
    // 右舷：平底向上回甲板
    for (let p = sectionProfile.length - 1; p >= 0; p -= 1) {
      const [t, widthFactor] = sectionProfile[p];
      const flare = 1 + 0.09 * bowFactor * Math.pow(1 - t, 2.4);
      const lowerEntryTaper = 1 - 0.24 * bowFactor * smoothstep(0.08, 0.86, t);
      const w = half * widthFactor * flare * lowerEntryTaper;
      const y = HULL.deckY - depth * Math.pow(t, 0.985);
      ring.push(new THREE.Vector3(x, y, w));
    }

    stations.push({ x, half, keel, deck: HULL.deckY, ring });
  }
  return stations;
}

function widthFactorAtT(profile, t) {
  for (let i = 0; i < profile.length - 1; i += 1) {
    const [t0, w0] = profile[i];
    const [t1, w1] = profile[i + 1];
    if (t >= t0 && t <= t1) {
      const local = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return w0 + (w1 - w0) * local;
    }
  }
  return profile[profile.length - 1][1];
}

/* -------------------------------------------------------------------------- */
/* 艏部全包裹结构                                                               */
/* -------------------------------------------------------------------------- */
function buildBowEnclosure(materials) {
  const group = new THREE.Group();
  group.name = 'BowEnclosure';

  const xStart = 43.6;
  const xEnd = 63.6;
  const segments = 28;
  const sections = [];

  const topAt = (progress) =>
    HULL.deckY +
    2.82 +
    2.95 * (1 - smoothstep(0.08, 0.92, progress)) -
    1.56 * smoothstep(0.02, 1, progress);

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = xStart + (xEnd - xStart) * t;
    sections.push({
      x,
      z: Math.max(0.36, halfBeamAt(x) - 0.24),
      top: topAt(t)
    });
  }

  const vertices = [];
  const indices = [];
  const push = (x, y, z) => {
    vertices.push(x, y, z);
    return vertices.length / 3 - 1;
  };

  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = sections[i];
    const b = sections[i + 1];
    const bottom = HULL.deckY + 0.015;

    // 右舷壁
    let v0 = push(a.x, bottom, a.z);
    let v1 = push(b.x, bottom, b.z);
    let v2 = push(b.x, b.top, b.z);
    let v3 = push(a.x, a.top, a.z);
    indices.push(v0, v1, v2, v0, v2, v3);

    // 左舷壁
    v0 = push(a.x, bottom, -a.z);
    v1 = push(b.x, bottom, -b.z);
    v2 = push(b.x, b.top, -b.z);
    v3 = push(a.x, a.top, -a.z);
    indices.push(v0, v1, v2, v0, v2, v3);

    // 上表面
    v0 = push(a.x, a.top, -a.z);
    v1 = push(b.x, b.top, -b.z);
    v2 = push(b.x, b.top, b.z);
    v3 = push(a.x, a.top, a.z);
    indices.push(v0, v1, v2, v0, v2, v3);
  }

  // 艏部端面
  const first = sections[0];
  const last = sections[sections.length - 1];
  [
    { x: first.x, z: first.z, top: first.top, reverse: false },
    { x: last.x, z: last.z, top: last.top, reverse: true }
  ].forEach(({ x, z, top, reverse }) => {
    const bottom = HULL.deckY + 0.015;
    const v0 = push(x, bottom, -z);
    const v1 = push(x, bottom, z);
    const v2 = push(x, top, z);
    const v3 = push(x, top, -z);
    if (reverse) indices.push(v0, v2, v1, v0, v3, v2);
    else indices.push(v0, v1, v2, v0, v2, v3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const casingMaterial = materials.hullGreen.clone();
  casingMaterial.side = THREE.DoubleSide;
  casingMaterial.roughness = 0.46;
  const casing = new THREE.Mesh(geometry, casingMaterial);
  casing.name = 'BowEnclosureShell';
  casing.castShadow = true;
  casing.receiveShadow = true;
  group.add(casing);

  // 白色上缘，呼应实船绿色艏部外侧的白色线条
  const rimPoints = { left: [], right: [] };
  sections.forEach((section) => {
    rimPoints.left.push(new THREE.Vector3(section.x, section.top + 0.035, -section.z));
    rimPoints.right.push(new THREE.Vector3(section.x, section.top + 0.035, section.z));
  });
  [rimPoints.left, rimPoints.right].forEach((points) => {
    const rim = new THREE.Mesh(tubeGeometry(points, 0.04, 90, 5), materials.whiteTrim);
    group.add(rim);
  });

  // 艏部顶面黑色舱口
  const hatchSection = sections[Math.round(segments * 0.64)];
  const hatch = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.055, 1.35),
    materials.darkMetal
  );
  hatch.position.set(
    hatchSection.x,
    hatchSection.top + 0.045,
    0
  );
  group.add(hatch);

  const hatchBorder = new THREE.Mesh(
    new THREE.BoxGeometry(3.45, 0.035, 1.58),
    materials.whiteTrim
  );
  hatchBorder.position.set(hatchSection.x, hatchSection.top + 0.015, 0);
  group.add(hatchBorder);

  // 侧舷 NBOSCO 标识：沿艏部曲面铺贴，避免顶面斜切和镜像
  const logoStartIndex = Math.round(segments * 0.3);
  const logoEndIndex = Math.round(segments * 0.8);
  const logoVertices = [];
  const logoUvs = [];
  const logoIndices = [];
  const logoCount = logoEndIndex - logoStartIndex + 1;
  for (let i = logoStartIndex; i <= logoEndIndex; i += 1) {
    const section = sections[i];
    const u = (i - logoStartIndex) / Math.max(1, logoCount - 1);
    logoVertices.push(
      section.x, section.top - 1.35, section.z + 0.035,
      section.x, section.top - 0.18, section.z + 0.035
    );
    logoUvs.push(u, 0, u, 1);
    if (i < logoEndIndex) {
      const base = (i - logoStartIndex) * 2;
      logoIndices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const logoGeometry = new THREE.BufferGeometry();
  logoGeometry.setAttribute('position', new THREE.Float32BufferAttribute(logoVertices, 3));
  logoGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(logoUvs, 2));
  logoGeometry.setIndex(logoIndices);
  logoGeometry.computeVertexNormals();
  const logo = new THREE.Mesh(logoGeometry, makeBowBrandMaterial());
  logo.renderOrder = 6;
  group.add(logo);

  // 艏部两侧的深色小窗
  [-1, 1].forEach((side) => {
    [45.2, 46.8, 48.4].forEach((x) => {
      const section = sections.reduce((best, item) =>
        Math.abs(item.x - x) < Math.abs(best.x - x) ? item : best
      );
      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.52, 0.07),
        materials.glass
      );
      windowMesh.position.set(section.x, 4.55, side * (section.z + 0.02));
      group.add(windowMesh);
    });
  });

  // 包裹弧面上的两扇大窗：沿船体曲面生成，避免平面窗框在曲率处穿出船壳
  const windowGlass = new THREE.MeshBasicMaterial({
    color: 0x020d12,
    side: THREE.DoubleSide
  });

  const addCurvedWindow = (side, xCenter, yCenter, width, height, offset, material) => {
    const segments = 8;
    const positions = [];
    const indices = [];
    for (let i = 0; i <= segments; i += 1) {
      const x = xCenter - width / 2 + (width * i) / segments;
      const z = side * (Math.max(0.36, halfBeamAt(x) - 0.24) + offset);
      positions.push(x, yCenter - height / 2, z);
      positions.push(x, yCenter + height / 2, z);
    }
    for (let i = 0; i < segments; i += 1) {
      const b0 = i * 2;
      const t0 = b0 + 1;
      const b1 = b0 + 2;
      const t1 = b0 + 3;
      if (side > 0) indices.push(b0, b1, t0, t0, b1, t1);
      else indices.push(b0, t0, b1, t0, t1, b1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    group.add(mesh);
  };

  [-1, 1].forEach((side) => {
    addCurvedWindow(side, 60.2, 5.02, 2.15, 1.35, 0.035, materials.hullGreen);
    addCurvedWindow(side, 60.2, 5.02, 2.0, 1.2, 0.055, windowGlass);
  });

  return group;
}

function makeBowBrandMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(235, 255, 245, 0.96)';
  ctx.font = '700 145px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N B O S C O', 512, 108);
  ctx.font = '400 27px Consolas, monospace';
  ctx.fillStyle = 'rgba(235, 255, 245, 0.72)';
  ctx.fillText('NINGBO OCEAN SHIPPING / PURE ELECTRIC', 512, 208);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    side: THREE.DoubleSide
  });
}

function buildTransom(station, materials) {
  const group = new THREE.Group();
  group.name = 'Transom';

  const contour = station.ring.map((point) => new THREE.Vector2(point.z, point.y));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  const positions = [];

  station.ring.forEach((point) => {
    positions.push(point.x + 0.01, point.y, point.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const indices = [];
  triangles.forEach((tri) => indices.push(tri[0], tri[1], tri[2]));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e8f3a,
    roughness: 0.52,
    metalness: 0.26,
    emissive: 0x031c0d,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide
  });
  const cap = new THREE.Mesh(geometry, capMaterial);
  cap.name = 'SternTransomCap';
  cap.receiveShadow = true;
  group.add(cap);

  // 艉封板的暗红防污层，避免整块深色墙面
  const lowerRed = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 1.12, station.half * 1.9),
    materials.hullRed
  );
  lowerRed.position.set(station.x - 0.035, 0.56, 0);
  group.add(lowerRed);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.2, station.half * 1.94),
    materials.bootStripe
  );
  stripe.position.set(station.x - 0.055, HULL.paintLineY + 0.08, 0);
  group.add(stripe);

  return group;
}

function buildBowTipCap(station, materials) {
  const contour = station.ring.map((point) => new THREE.Vector2(point.z, point.y));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
  const positions = [];
  station.ring.forEach((point) => positions.push(point.x, point.y, point.z));

  const minY = Math.min(...station.ring.map((point) => point.y)) - 0.1;
  const maxY = Math.max(...station.ring.map((point) => point.y)) + 0.1;
  const uvs = [];
  station.ring.forEach((point) => {
    uvs.push(0.5, (point.y - minY) / (maxY - minY));
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(triangles.flat());
  geometry.computeVertexNormals();

  const cap = new THREE.Mesh(geometry, makeBowCapMaterial(minY, maxY));
  cap.name = 'BowTipCap';
  cap.castShadow = true;
  return cap;
}

function buildBowStemRidge(materials) {
  const group = new THREE.Group();
  group.name = 'BowStemRidge';

  const parts = [
    { y: 2.62, height: 2.56, material: materials.hullGreen },
    { y: 1.23, height: 0.22, material: materials.bootStripe },
    { y: 0.45, height: 1.34, material: materials.hullRed }
  ];
  parts.forEach((part) => {
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, part.height, 0.22),
      part.material
    );
    ridge.position.set(63.98, part.y, 0);
    ridge.castShadow = true;
    group.add(ridge);
  });

  return group;
}

function makeBowCapMaterial(minY, maxY) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const span = maxY - minY;
  const canvasY = (worldY) => (1 - (worldY - minY) / span) * canvas.height;

  const paintY = canvasY(HULL.paintLineY);
  const bootY = canvasY(HULL.bootTopY);
  ctx.fillStyle = '#0e8f3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#5f2421';
  ctx.fillRect(0, paintY, canvas.width, canvas.height - paintY);
  ctx.fillStyle = '#d3ddd5';
  ctx.fillRect(0, bootY, canvas.width, Math.max(2, paintY - bootY));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.16,
    side: THREE.DoubleSide
  });
}

/* -------------------------------------------------------------------------- */
/* 甲板与货舱井                                                                 */
/* -------------------------------------------------------------------------- */
function buildDeck(materials) {
  const hole = {
    x0: HULL.holdBack,
    x1: HULL.holdFront,
    z: HULL.holdHalfWidth,
    radius: 1.6
  };

  const shape = new THREE.Shape();
  const samples = 90;
  shape.moveTo(HULL.stern, -halfBeamAt(HULL.stern) + 0.03);
  for (let i = 0; i <= samples; i += 1) {
    const x = HULL.stern + ((HULL.bow - HULL.stern) * i) / samples;
    shape.lineTo(x, -halfBeamAt(x) + 0.03);
  }
  for (let i = samples; i >= 0; i -= 1) {
    const x = HULL.stern + ((HULL.bow - HULL.stern) * i) / samples;
    shape.lineTo(x, halfBeamAt(x) - 0.03);
  }
  shape.closePath();

  const centerX = (hole.x0 + hole.x1) / 2;
  const centerY = 0;
  const holeWidth = hole.x1 - hole.x0;
  const holeDepth = hole.z * 2;
  const holePoints = roundedRectPoints(holeWidth, holeDepth, hole.radius, {
    clockwise: true,
    segments: 5
  }).map((point) => new THREE.Vector2(point.x + centerX, point.y + centerY));
  shape.holes.push(new THREE.Path(holePoints));

  const geometry = new THREE.ShapeGeometry(shape, 24);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, HULL.deckY + 0.02, 0);

  // 以米为单位重建 UV，让甲板纹理密度不受 ShapeGeometry 默认 UV 影响
  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    uv[i * 2] = position.getX(i) * 0.23;
    uv[i * 2 + 1] = position.getZ(i) * 0.23;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.computeVertexNormals();

  const material = materials.deck.clone();
  if (material.map) {
    material.map = material.map.clone();
    material.map.repeat.set(1, 1);
    material.map.needsUpdate = true;
  }
  material.side = THREE.DoubleSide;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'WeatherDeck';
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const group = new THREE.Group();
  group.name = 'DeckAssembly';
  group.add(mesh);
  group.add(buildDeckCoaming(materials, hole));

  return { mesh, group, hole };
}

function buildDeckCoaming(materials, hole) {
  const group = new THREE.Group();
  group.name = 'CargoCoaming';
  const length = hole.x1 - hole.x0;
  const height = 0.95;

  const longSideGeometry = new THREE.BoxGeometry(length, height, 0.28);
  [-1, 1].forEach((side) => {
    const coaming = new THREE.Mesh(longSideGeometry, materials.whiteTrim);
    coaming.position.set((hole.x0 + hole.x1) / 2, HULL.deckY + height / 2 + 0.03, side * (hole.z + 0.1));
    coaming.castShadow = true;
    coaming.receiveShadow = true;
    group.add(coaming);

    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.1, 0.55),
      materials.railGreen
    );
    topRail.position.set((hole.x0 + hole.x1) / 2, HULL.deckY + height + 0.09, side * (hole.z + 0.1));
    group.add(topRail);
  });

  const crossGeometry = new THREE.BoxGeometry(0.28, height, hole.z * 2 + 0.4);
  [hole.x0, hole.x1].forEach((x) => {
    const coaming = new THREE.Mesh(crossGeometry, materials.whiteTrim);
    coaming.position.set(x, HULL.deckY + height / 2 + 0.03, 0);
    coaming.castShadow = true;
    group.add(coaming);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.1, hole.z * 2 + 0.6),
      materials.railGreen
    );
    top.position.set(x, HULL.deckY + height + 0.09, 0);
    group.add(top);
  });

  // 黄色绑扎设备标记
  const blockGeometry = new THREE.BoxGeometry(0.26, 0.12, 0.64);
  for (let x = hole.x0 + 4; x < hole.x1; x += 6.4) {
    [-1, 1].forEach((side) => {
      const block = new THREE.Mesh(blockGeometry, materials.yellow);
      block.position.set(x, HULL.deckY + height + 0.16, side * (hole.z + 0.1));
      group.add(block);
    });
  }

  return group;
}

function buildCargoHold(hole, materials) {
  const group = new THREE.Group();
  group.name = 'CargoHold';
  const floorY = -3.7;
  const centerX = (hole.x0 + hole.x1) / 2;
  const length = hole.x1 - hole.x0;
  const width = hole.z * 2;

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.24, width),
    materials.deckDark
  );
  floor.position.set(centerX, floorY, 0);
  floor.receiveShadow = true;
  group.add(floor);

  const wallHeight = HULL.deckY - floorY;
  const sideWallGeometry = new THREE.BoxGeometry(length, wallHeight, 0.25);
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(sideWallGeometry, materials.cargoHoldWall);
    wall.position.set(centerX, floorY + wallHeight / 2, side * (hole.z - 0.1));
    wall.receiveShadow = true;
    group.add(wall);
  });

  [hole.x0, hole.x1].forEach((x) => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, wallHeight, width),
      materials.cargoHoldWall
    );
    wall.position.set(x, floorY + wallHeight / 2, 0);
    wall.receiveShadow = true;
    group.add(wall);
  });

  // 舱壁加强筋：实例化，减少 draw call
  const ribGeometry = new THREE.BoxGeometry(0.24, wallHeight - 0.4, 0.18);
  const ribCount = Math.max(0, Math.floor(length / 5.3) - 1);
  const ribs = new THREE.InstancedMesh(ribGeometry, materials.cargoHoldWall, ribCount * 2);
  const ribDummy = new THREE.Object3D();
  let ribIndex = 0;
  for (let i = 1; i <= ribCount; i += 1) {
    const x = hole.x0 + i * 5.3;
    [-1, 1].forEach((side) => {
      ribDummy.position.set(x, floorY + wallHeight / 2 - 0.2, side * (hole.z - 0.28));
      ribDummy.updateMatrix();
      ribs.setMatrixAt(ribIndex, ribDummy.matrix);
      ribIndex += 1;
    });
  }
  ribs.instanceMatrix.needsUpdate = true;
  group.add(ribs);

  // 箱格导轨：使用较亮的舾装色，让空舱内部结构可读
  const guideGeometry = new THREE.BoxGeometry(0.18, 7.1, 0.24);
  const zRows = [-8.1, -5.4, -2.7, 0, 2.7, 5.4, 8.1];
  const xSpacing = 6.2;
  const xBays = Math.max(0, Math.floor(length / xSpacing) - 1);
  const guideCount = xBays * zRows.length;
  const guides = new THREE.InstancedMesh(guideGeometry, materials.deckWhite, guideCount);
  const guideCaps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.28, 0.12, 0.36),
    materials.yellow,
    guideCount
  );
  const guideDummy = new THREE.Object3D();
  let guideIndex = 0;
  for (let bay = 1; bay <= xBays; bay += 1) {
    const x = hole.x0 + bay * xSpacing;
    zRows.forEach((z) => {
      guideDummy.position.set(x, floorY + 3.6, z);
      guideDummy.rotation.set(0, 0, 0);
      guideDummy.updateMatrix();
      guides.setMatrixAt(guideIndex, guideDummy.matrix);

      guideDummy.position.set(x, HULL.deckY - 0.5, z);
      guideDummy.updateMatrix();
      guideCaps.setMatrixAt(guideIndex, guideDummy.matrix);
      guideIndex += 1;
    });
  }
  guides.instanceMatrix.needsUpdate = true;
  guideCaps.instanceMatrix.needsUpdate = true;
  group.add(guides, guideCaps);

  // 舱底纵向流水槽
  const bilgeGeometry = new THREE.BoxGeometry(length - 2, 0.06, 0.12);
  const bilges = new THREE.InstancedMesh(bilgeGeometry, materials.whiteTrim, 5);
  const bilgeDummy = new THREE.Object3D();
  [-7.1, -3.7, 0.2, 3.9, 7.3].forEach((z, index) => {
    bilgeDummy.position.set(centerX, floorY + 0.16, z);
    bilgeDummy.updateMatrix();
    bilges.setMatrixAt(index, bilgeDummy.matrix);
  });
  bilges.instanceMatrix.needsUpdate = true;
  group.add(bilges);

  // 舱口内沿的低亮度冷光灯带，避免空舱成为纯黑大块
  const holdLightMaterial = new THREE.MeshBasicMaterial({
    color: 0x6ed8bd,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    toneMapped: false
  });
  const stripGeometry = new THREE.BoxGeometry(length - 1, 0.035, 0.035);
  [-1, 1].forEach((side) => {
    const strip = new THREE.Mesh(stripGeometry, holdLightMaterial);
    strip.position.set(centerX, HULL.deckY - 0.14, side * (hole.z - 0.42));
    group.add(strip);
  });

  return group;
}

/* -------------------------------------------------------------------------- */
/* 甲板设备 / 栏杆 / 舾装                                                       */
/* -------------------------------------------------------------------------- */
function buildHullDetails(stations, materials) {
  const group = new THREE.Group();
  group.name = 'HullDetails';

  const deck = HULL.deckY + 0.05;
  const railMaterial = materials.railWhite;

  // 船舷栏杆：顶部和中间横杆以弯管表现
  const halfWidth = 0.42;
  [-1, 1].forEach((side) => {
    const points = [];
    for (let x = HULL.stern + 1.2; x <= HULL.bow - 1.4; x += 2.2) {
      points.push(new THREE.Vector3(x, deck + 1.1, side * (halfBeamAt(x) - halfWidth)));
    }
    if (points.length < 2) return;
    const upper = tubeGeometry(points, 0.032, Math.max(80, points.length * 2), 5);
    const mid1 = tubeGeometry(
      points.map((p) => new THREE.Vector3(p.x, deck + 0.68, p.z)),
      0.018,
      Math.max(80, points.length * 2),
      4
    );
    const mid2 = tubeGeometry(
      points.map((p) => new THREE.Vector3(p.x, deck + 0.36, p.z)),
      0.014,
      Math.max(80, points.length * 2),
      4
    );
    const merged = mergeGeometryList([upper, mid1, mid2]);
    if (merged) {
      const rail = new THREE.Mesh(merged, railMaterial);
      rail.castShadow = false;
      rail.receiveShadow = true;
      group.add(rail);
    }
  });

  // 栏杆立柱（InstancedMesh）
  const postCount = 108;
  const postGeometry = new THREE.CylinderGeometry(0.033, 0.033, 1.08, 5);
  const posts = new THREE.InstancedMesh(postGeometry, railMaterial, postCount * 2);
  const matrix = new THREE.Matrix4();
  let idx = 0;
  for (let i = 0; i < postCount; i += 1) {
    const x = HULL.stern + 2 + ((HULL.length - 5) * i) / (postCount - 1);
    [-1, 1].forEach((side) => {
      matrix.makeTranslation(x, deck + 0.54, side * (halfBeamAt(x) - halfWidth));
      posts.setMatrixAt(idx, matrix);
      idx += 1;
    });
  }
  posts.instanceMatrix.needsUpdate = true;
  posts.castShadow = false;
  posts.receiveShadow = true;
  group.add(posts);

  // 甲板排水孔 / 舷侧开口
  const freeingPortMaterial = new THREE.MeshBasicMaterial({ color: 0x05100b });
  const portGeometry = new THREE.BoxGeometry(0.7, 0.18, 0.035);
  for (let x = -58; x < 58; x += 8) {
    if (x > 29 && x < 55) continue;
    [-1, 1].forEach((side) => {
      const port = new THREE.Mesh(portGeometry, freeingPortMaterial);
      port.position.set(x, 3.38, side * (halfBeamAt(x) - 0.02));
      port.rotation.y = side > 0 ? 0 : Math.PI;
      group.add(port);
    });
  }

  // 舷侧纵向甲板排水管和电缆桥架
  const pipePoints = [];
  for (let x = -44; x <= 31; x += 3) {
    pipePoints.push(new THREE.Vector3(x, HULL.deckY + 0.24, 8.15));
  }
  const pipe = new THREE.Mesh(tubeGeometry(pipePoints, 0.075, 120, 6), materials.whiteTrim);
  pipe.castShadow = false;
  group.add(pipe);

  const pipeSmallPoints = pipePoints.map((p) => new THREE.Vector3(p.x, p.y + 0.24, p.z + 0.3));
  const pipeSmall = new THREE.Mesh(tubeGeometry(pipeSmallPoints, 0.04, 120, 5), materials.yellow);
  group.add(pipeSmall);

  // 甲板安全线
  const markingGeometry = new THREE.BoxGeometry(56, 0.012, 0.12);
  [-1, 1].forEach((side) => {
    const line = new THREE.Mesh(markingGeometry, materials.yellow);
    line.position.set(-4, HULL.deckY + 0.055, side * 9.35);
    group.add(line);
  });

  // 系缆桩：实例化
  const positions = [
    [-59.2, -8.1], [-59.2, 8.1], [-52.5, -8.5], [-52.5, 8.5],
    [-47.5, -7.9], [-47.5, 7.9], [50.0, -8.2], [50.0, 8.2],
    [57.5, -6.3], [57.5, 6.3], [35.0, -9.3], [35.0, 9.3]
  ];
  const postGeom = new THREE.CylinderGeometry(0.22, 0.26, 0.56, 10);
  const headGeom = new THREE.CylinderGeometry(0.3, 0.2, 0.2, 10);
  const sectionPosts = new THREE.InstancedMesh(postGeom, materials.darkMetal, positions.length);
  const sectionHeads = new THREE.InstancedMesh(headGeom, materials.whiteTrim, positions.length);
  const bollardDummy = new THREE.Object3D();
  positions.forEach(([x, z], index) => {
    bollardDummy.position.set(x, HULL.deckY + 0.3, z);
    bollardDummy.updateMatrix();
    sectionPosts.setMatrixAt(index, bollardDummy.matrix);
    bollardDummy.position.y = HULL.deckY + 0.66;
    bollardDummy.updateMatrix();
    sectionHeads.setMatrixAt(index, bollardDummy.matrix);
  });
  sectionPosts.instanceMatrix.needsUpdate = true;
  sectionHeads.instanceMatrix.needsUpdate = true;
  group.add(sectionPosts, sectionHeads);

  // 艏部锚机、锚链筒和绑扎设备
  group.add(buildBowMachinery(materials));

  // 艉部系泊绞车
  group.add(buildMooringWinch(materials));

  // 舱口盖架上方的横向绑扎桥
  group.add(buildLashingBridges(materials));

  // 甲板上设备箱、消防器材
  const lockerGeo = new THREE.BoxGeometry(1.5, 1.1, 0.8);
  [
    [-42, 6.8], [-35, -7.7], [31.8, 7.2], [48, -7.2]
  ].forEach(([x, z], index) => {
    const locker = new THREE.Mesh(lockerGeo, index % 2 ? materials.whiteTrim : materials.railGreen);
    locker.position.set(x, HULL.deckY + 0.57, z);
    locker.castShadow = true;
    group.add(locker);
  });

  return group;
}

function buildBowMachinery(materials) {
  const group = new THREE.Group();
  group.name = 'ForecastleMachinery';
  const deck = HULL.deckY + 0.04;

  // 锚机基座
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 4.2), materials.darkMetal);
  base.position.set(55.4, deck + 0.2, 0);
  group.add(base);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 3.6, 22),
    materials.railGreen
  );
  drum.rotation.z = Math.PI / 2;
  drum.position.set(55.4, deck + 1.15, 0);
  drum.castShadow = true;
  group.add(drum);

  const capMaterial = materials.whiteTrim;
  [-1.85, 1.85].forEach((dx) => {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 22), capMaterial);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(55.4 + dx, deck + 1.15, 0);
    group.add(cap);
  });

  // 锚链
  const chainPoints = [];
  for (let i = 0; i < 14; i += 1) {
    chainPoints.push(new THREE.Vector3(55.4 + i * 0.5, deck + 0.17, -2.1 + Math.sin(i) * 0.1));
  }
  const chain = new THREE.Mesh(tubeGeometry(chainPoints, 0.045, 40, 5), materials.darkMetal);
  group.add(chain);

  // 导缆器
  [-1, 1].forEach((side) => {
    const fairlead = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.08, 6, 18),
      materials.darkMetal
    );
    fairlead.rotation.x = Math.PI / 2;
    fairlead.position.set(58.2, deck + 0.2, side * 4.2);
    group.add(fairlead);
  });

  return group;
}

function buildMooringWinch(materials) {
  const group = new THREE.Group();
  group.name = 'AftMooringWinch';
  const deck = HULL.deckY + 0.04;

  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 3.2), materials.darkMetal);
  base.position.set(-54.2, deck + 0.25, 0);
  group.add(base);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 2.6, 18),
    materials.railGreen
  );
  drum.rotation.z = Math.PI / 2;
  drum.position.set(-54.2, deck + 1.17, 0);
  group.add(drum);

  const frameGeometry = new THREE.BoxGeometry(0.16, 1.5, 0.32);
  [-1, 1].forEach((side) => {
    const frame = new THREE.Mesh(frameGeometry, materials.darkMetal);
    frame.position.set(-54.2, deck + 0.85, side * 1.7);
    group.add(frame);
  });

  return group;
}

function buildLashingBridges(materials) {
  const group = new THREE.Group();
  group.name = 'LashingBridges';
  const start = HULL.holdBack + 5.6;
  const end = HULL.holdFront - 4;
  const count = 9;
  const posts = [];
  const beams = [];
  const braces = [];
  const braceMaterial = new THREE.LineBasicMaterial({
    color: 0x94a69d,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });

  for (let i = 0; i < count; i += 1) {
    const x = start + ((end - start) * i) / (count - 1);

    [-1, 1].forEach((side) => {
      posts.push({
        x,
        z: side * (HULL.holdHalfWidth - 0.15),
        y: HULL.deckY + 1.25,
        side
      });
      const top = new THREE.Vector3(x, HULL.deckY + 2.5, side * (HULL.holdHalfWidth - 0.3));
      const base = new THREE.Vector3(x, HULL.deckY + 1.1, side * (HULL.holdHalfWidth - 0.15));
      braces.push([base, top]);
    });
    beams.push(x);
  }

  const postGeometry = new THREE.BoxGeometry(0.18, 2.5, 0.18);
  const postMeshes = posts.map(({ x, z }) => {
    const post = new THREE.Mesh(postGeometry, materials.whiteTrim);
    post.position.set(x, HULL.deckY + 2.2, z);
    post.castShadow = true;
    return post;
  });
  const mergedPosts = mergeMeshes(postMeshes, materials.whiteTrim);
  if (mergedPosts) group.add(mergedPosts);

  const beamMeshes = beams.map((x) => {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, HULL.holdHalfWidth * 2 - 0.3),
      materials.yellow
    );
    beam.position.set(x, HULL.deckY + 3.38, 0);
    return beam;
  });
  const mergedBeams = mergeMeshes(beamMeshes, materials.yellow);
  if (mergedBeams) group.add(mergedBeams);

  const bracePositions = [];
  braces.forEach(([startPoint, endPoint]) => {
    bracePositions.push(
      startPoint.x, startPoint.y, startPoint.z,
      endPoint.x, endPoint.y, endPoint.z
    );
  });
  const braceGeometry = new THREE.BufferGeometry();
  braceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bracePositions, 3));
  group.add(new THREE.LineSegments(braceGeometry, braceMaterial));

  return group;
}

function buildHullSeams(stations, materials) {
  const group = new THREE.Group();
  group.name = 'HullPaintLines';

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x0b6b38,
    transparent: true,
    opacity: 0.38,
    depthWrite: false
  });

  [2.45, 3.3].forEach((y) => {
    [-1, 1].forEach((side) => {
      const points = [];
      for (let x = HULL.stern + 1; x <= HULL.bow - 1; x += 2) {
        points.push(sidePointAt(x, y, side).add(new THREE.Vector3(0, 0, side * 0.035)));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
      group.add(line);
    });
  });

  // 横向板缝（少量，避免画面过密）
  const seamXs = [-53, -42, -31, -20, -9, 2, 13, 24, 35, 46, 55];
  seamXs.forEach((x) => {
    [-1, 1].forEach((side) => {
      const points = [];
      for (let y = 1.35; y < HULL.deckY - 0.1; y += 0.5) {
        points.push(sidePointAt(x, y, side).add(new THREE.Vector3(0, 0, side * 0.03)));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
      group.add(line);
    });
  });

  return group;
}

/* -------------------------------------------------------------------------- */
/* 船名 / 标识 / 吃水标                                                         */
/* -------------------------------------------------------------------------- */
function buildHullDecals(materials) {
  const group = new THREE.Group();
  group.name = 'HullGraphics';

  group.add(createHullDecal(
    { xStart: -36, xEnd: 18, yBottom: 1.58, yTop: 3.72, side: 1, material: materials.brandDecal }
  ));
  group.add(createHullDecal(
    { xStart: -36, xEnd: 18, yBottom: 1.58, yTop: 3.72, side: -1, material: materials.brandDecal, flipU: true }
  ));

  group.add(createHullDecal(
    { xStart: 36.5, xEnd: 50.5, yBottom: 1.55, yTop: 3.9, side: 1, material: materials.nameDecal }
  ));
  group.add(createHullDecal(
    { xStart: 36.5, xEnd: 50.5, yBottom: 1.55, yTop: 3.9, side: -1, material: materials.nameDecal, flipU: true }
  ));

  group.add(createHullDecal(
    { xStart: -57.5, xEnd: -45.5, yBottom: 1.55, yTop: 3.65, side: 1, material: materials.sternDecal }
  ));
  group.add(createHullDecal(
    { xStart: -57.5, xEnd: -45.5, yBottom: 1.55, yTop: 3.65, side: -1, material: materials.sternDecal, flipU: true }
  ));

  [48.8, -57.8].forEach((xCenter) => {
    [-1, 1].forEach((side) => {
      const draft = createHullDecal({
        xStart: xCenter - 0.62,
        xEnd: xCenter + 0.62,
        yBottom: -0.4,
        yTop: 3.9,
        side,
        material: materials.draftDecal,
        flipU: side < 0
      });
      group.add(draft);
    });
  });

  return group;
}

/**
 * 将贴花条带拟合到船体侧面，减少平面直贴造成的穿插。
 */
function createHullDecal({ xStart, xEnd, yBottom, yTop, side, material, flipU = false }) {
  const segments = 36;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = xStart + (xEnd - xStart) * t;
    const low = sidePointAt(x, yBottom, side).add(new THREE.Vector3(0, 0, side * 0.055));
    const high = sidePointAt(x, yTop, side).add(new THREE.Vector3(0, 0, side * 0.055));
    positions.push(low.x, low.y, low.z, high.x, high.y, high.z);
    const u = flipU ? 1 - t : t;
    uvs.push(u, 0, u, 1);
    if (i < segments) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 7;
  return mesh;
}

/* -------------------------------------------------------------------------- */
/* 结构线                                                                       */
/* -------------------------------------------------------------------------- */
function buildStructuralLines(stations) {
  const positions = [];
  const ringSize = stations[0].ring.length;

  // 只抽取关键横剖面，避免 X-Ray 画面被密集线框淹没
  for (let i = 0; i < stations.length; i += 6) {
    const ring = stations[i].ring;
    for (let j = 0; j < ringSize - 1; j += 1) {
      const a = ring[j];
      const b = ring[j + 1];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  // 甲板边线、舷侧、船底与另一舷；按各站 ring 长度取相对位置，避免端点站点差异
  [0, 0.2, 0.47, 0.5, 0.78, 1].forEach((fraction) => {
    for (let i = 0; i < stations.length - 1; i += 1) {
      const ringA = stations[i].ring;
      const ringB = stations[i + 1].ring;
      const indexA = Math.min(ringA.length - 1, Math.round(fraction * (ringA.length - 1)));
      const indexB = Math.min(ringB.length - 1, Math.round(fraction * (ringB.length - 1)));
      const a = ringA[indexA];
      const b = ringB[indexB];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x63d8b2,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'HullStructuralLines';
  lines.visible = false;
  lines.renderOrder = 20;
  return lines;
}
