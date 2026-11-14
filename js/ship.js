/**
 * 宁远电鲲船舶总装
 * ------------------------------------------------------------------
 * 负责：
 * - 组合船体、上层建筑与纯电系统；
 * - 外壳半透明 / 能源模式等状态切换；
 * - 雷达、航行灯、电池状态灯、螺旋桨动画；
 * - 可交互部件拾取、结构高亮与三维尺寸标记。
 */
import * as THREE from 'three';
import { createMaterialLibrary } from './materials.js';
import { buildHull, HULL } from './hull.js';
import { buildSuperstructure } from './superstructure.js';
import { createEnergySystem } from './energy.js';
import { COMPONENTS } from './data.js';
import { easeInOutCubic } from './utils.js';

const FADE_TARGETS = {
  exterior: { hull: 1, superstructure: 1 },
  structure: { hull: 0.1, superstructure: 0.16 },
  energy: { hull: 0.04, superstructure: 0.055 },
  technical: { hull: 1, superstructure: 1 }
};

const COMPONENT_GROUPS = {
  'forward-house': ['forward'],
  'cargo-hold': ['cargo'],
  'aft-house': ['aft'],
  'battery-system': ['battery', 'power'],
  propulsion: ['propulsion'],
  'pv-system': ['pv'],
  'shore-power': ['shore']
};

export class NingyuanDiankun {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'NINGYUAN_DIANKUN';
    this.floatGroup = new THREE.Group();
    this.floatGroup.name = 'FloatingHullAssembly';
    this.root.add(this.floatGroup);

    const library = createMaterialLibrary();
    this.materials = library.materials;
    this.textures = library.textures;

    this.hull = buildHull(this.materials);
    this.superstructure = buildSuperstructure(this.materials);
    this.energy = createEnergySystem(this.materials, this.textures);

    // 结构线分离出来，不跟随壳体透明度
    this.structuralLines = this.hull.structuralLines;
    this.hull.group.remove(this.structuralLines);
    this.floatGroup.add(this.structuralLines);

    this.floatGroup.add(this.hull.group);
    this.floatGroup.add(this.superstructure.group);
    this.floatGroup.add(this.energy.group);

    this.mode = 'exterior';
    this.fadeGroups = [
      { key: 'hull', ...prepareFadeGroup(this.hull.group) },
      { key: 'superstructure', ...prepareFadeGroup(this.superstructure.group) }
    ];
    this.structureOpacity = 0;
    this.structureVisible = false;

    this.dimensionGroup = buildDimensionLines(this.materials);
    this.root.add(this.dimensionGroup.group);
    this.dimensionLabels = this.dimensionGroup.labels;

    this.selectionHelper = null;
    this.selectedComponentId = null;
    this.componentGroups = this.resolveComponentGroups();
    this.pickMeshes = this.collectPickMeshes();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.1;

    this.lodObjects = {
      high: [
        'HullPaintLines',
        'LashingBridges',
        'SuperstructureRailings'
      ],
      medium: ['HullPaintLines'],
      low: [
        'HullPaintLines',
        'LashingBridges',
        'SuperstructureRailings',
        'ForecastleMachinery',
        'AftMooringWinch'
      ]
    };
    this.xrayHiddenNames = [
      'HullDetails',
      'CargoHold',
      'HullPaintLines',
      'HullGraphics',
      'SuperstructureRailings'
    ];
    this.visibilityObjects = new Map();
    [
      ...this.xrayHiddenNames,
      ...this.lodObjects.high,
      'HullDetails',
      'CargoHold'
    ].forEach((name) => {
      if (this.visibilityObjects.has(name)) return;
      const object =
        this.hull.group.getObjectByName(name) ||
        this.superstructure.group.getObjectByName(name);
      if (object) this.visibilityObjects.set(name, object);
    });
    this.detailLevel = 2;

    this.energy.setMode('exterior');
    this.applyModeImmediate('exterior');
    this.refreshVisibility();

