/**
 * 上层建筑与桅杆设备
 * ------------------------------------------------------------------
 * 照片观测到的布局：
 * - 艏部为绿色艏部全包裹基座 + 白色多层桥楼，带桥翼、雷达桅和通导天线；
 * - 艉部为紧贴艉端的绿色多层甲板室、白色窗框、顶部光伏与绿色设备塔。
 *
 * 说明：公开资料没有内部舱室图，本模块只重建照片可见的外观。
 */
import * as THREE from 'three';
import {
  prismFromPoints,
  roundedRectPoints,
  mergeMeshes,
  mergeGeometryList,
  cylinderBetween
} from './utils.js';

const DECK_Y = 4.0;

export function buildSuperstructure(materials) {
  const group = new THREE.Group();
  group.name = 'Superstructure';

  const windows = {
    glass: [],
    lit: [],
    trim: []
  };
  const railParts = [];
  const animated = {
    radars: [],
    navLights: []
  };

  const forward = buildForwardHouse(materials, windows, railParts, animated);
  const aft = buildAftHouse(materials, windows, railParts, animated);
  group.add(forward, aft);

  const glassMesh = mergeMeshes(windows.glass, materials.glass, { castShadow: false });
  if (glassMesh) {
    glassMesh.name = 'SuperstructureWindows';
    glassMesh.renderOrder = 2;
    group.add(glassMesh);
  }

  const litMesh = mergeMeshes(windows.lit, materials.glassLit, { castShadow: false });
  if (litMesh) {
    litMesh.name = 'LitWindows';
    group.add(litMesh);
  }

  const trimMesh = mergeMeshes(windows.trim, materials.whiteTrim, { castShadow: false });
  if (trimMesh) {
    trimMesh.name = 'WindowMullions';
    group.add(trimMesh);
  }

  const railMesh = mergeMeshes(railParts, materials.railWhite, { castShadow: false });
  if (railMesh) {
    railMesh.name = 'SuperstructureRailings';
    group.add(railMesh);
  }

  return { group, animated, forward, aft };
}