    this.update = this.update.bind(this);
  }

  /* ---------------------------------------------------------------------- */
  /* 模式                                                                   */
  /* ---------------------------------------------------------------------- */
  setMode(mode) {
    if (!FADE_TARGETS[mode]) return;
    this.mode = mode;

    this.fadeGroups.forEach((record) => {
      record.target = FADE_TARGETS[mode][record.key];
    });

    this.energy.setMode(mode);
    const showStructure = mode === 'structure' || mode === 'energy';
    this.structuralLines.visible = showStructure;
    this.structuralTarget = mode === 'structure' ? 0.62 : mode === 'energy' ? 0.17 : 0;
    this.structuralOpacity = 0;
    this.dimensionGroup.group.visible = mode === 'technical';
    this.refreshVisibility();

    if (this.selectedComponentId) {
      const available = this.isComponentActive(this.selectedComponentId);
      if (!available) this.clearSelection();
    }
  }

  refreshVisibility() {
    const xray = this.mode === 'structure' || this.mode === 'energy';
    const lodHidden =
      this.detailLevel <= 0
        ? this.lodObjects.low
        : this.detailLevel === 1
          ? this.lodObjects.medium
          : [];
    this.visibilityObjects.forEach((object, name) => {
      const hideForXray = xray && this.xrayHiddenNames.includes(name);
      const hideForLod = lodHidden.includes(name);
      object.visible = !hideForXray && !hideForLod;
    });
  }

  applyModeImmediate(mode) {
    this.mode = mode;
    const targets = FADE_TARGETS[mode];
    this.fadeGroups.forEach((record) => {
      record.current = targets[record.key];
      record.target = targets[record.key];
      applyMaterialOpacity(record, record.current, mode);
    });
    this.energy.setMode(mode);
    const showStructure = mode === 'structure' || mode === 'energy';
    this.structuralLines.visible = showStructure;
    this.structuralTarget = mode === 'structure' ? 0.62 : mode === 'energy' ? 0.17 : 0;
    this.structuralLines.material.opacity = this.structuralTarget;
    this.structuralOpacity = this.structuralTarget;
    this.dimensionGroup.group.visible = mode === 'technical';
    this.refreshVisibility();
  }

  /* ---------------------------------------------------------------------- */
  /* 可交互部件                                                              */
  /* ---------------------------------------------------------------------- */
  resolveComponentGroups() {
    const coaming = this.hull.group.getObjectByName('CargoCoaming');
    const lashing = this.hull.group.getObjectByName('LashingBridges');
    return {
      'forward-house': [this.superstructure.forward, this.hull.bowEnclosure],
      'cargo-hold': [coaming, lashing].filter(Boolean),
      'aft-house': [this.superstructure.aft],
      'battery-system': [this.energy.battery.group, this.energy.power.group],
      propulsion: [this.energy.propulsion.group],
      'pv-system': [this.energy.pv.group],
      'shore-power': [this.energy.shore.group]
    };
  }

  collectPickMeshes() {
    const result = [];
    Object.entries(this.componentGroups).forEach(([componentId, groups]) => {
      groups.forEach((group) => {
        if (!group) return;
        group.traverse((object) => {
          if (!object.isMesh) return;
          object.userData.componentId = componentId;
          result.push(object);
        });
      });
    });
    return result;
  }

  isComponentActive(componentId) {
    const component = COMPONENTS.find((item) => item.id === componentId);
    if (!component) return false;
    return component.modelModes.includes(this.mode);
  }

  isComponentVisible(componentId) {
    const groups = this.componentGroups[componentId] || [];
    return groups.some((group) => isRendered(group));
  }

  isMeshPickable(mesh) {
    const componentId = mesh.userData.componentId;
    if (!componentId) return false;
    if (!this.isComponentActive(componentId)) return false;
    return isRendered(mesh);
  }

  /**
   * 在鼠标位置拾取部件
   * @param {THREE.Vector2} ndc 归一化设备坐标
   * @param {THREE.Camera} camera
   * @returns {string|null}
   */
  pick(ndc, camera) {
    this.raycaster.setFromCamera(ndc, camera);
    const candidates = this.pickMeshes.filter((mesh) => this.isMeshPickable(mesh));
    if (!candidates.length) return null;
    const intersections = this.raycaster.intersectObjects(candidates, false);
    for (const hit of intersections) {
      const id = hit.object.userData.componentId;
      if (id && this.isComponentActive(id)) return id;
    }
    return null;
  }

  selectComponent(componentId) {
    if (!componentId || !this.isComponentActive(componentId)) {
      this.clearSelection();
      return;
    }
    const groups = this.componentGroups[componentId] || [];
    if (!groups.length) {
      this.clearSelection();
      return;
    }

    this.clearSelection();
    this.selectedComponentId = componentId;

    this.selectionHelpers = [];
    groups.forEach((source) => {
      if (!source) return;
      const boxHelper = new THREE.BoxHelper(source, 0x63f6c0);
      boxHelper.material.transparent = true;
      boxHelper.material.opacity = 0.58;
      boxHelper.material.depthTest = false;
      boxHelper.material.toneMapped = false;
      boxHelper.renderOrder = 30;
      this.selectionHelpers.push(boxHelper);
      this.root.add(boxHelper);
    });
    this.selectionHelper = this.selectionHelpers;
  }

  clearSelection() {
    this.selectedComponentId = null;
    if (this.selectionHelpers?.length) {
      this.selectionHelpers.forEach((helper) => {
        helper.geometry?.dispose?.();
        helper.material?.dispose?.();
        this.root.remove(helper);
      });
    }
    this.selectionHelper = null;
    this.selectionHelpers = [];
  }

  setDetailLevel(level) {
    this.detailLevel = level;
    this.refreshVisibility();
  }

  getSelectedComponent() {
    return this.selectedComponentId;
  }

  getComponentAnchor(componentId) {
    const component = COMPONENTS.find((item) => item.id === componentId);
    if (!component) return null;
    return new THREE.Vector3(...component.anchor);
  }

  /* ---------------------------------------------------------------------- */
  /* 动画                                                                   */
  /* ---------------------------------------------------------------------- */
  update(delta, elapsed) {
    this.floatGroup.position.y = 0.9 + Math.sin(elapsed * 0.42) * 0.05 + Math.sin(elapsed * 0.93) * 0.018;
    this.floatGroup.rotation.z = Math.sin(elapsed * 0.29) * 0.0018;
    this.floatGroup.rotation.x = Math.sin(elapsed * 0.23 + 1.7) * 0.0007;

    // 桅杆雷达
    this.superstructure.animated.radars.forEach(({ group, speed }) => {
      group.rotation.y += delta * speed;
    });

    // 航行灯：动画引用改为读取 Mesh 当前材质，以适配模式材质克隆
    this.superstructure.animated.navLights.forEach(({ mesh, material, phase }) => {
      const activeMaterial = mesh.material || material;
      const blink = Math.pow(Math.max(0, Math.sin(elapsed * 1.55 + phase)), 7);
      activeMaterial.opacity = this.mode === 'energy' ? 0.18 : 0.24 + blink * 0.76;
    });

    this.energy.update(delta, elapsed);
    this.updateFade(delta);
    this.updateStructuralLines(delta);
    this.updateSelection();
  }

  updateFade(delta) {
    const speed = Math.min(1, delta * 4.3);
    this.fadeGroups.forEach((record) => {
      if (Math.abs(record.current - record.target) < 0.0015) {
        if (record.current !== record.target) {
          record.current = record.target;
          applyMaterialOpacity(record, record.current, this.mode);
        }
        return;
      }
      record.current += (record.target - record.current) * speed;
      applyMaterialOpacity(record, record.current, this.mode);
    });
  }

  updateStructuralLines(delta) {
    if (!this.structuralLines.visible) return;
    const target = this.structuralTarget;
    this.structureOpacity += (target - this.structureOpacity) * Math.min(1, delta * 5);
    this.structuralLines.material.opacity = this.structureOpacity;
  }

  updateSelection() {
    if (!this.selectionHelpers?.length) return;
    this.selectionHelpers.forEach((helper) => helper.update());
  }

  setDimLabelsVisible(visible) {
    this.dimensionGroup.group.visible = visible;
  }
}