/* -------------------------------------------------------------------------- */
/* 艏部驾驶楼                                                                   */
/* -------------------------------------------------------------------------- */
function buildForwardHouse(materials, windows, railParts, animated) {
  const group = new THREE.Group();
  group.name = 'ForwardDeckhouse';
  const cx = 41.2;

  // 绿色基座
  const base = prismFromPoints(
    roundedRectPoints(15.8, 18.6, 2.1),
    3.35,
    materials.greenHouse,
    { baseY: DECK_Y }
  );
  base.position.x = cx;
  group.add(base);

  // 基座顶部白色飞檐
  const baseLedge = prismFromPoints(
    roundedRectPoints(16.6, 19.3, 2.2),
    0.25,
    materials.greenHouse,
    { baseY: DECK_Y + 3.35 }
  );
  baseLedge.position.x = cx;
  group.add(baseLedge);

  const baseFascia = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.7, 15.2),
    materials.railGreen
  );
  baseFascia.position.set(cx + 16.0 / 2 + 0.06, DECK_Y + 2.9, 0);
  group.add(baseFascia);

  // 第二层绿色生活区：对应照片中桥楼下方大面积绿色立面
  const mid = prismFromPoints(
    roundedRectPoints(14.4, 16.8, 1.8),
    2.45,
    materials.greenHouse,
    { baseY: DECK_Y + 3.6 }
  );
  mid.position.x = cx - 0.1;
  group.add(mid);

  const midLedge = prismFromPoints(
    roundedRectPoints(15.2, 17.7, 1.9),
    0.22,
    materials.whiteTrim,
    { baseY: DECK_Y + 6.05 }
  );
  midLedge.position.x = cx - 0.1;
  group.add(midLedge);

  // 驾驶室：略收进的深色连续窗带 + 白色框体
  const bridgeCore = prismFromPoints(
    roundedRectPoints(13.1, 14.7, 1.65),
    2.25,
    materials.superstructurePlain,
    { baseY: DECK_Y + 6.27 }
  );
  bridgeCore.position.x = cx - 0.2;
  group.add(bridgeCore);

  // 玻璃窗带 - 正面
  addFrontBand(windows, {
    x: cx - 0.2 + 13.1 / 2 + 0.028,
    y: DECK_Y + 7.28,
    z: 0,
    width: 13.6,
    height: 1.32,
    panes: 7,
    depth: 0.06,
    facing: 1
  });
  // 侧窗
  [-1, 1].forEach((side) => {
    addSideBand(windows, {
      z: side * (14.7 / 2 + 0.028),
      x: cx - 0.2,
      y: DECK_Y + 7.28,
      width: 10.7,
      height: 1.22,
      panes: 5,
      side
    });
  });
  // 驾驶室底部深色窗台
  const bridgeSill = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.18, 13.8),
    materials.trimDark || materials.railGreen
  );
  bridgeSill.position.set(cx - 0.2 + 13.1 / 2 + 0.08, DECK_Y + 6.52, 0);
  group.add(bridgeSill);

  // 桥楼屋顶（带外挑）
  const roof = prismFromPoints(
    roundedRectPoints(14.6, 16.4, 1.8),
    0.28,
    materials.whiteTrim,
    { baseY: DECK_Y + 8.52 }
  );
  roof.position.x = cx - 0.2;
  group.add(roof);

  // 桥翼平台
  const wingDeck = prismFromPoints(
    roundedRectPoints(5.6, 21.0, 1.1),
    0.28,
    materials.whiteTrim,
    { baseY: DECK_Y + 6.0 }
  );
  wingDeck.position.x = cx - 0.1;
  group.add(wingDeck);

  // 桥翼下方支撑与绿色托架
  [-1, 1].forEach((side) => {
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.17, 2.4, 8),
      materials.darkMetal
    );
    support.position.set(cx - 0.5, DECK_Y + 4.8, side * 9.25);
    support.rotation.z = 0.16;
    group.add(support);

    const wingSignal = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.12, 0.16),
      materials.greenHouse
    );
    wingSignal.position.set(cx - 0.4, DECK_Y + 6.1, side * 10.3);
    group.add(wingSignal);
  });

  addRailingRect(
    railParts,
    {
      x: cx - 0.2,
      z: 0,
      width: 5.8,
      depth: 21.4,
      y: DECK_Y + 6.28
    },
    [0, 1]
  );

  // 屋顶栏杆
  addRailingRect(railParts, {
    x: cx - 0.2,
    z: 0,
    width: 14.9,
    depth: 16.8,
    y: DECK_Y + 8.8,
    skipFront: false
  });

  // 基座与二层正面窗、侧面窗
  addFrontBand(windows, {
    x: cx + 15.8 / 2 + 0.02,
    y: DECK_Y + 0.92,
    z: 0,
    width: 11.5,
    height: 0.88,
    panes: 6,
    depth: 0.06,
    facing: 1
  });
  [-1, 1].forEach((side) => {
    addSideBand(windows, {
      z: side * (18.6 / 2 + 0.02),
      x: cx,
      y: DECK_Y + 0.92,
      width: 7.6,
      height: 0.85,
      panes: 4,
      side
    });
  });

  addFrontBand(windows, {
    x: cx - 0.1 + 14.4 / 2 + 0.022,
    y: DECK_Y + 4.35,
    z: 0,
    width: 11.3,
    height: 0.72,
    panes: 6,
    depth: 0.06,
    facing: 1
  });
  [-1, 1].forEach((side) => {
    addSideBand(windows, {
      z: side * (16.8 / 2 + 0.022),
      x: cx - 0.1,
      y: DECK_Y + 4.35,
      width: 7.2,
      height: 0.68,
      panes: 4,
      side
    });
  });

  // 绿色层间的白色装饰腰线和深色窗框
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 12.4), materials.whiteTrim);
  waist.position.set(cx + 15.85 / 2, DECK_Y + 2.55, 0);
  group.add(waist);

  // 正面 NBOSCO / 宁远电鲲标识
  const frontDecalMaterial = makeFrontBrandMaterial();
  const brandPlane = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 1.55), frontDecalMaterial);
  brandPlane.position.set(cx + 15.8 / 2 + 0.07, DECK_Y + 2.52, 0);
  brandPlane.rotation.y = Math.PI / 2;
  brandPlane.renderOrder = 8;
  group.add(brandPlane);

  const upperBrand = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 1.0), frontDecalMaterial);
  upperBrand.position.set(cx - 0.1 + 14.4 / 2 + 0.075, DECK_Y + 5.48, 0);
  upperBrand.rotation.y = Math.PI / 2;
  upperBrand.renderOrder = 8;
  group.add(upperBrand);

  // 侧面舱门
  [-1, 1].forEach((side) => {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.8, 0.86),
      materials.darkMetal
    );
    door.position.set(cx - 3.2, DECK_Y + 1.0, side * (18.6 / 2 + 0.025));
    group.add(door);
  });

  // 驾驶室下方的救生筏
  [-1, 1].forEach((side) => {
    const raft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 2.6, 14),
      materials.whiteTrim
    );
    raft.rotation.x = Math.PI / 2;
    raft.position.set(cx - 2.3, DECK_Y + 5.15, side * 10.0);
    group.add(raft);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.285, 0.285, 0.24, 14),
      materials.safetyOrange
    );
    band.rotation.x = Math.PI / 2;
    band.position.set(cx - 2.3, DECK_Y + 5.15, side * 10.0);
    group.add(band);
  });

  // 侧面直立梯和维修平台
  addVerticalLadder(group, {
    x: cx + 4.3,
    z: 9.55,
    yBottom: DECK_Y + 0.18,
    yTop: DECK_Y + 8.3,
    material: materials.railWhite
  });
  addVerticalLadder(group, {
    x: cx + 4.3,
    z: -9.55,
    yBottom: DECK_Y + 0.18,
    yTop: DECK_Y + 8.3,
    material: materials.railWhite
  });

  // 层间深色阴影缝与绿色檐口：打破大面积白色块面
  addWrapBand(group, {
    cx,
    y: DECK_Y + 3.26,
    width: 16.55,
    depth: 19.25,
    material: materials.darkMetal,
    height: 0.16,
    thickness: 0.09
  });
  addWrapBand(group, {
    cx: cx - 0.1,
    y: DECK_Y + 5.95,
    width: 15.15,
    depth: 17.6,
    material: materials.darkMetal,
    height: 0.14,
    thickness: 0.08
  });
  addWrapBand(group, {
    cx: cx - 0.2,
    y: DECK_Y + 8.43,
    width: 14.55,
    depth: 16.3,
    material: materials.railGreen,
    height: 0.12,
    thickness: 0.08
  });

  // 顶部通导桅与甲板设备
  const mast = buildRadarMast(materials, animated, cx - 1.0, DECK_Y + 8.75);
  group.add(mast);
  addRoofEquipment(group, materials, cx);

  // 橙色救生圈
  [-1, 1].forEach((side) => {
    addLifeRing(group, {
      x: cx + 0.9,
      y: DECK_Y + 6.7,
      z: side * 10.62,
      material: materials.safetyOrange,
      bracketMaterial: materials.railWhite,
      facing: side
    });
  });

  // 桥翼端部航行灯
  [-1, 1].forEach((side) => {
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: side < 0 ? 0xff594e : 0x5dff9f,
      transparent: true,
      opacity: 0.75,
      toneMapped: false
    });
    const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lightMaterial);
    navLight.position.set(cx - 2.4, DECK_Y + 6.45, side * 10.35);
    group.add(navLight);
    animated.navLights.push({ mesh: navLight, material: lightMaterial, phase: side > 0 ? 0 : 1.4 });
  });

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

/* -------------------------------------------------------------------------- */
/* 艉部甲板室 / 设备区                                                          */
/* -------------------------------------------------------------------------- */
function buildAftHouse(materials, windows, railParts, animated) {
  const group = new THREE.Group();
  group.name = 'AftDeckhouse';
  // 照片显示艉部甲板室紧贴艉端；船宽足够，不再留出艉甲板空间
  const cx = -56.9;

  // 艉部甲板室横向放宽：甲板室两侧接近船体外板，取消明显侧甲板空隙
  const lower = prismFromPoints(
    roundedRectPoints(12.6, 19.2, 2.0),
    2.8,
    materials.greenHouse,
    { baseY: DECK_Y }
  );
  lower.position.x = cx;
  group.add(lower);

  const lowerTrim = prismFromPoints(
    roundedRectPoints(13.2, 19.8, 2.1),
    0.24,
    materials.whiteTrim,
    { baseY: DECK_Y + 2.8 }
  );
  lowerTrim.position.x = cx;
  group.add(lowerTrim);

  const middle = prismFromPoints(
    roundedRectPoints(11.6, 19.0, 1.9),
    2.1,
    materials.greenHouse,
    { baseY: DECK_Y + 3.04 }
  );
  middle.position.x = cx - 0.1;
  group.add(middle);

  const middleLedge = prismFromPoints(
    roundedRectPoints(12.3, 19.4, 2.0),
    0.2,
    materials.whiteTrim,
    { baseY: DECK_Y + 5.14 }
  );
  middleLedge.position.x = cx - 0.1;
  group.add(middleLedge);

  const upper = prismFromPoints(
    roundedRectPoints(10.4, 18.2, 1.8),
    1.95,
    materials.greenHouse,
    { baseY: DECK_Y + 5.34 }
  );
  upper.position.x = cx - 0.2;
  group.add(upper);

  const upperLedge = prismFromPoints(
    roundedRectPoints(11.1, 18.8, 1.9),
    0.2,
    materials.whiteTrim,
    { baseY: DECK_Y + 7.29 }
  );
  upperLedge.position.x = cx - 0.2;
  group.add(upperLedge);

  // 窗带
  addFrontBand(windows, {
    x: cx + 12.6 / 2 + 0.02,
    y: DECK_Y + 1.42,
    z: 0,
    width: 10.8,
    height: 0.9,
    panes: 5,
    depth: 0.06,
    facing: 1
  });
  addFrontBand(windows, {
    x: cx - 0.1 + 11.6 / 2 + 0.02,
    y: DECK_Y + 4.1,
    z: 0,
    width: 9.2,
    height: 0.92,
    panes: 5,
    depth: 0.06,
    facing: 1
  });
  addFrontBand(windows, {
    x: cx - 0.2 + 10.4 / 2 + 0.02,
    y: DECK_Y + 6.22,
    z: 0,
    width: 8.2,
    height: 0.82,
    panes: 4,
    depth: 0.06,
    facing: 1
  });
  [-1, 1].forEach((side) => {
    addSideBand(windows, {
      z: side * (19.2 / 2 + 0.02),
      x: cx,
      y: DECK_Y + 1.42,
      width: 7.2,
      height: 0.88,
      panes: 4,
      side
    });
    addSideBand(windows, {
      z: side * (19.0 / 2 + 0.02),
      x: cx - 0.1,
      y: DECK_Y + 4.1,
      width: 6.4,
      height: 0.86,
      panes: 4,
      side
    });
    addSideBand(windows, {
      z: side * (18.2 / 2 + 0.02),
      x: cx - 0.2,
      y: DECK_Y + 6.22,
      width: 5.4,
      height: 0.8,
      panes: 3,
      side
    });
  });

  // 艉端大窗：图三是从艉部看过去的实际开口比例
  addFrontBand(windows, {
    x: cx - 12.6 / 2 - 0.02,
    y: DECK_Y + 1.42,
    z: 0,
    width: 9.4,
    height: 1.02,
    panes: 4,
    depth: 0.06
  });
  addFrontBand(windows, {
    x: cx - 0.1 - 11.6 / 2 - 0.02,
    y: DECK_Y + 4.1,
    z: 0,
    width: 8.2,
    height: 0.96,
    panes: 4,
    depth: 0.06
  });
  addFrontBand(windows, {
    x: cx - 0.2 - 10.4 / 2 - 0.02,
    y: DECK_Y + 6.22,
    z: 0,
    width: 7.2,
    height: 0.86,
    panes: 3,
    depth: 0.06
  });

  addRailingRect(railParts, {
    x: cx - 0.2,
    z: 0,
    width: 11.4,
    depth: 18.3,
    y: DECK_Y + 7.5,
    skipFront: false
  });

  addAftSolarArray(group, materials, cx);
  addAftHoseReels(group, materials, cx);

  const houseNameMaterial = new THREE.MeshBasicMaterial({
    map: materials.nameDecal.map,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const houseName = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 1.22),
    houseNameMaterial
  );
  houseName.position.set(cx - 1.8, DECK_Y + 0.55, 19.2 / 2 + 0.04);
  houseName.renderOrder = 5;
  group.add(houseName);

  // 绿色设备塔：只还原照片可见轮廓，不标注为烟囱
  const tower = prismFromPoints(
    roundedRectPoints(3.5, 3.9, 0.35),
    4.8,
    materials.greenHouse,
    { baseY: DECK_Y + 7.6 }
  );
  tower.position.set(cx - 2.3, 0, 0);
  group.add(tower);

  const towerCap = prismFromPoints(
    roundedRectPoints(3.9, 4.3, 0.4),
    0.22,
    materials.whiteTrim,
    { baseY: DECK_Y + 12.4 }
  );
  towerCap.position.set(cx - 2.3, 0, 0);
  group.add(towerCap);

  const ventRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.16, 8, 28),
    materials.darkMetal
  );
  ventRing.rotation.y = Math.PI / 2;
  ventRing.position.set(cx - 0.49, DECK_Y + 10.2, 0);
  group.add(ventRing);

  const ventDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 24),
    materials.vent
  );
  ventDisc.rotation.y = Math.PI / 2;
  ventDisc.position.set(cx - 0.47, DECK_Y + 10.2, 0);
  group.add(ventDisc);

  const lifeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.16, 8, 20),
    materials.safetyOrange
  );
  lifeRing.rotation.y = Math.PI / 2;
  lifeRing.position.set(cx - 0.48, DECK_Y + 8.65, 0.9);
  group.add(lifeRing);

  // 小型天线桅
  const aftMast = new THREE.Group();
  aftMast.position.set(cx + 2.1, DECK_Y + 7.5, -4.2);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, 7.2, 7),
    materials.railWhite
  );
  pole.position.y = 3.6;
  aftMast.add(pole);
  const yard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.8), materials.railWhite);
  yard.position.y = 4.8;
  aftMast.add(yard);
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 2.8, 4),
    materials.darkMetal
  );
  antenna.position.set(0, 6.2, 0);
  aftMast.add(antenna);
  group.add(aftMast);

  // 尾部圆形通风设备
  const roundHatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24),
    materials.whiteTrim
  );
  roundHatch.position.set(cx + 2.2, DECK_Y + 7.56, 1.6);
  group.add(roundHatch);

  // 侧门
  [-1, 1].forEach((side) => {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.7, 0.78),
      materials.darkMetal
    );
    door.position.set(cx + 1.5, DECK_Y + 0.98, side * (19.2 / 2 + 0.025));
    group.add(door);
  });

  addVerticalLadder(group, {
    x: cx + 3.6,
    z: 9.7,
    yBottom: DECK_Y + 0.15,
    yTop: DECK_Y + 7.1,
    material: materials.railWhite
  });

  // 航行灯
  const aftLightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe0a3,
    transparent: true,
    opacity: 0.65,
    toneMapped: false
  });
  const aftLight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), aftLightMaterial);
  aftLight.position.set(cx + 3.2, DECK_Y + 7.85, -6.8);
  group.add(aftLight);
  animated.navLights.push({ mesh: aftLight, material: aftLightMaterial, phase: 2.3 });

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