/* -------------------------------------------------------------------------- */
/* 材质透明过渡                                                                 */
/* -------------------------------------------------------------------------- */
function prepareFadeGroup(group) {
  const cache = new Map();
  const materials = [];

  group.traverse((object) => {
    if ((!object.isMesh && !object.isLine) || !object.material) return;
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => cloneMaterial(material, cache, materials));
    } else {
      object.material = cloneMaterial(object.material, cache, materials);
    }
  });

  return { materials, current: 1, target: 1 };
}

const XRAY_TINTS = {
  structure: new THREE.Color(0x1d594a),
  energy: new THREE.Color(0x092b2b)
};

function cloneMaterial(material, cache, collection) {
  if (cache.has(material)) return cache.get(material);
  const clone = material.clone();
  clone.userData.baseOpacity = material.opacity;
  clone.userData.baseTransparent = material.transparent;
  clone.userData.baseDepthWrite = material.depthWrite;
  clone.userData.currentTransparent = material.transparent;
  clone.userData.baseColor = material.color?.clone?.() || null;
  cache.set(material, clone);
  collection.push(clone);
  return clone;
}

function applyMaterialOpacity(record, factor, mode = 'exterior') {
  const opacity = Math.max(0, Math.min(1, factor));
  const tint = XRAY_TINTS[mode] || null;
  const tintStrength = tint ? Math.min(0.82, (1 - opacity) * 0.9) : 0;

  record.materials.forEach((material) => {
    const base = material.userData.baseOpacity ?? 1;
    material.opacity = base * opacity;

    if (tint && material.color && material.userData.baseColor) {
      material.color.copy(material.userData.baseColor).lerp(tint, tintStrength);
    } else if (material.color && material.userData.baseColor) {
      material.color.copy(material.userData.baseColor);
    }

    const shouldBeTransparent = material.userData.baseTransparent || opacity < 0.995;
    if (material.transparent !== shouldBeTransparent) {
      material.transparent = shouldBeTransparent;
      material.needsUpdate = true;
    }
    material.depthWrite = opacity > 0.8 ? material.userData.baseDepthWrite : false;
  });
}