/* -------------------------------------------------------------------------- */
/* 桅杆 / 雷达 / 天线                                                           */
/* -------------------------------------------------------------------------- */
function addAftSolarArray(group, materials, cx) {
  const roofY = DECK_Y + 7.54;
  const xColumns = [cx - 3.4, cx + 1.2];
  const zRows = [-5.35, -3.35, 3.35, 5.35];
  const positions = [];
  zRows.forEach((z) => {
    xColumns.forEach((x) => positions.push({ x, z }));
  });

  const panelGeometry = new THREE.BoxGeometry(2.7, 0.07, 1.35);
  const frameGeometry = new THREE.BoxGeometry(2.86, 0.035, 1.51);
  const panels = new THREE.InstancedMesh(panelGeometry, materials.pv, positions.length);
  const frames = new THREE.InstancedMesh(frameGeometry, materials.pvFrame, positions.length);
  panels.name = 'AftSolarPanels';
  frames.name = 'AftSolarPanelFrames';
  const dummy = new THREE.Object3D();

  positions.forEach((point, index) => {
    dummy.position.set(point.x, roofY + 0.09, point.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    panels.setMatrixAt(index, dummy.matrix);

    dummy.position.y = roofY + 0.04;
    dummy.updateMatrix();
    frames.setMatrixAt(index, dummy.matrix);
  });
  panels.instanceMatrix.needsUpdate = true;
  frames.instanceMatrix.needsUpdate = true;
  panels.castShadow = true;
  frames.castShadow = false;
  group.add(frames, panels);
}

function addAftHoseReels(group, materials, cx) {
  [-1, 1].forEach((side) => {
    const x = cx - 2.9;
    const z = side * 8.15;
    const y = DECK_Y + 8.0;

    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.25, 0.12),
      materials.railWhite
    );
    bracket.position.set(x, y, z + side * 0.18);
    group.add(bracket);

    const reel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 0.24, 22),
      materials.safetyOrange
    );
    reel.rotation.x = Math.PI / 2;
    reel.position.set(x, y, z);
    group.add(reel);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.3, 12),
      materials.railWhite
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, y, z);
    group.add(hub);
  });
}

function addWrapBand(group, { cx, y, width, depth, material, height = 0.12, thickness = 0.08 }) {
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, height, depth),
    material
  );
  front.position.set(cx + width / 2, y, 0);
  group.add(front);

  [-1, 1].forEach((side) => {
    const sideBand = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, thickness),
      material
    );
    sideBand.position.set(cx, y, side * (depth / 2));
    group.add(sideBand);
  });
}

function addRoofEquipment(group, materials, cx) {
  const roofTop = DECK_Y + 8.8;
  const equipment = new THREE.Group();
  equipment.name = 'BridgeRoofEquipment';

  const radomeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd3ddd6,
    metalness: 0.12,
    roughness: 0.4
  });

  [
    [-4.2, 4.3, 0.68],
    [-4.2, -4.3, 0.54]
  ].forEach(([dx, z, radius]) => {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.7, radius * 0.8, 0.22, 12),
      materials.darkMetal
    );
    base.position.set(cx + dx, roofTop + 0.11, z);
    equipment.add(base);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      radomeMaterial
    );
    dome.position.set(cx + dx, roofTop + 0.22, z);
    equipment.add(dome);
  });

  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.72, 1.05),
    materials.whiteTrim
  );
  cabinet.position.set(cx + 3.6, roofTop + 0.36, 4.7);
  equipment.add(cabinet);

  const vent = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.9, 0.65),
    materials.darkMetal
  );
  vent.position.set(cx + 4.8, roofTop + 0.45, -4.7);
  equipment.add(vent);

  const searchBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.85, 8),
    materials.railWhite
  );
  searchBase.position.set(cx + 5.4, roofTop + 0.42, -3.1);
  equipment.add(searchBase);

  const searchHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.34, 0.36, 12),
    materials.darkMetal
  );
  searchHead.rotation.z = Math.PI / 2;
  searchHead.position.set(cx + 5.4, roofTop + 0.92, -3.1);
  equipment.add(searchHead);

  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.04, 2.7, 6),
    materials.railWhite
  );
  flagPole.position.set(cx - 6.0, roofTop + 1.35, -5.6);
  equipment.add(flagPole);

  group.add(equipment);
}