/* -------------------------------------------------------------------------- */
/* 三维尺寸线                                                                   */
/* -------------------------------------------------------------------------- */
function buildDimensionLines(materials) {
  const group = new THREE.Group();
  group.name = 'DimensionOverlay';
  group.visible = false;

  const material = new THREE.LineBasicMaterial({
    color: 0x65e7ff,
    transparent: true,
    opacity: 0.6,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });

  const yTop = 27.6;
  addDimensionLine(group, material, [
    new THREE.Vector3(HULL.stern, yTop, 0),
    new THREE.Vector3(HULL.bow, yTop, 0)
  ], [
    new THREE.Vector3(HULL.stern, yTop - 1.2, 0),
    new THREE.Vector3(HULL.stern, yTop + 1.2, 0)
  ], [
    new THREE.Vector3(HULL.bow, yTop - 1.2, 0),
    new THREE.Vector3(HULL.bow, yTop + 1.2, 0)
  ]);

  // 将横向/竖向尺度集中到艉部外侧，保证三维标注不落入右侧说明栏
  const gaugeX = HULL.stern - 2.4;
  const yBeam = 13.6;
  addDimensionLine(group, material, [
    new THREE.Vector3(gaugeX, yBeam, -HULL.halfBeam - 1.8),
    new THREE.Vector3(gaugeX, yBeam, HULL.halfBeam + 1.8)
  ], [
    new THREE.Vector3(gaugeX - 1.0, yBeam, -HULL.halfBeam - 1.8),
    new THREE.Vector3(gaugeX + 1.0, yBeam, -HULL.halfBeam - 1.8)
  ], [
    new THREE.Vector3(gaugeX - 1.0, yBeam, HULL.halfBeam + 1.8),
    new THREE.Vector3(gaugeX + 1.0, yBeam, HULL.halfBeam + 1.8)
  ]);

  const depthZ = -HULL.halfBeam - 2.6;
  addDimensionLine(group, material, [
    new THREE.Vector3(gaugeX, -HULL.draft, depthZ),
    new THREE.Vector3(gaugeX, HULL.deckY, depthZ)
  ], [
    new THREE.Vector3(gaugeX - 0.9, -HULL.draft, depthZ),
    new THREE.Vector3(gaugeX + 0.9, -HULL.draft, depthZ)
  ], [
    new THREE.Vector3(gaugeX - 0.9, HULL.deckY, depthZ),
    new THREE.Vector3(gaugeX + 0.9, HULL.deckY, depthZ)
  ]);

  const draftZ = HULL.halfBeam + 2.6;
  addDimensionLine(group, material, [
    new THREE.Vector3(gaugeX, -HULL.draft, draftZ),
    new THREE.Vector3(gaugeX, 0.12, draftZ)
  ], [
    new THREE.Vector3(gaugeX - 0.9, -HULL.draft, draftZ),
    new THREE.Vector3(gaugeX + 0.9, -HULL.draft, draftZ)
  ], [
    new THREE.Vector3(gaugeX - 0.9, 0.12, draftZ),
    new THREE.Vector3(gaugeX + 0.9, 0.12, draftZ)
  ]);

  // 端部连接线
  const connectors = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(HULL.stern, HULL.deckY, 0),
    new THREE.Vector3(HULL.stern, yTop, 0),
    new THREE.Vector3(HULL.bow, HULL.deckY, 0),
    new THREE.Vector3(HULL.bow, yTop, 0),
    new THREE.Vector3(gaugeX, HULL.deckY, -HULL.halfBeam),
    new THREE.Vector3(gaugeX, yBeam, -HULL.halfBeam - 1.8),
    new THREE.Vector3(gaugeX, HULL.deckY, HULL.halfBeam),
    new THREE.Vector3(gaugeX, yBeam, HULL.halfBeam + 1.8)
  ]);
  const connectorLines = new THREE.LineSegments(connectors, material.clone());
  connectorLines.material.opacity = 0.19;
  group.add(connectorLines);

  return {
    group,
    labels: [
      { id: 'loa', text: 'LOA 127.8 m', position: new THREE.Vector3(0, yTop + 1.7, 0) },
      { id: 'beam', text: 'BREADTH 21.6 m', position: new THREE.Vector3(gaugeX + 2.6, yBeam + 1.1, 0) },
      { id: 'depth', text: 'DEPTH 10.5 m', position: new THREE.Vector3(gaugeX + 2.6, -1.3, depthZ) },
      { id: 'draft', text: 'DRAFT 6.5 m', position: new THREE.Vector3(gaugeX + 2.6, -3.4, draftZ) }
    ]
  };
}

function addDimensionLine(group, material, mainPoints, ...tickSegments) {
  const geometry = new THREE.BufferGeometry().setFromPoints(mainPoints);
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 40;
  group.add(line);

  tickSegments.flat().forEach((pair, index) => {
    if (index % 2 !== 0) return;
  });
  const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickSegments.flat());
  const ticks = new THREE.LineSegments(tickGeometry, material);
  ticks.renderOrder = 40;
  group.add(ticks);
}

function isRendered(object) {
  let current = object;
  while (current) {
    if (current.visible === false) return false;
    current = current.parent;
  }
  return true;
}

export function createNingyuanShip() {
  return new NingyuanDiankun();
}