function addLifeRing(group, { x, y, z, material, bracketMaterial, facing = 1 }) {
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.5, 0.08),
    bracketMaterial
  );
  bracket.position.set(x, y + 0.62, z);
  group.add(bracket);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.065, 8, 28),
    material
  );
  ring.position.set(x, y, z);
  ring.rotation.y = facing < 0 ? 0 : Math.PI;
  group.add(ring);
}

function buildRadarMast(materials, animated, x, baseY) {
  const group = new THREE.Group();
  group.name = 'ForwardRadarMast';
  group.position.set(x, baseY, 0);

  const lowerPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 9.2, 8),
    materials.railWhite
  );
  lowerPole.position.y = 4.6;
  group.add(lowerPole);

  [2.3, 4.2, 6.1, 7.8].forEach((y, index) => {
    const yard = new THREE.Mesh(
      new THREE.BoxGeometry(index % 2 ? 4.2 : 3.0, 0.1, 0.1),
      materials.railWhite
    );
    yard.position.y = y;
    group.add(yard);
    if (index % 2 === 0) {
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 2.4),
        materials.railWhite
      );
      brace.position.y = y;
      group.add(brace);
    }
  });

  // 旋转雷达 1
  const radarOne = new THREE.Group();
  radarOne.position.y = 6.9;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.22), materials.railWhite);
  radarOne.add(beam);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.26, 8),
    materials.darkMetal
  );
  hub.position.y = -0.13;
  radarOne.add(hub);
  group.add(radarOne);
  animated.radars.push({ group: radarOne, speed: 0.8 });

  // 旋转雷达 2（短桅）
  const radarTwo = new THREE.Group();
  radarTwo.position.set(0, 5.1, 0);
  const array = new THREE.Group();
  const scanner = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.12, 0.36),
    materials.darkMetal
  );
  array.add(scanner);
  radarTwo.add(array);
  group.add(radarTwo);
  animated.radars.push({ group: radarTwo, speed: -0.55 });

  // 白色雷达罩
  const radome = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 20, 14),
    materials.superstructurePlain
  );
  radome.scale.y = 0.7;
  radome.position.set(1.5, 3.35, 0);
  group.add(radome);

  // 桅顶灯
  const topLightMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff4d2,
    transparent: true,
    opacity: 0.7,
    toneMapped: false
  });
  const topLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), topLightMaterial);
  topLight.position.y = 9.35;
  group.add(topLight);
  animated.navLights.push({ mesh: topLight, material: topLightMaterial, phase: 0.8 });

  // 多根通信天线
  [
    [-1.25, 7.5, 0.3, 3.3],
    [1.15, 6.7, -0.4, 2.5],
    [0.2, 8.2, 0.7, 2.8]
  ].forEach(([ax, ay, az, height]) => {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, height, 4),
      materials.darkMetal
    );
    antenna.position.set(ax, ay + height / 2 - 1.4, az);
    group.add(antenna);
  });

  // 摄像头与灯
  const cameraPod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.18, 10),
    materials.darkMetal
  );
  cameraPod.rotation.z = Math.PI / 2;
  cameraPod.position.set(1.1, 2.4, 0.4);
  group.add(cameraPod);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });

  return group;
}

/* -------------------------------------------------------------------------- */
/* 窗带 / 栏杆 / 梯子                                                           */
/* -------------------------------------------------------------------------- */
function addFrontBand(windows, { x, y, z, width, height, panes, depth }) {
  // 仅记录几何和变换，最终在 buildSuperstructure 中按材质合并
  const glass = new THREE.Mesh(new THREE.BoxGeometry(depth, height, width), null);
  glass.position.set(x, y, z);
  windows.glass.push(glass);
  windows.trim.push(...generateFrontMullions(x, y, z, width, height, panes));
}

function addSideBand(windows, { z, x, y, width, height, panes }) {
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), null);
  glass.position.set(x, y, z);
  windows.glass.push(glass);
  windows.trim.push(...generateSideMullions(x, y, z, width, height, panes));
}

function generateFrontMullions(x, y, z, width, height, panes) {
  const meshes = [];
  const spacing = width / panes;
  for (let i = 0; i <= panes; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, height + 0.16, 0.075),
      null
    );
    mesh.position.set(x, y, z - width / 2 + i * spacing);
    meshes.push(mesh);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, width + 0.16), null);
  top.position.set(x, y + height / 2 + 0.1, z);
  meshes.push(top);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, width + 0.16), null);
  bottom.position.set(x, y - height / 2 - 0.1, z);
  meshes.push(bottom);
  return meshes;
}

function generateSideMullions(x, y, z, width, height, panes) {
  const meshes = [];
  const spacing = width / panes;
  for (let i = 0; i <= panes; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, height + 0.16, 0.12),
      null
    );
    mesh.position.set(x - width / 2 + i * spacing, y, z);
    meshes.push(mesh);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.1, 0.12), null);
  top.position.set(x, y + height / 2 + 0.1, z);
  meshes.push(top);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.1, 0.12), null);
  bottom.position.set(x, y - height / 2 - 0.1, z);
  meshes.push(bottom);
  return meshes;
}

function addRailingRect(parts, { x, z, width, depth, y }, onlySides = null) {
  const railHeight = 1.02;
  const postSpacing = 2.2;
  const xMin = x - width / 2;
  const xMax = x + width / 2;
  const zMin = z - depth / 2;
  const zMax = z + depth / 2;

  const sides = [
    { start: new THREE.Vector3(xMin, y, zMin), end: new THREE.Vector3(xMax, y, zMin) },
    { start: new THREE.Vector3(xMin, y, zMax), end: new THREE.Vector3(xMax, y, zMax) },
    { start: new THREE.Vector3(xMin, y, zMin), end: new THREE.Vector3(xMin, y, zMax) },
    { start: new THREE.Vector3(xMax, y, zMin), end: new THREE.Vector3(xMax, y, zMax) }
  ];

  sides.forEach(({ start, end }, sideIndex) => {
    if (onlySides && !onlySides.includes(sideIndex)) return;
    const length = start.distanceTo(end);
    const count = Math.max(1, Math.round(length / postSpacing));
    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      const p = start.clone().lerp(end, t);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, railHeight, 0.045), null);
      post.position.set(p.x, y + railHeight / 2, p.z);
      parts.push(post);
    }

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.055, 0.055),
      null
    );
    top.position.set((start.x + end.x) / 2, y + railHeight, (start.z + end.z) / 2);
    if (Math.abs(start.z - end.z) > 0.01) top.rotation.y = Math.PI / 2;
    parts.push(top);

    const mid = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.035, 0.035),
      null
    );
    mid.position.set((start.x + end.x) / 2, y + railHeight * 0.52, (start.z + end.z) / 2);
    if (Math.abs(start.z - end.z) > 0.01) mid.rotation.y = Math.PI / 2;
    parts.push(mid);
  });
}

function addVerticalLadder(group, { x, z, yBottom, yTop, material }) {
  const height = yTop - yBottom;
  const rails = [];
  const rungCount = Math.floor(height / 0.34);
  for (let i = 0; i < 2; i += 1) {
    rails.push(
      cylinderBetween(
        new THREE.Vector3(x, yBottom, z + (i === 0 ? -0.22 : 0.22)),
        new THREE.Vector3(x, yTop, z + (i === 0 ? -0.22 : 0.22)),
        0.032,
        5
      )
    );
  }
  for (let i = 1; i < rungCount; i += 1) {
    const y = yBottom + i * 0.34;
    rails.push(
      cylinderBetween(
        new THREE.Vector3(x, y, z - 0.22),
        new THREE.Vector3(x, y, z + 0.22),
        0.022,
        4
      )
    );
  }
  const geometry = mergeGeometryList(rails);
  if (!geometry) return;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.ladder = true;
  mesh.castShadow = true;
  group.add(mesh);
}

function makeFrontBrandMaterial() {
  return BRAND_MATERIAL ??= createBrandMaterial();
}

let BRAND_MATERIAL = null;

function createBrandMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = 'rgba(238, 248, 240, 0.92)';
  ctx.font = '400 112px "Bahnschrift", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '20px';
  ctx.fillText('NBOSCO', 512, 100);
  ctx.fillStyle = 'rgba(238, 248, 240, 0.65)';
  ctx.font = '500 28px "Microsoft YaHei UI", sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('宁 远 电 鲲 · ZERO EMISSION', 512, 194);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.42,
    metalness: 0.05,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3
  });
}
