/**
 * 新能源动力系统 / 概念可视化
 * ------------------------------------------------------------------
 * 已核实的系统事实：
 *  - 10 个箱式电池；
 *  - 高压岸电充电 + 箱式电池吊装换电；
 *  - 双机双桨，最大航速 11.5 kn；
 *  - 配备光伏系统。
 *
 * 未公开：电池舱实船排布、EMS 柜位、轴系尺寸、光伏面积与位置、岸电接口位置。
 * 因此本模块的内部几何与能源流线均为“系统原理 + 概念布置”，
 * 在 UI 中以 M 级（概念重建）标识，不能作为工程图纸。
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HULL, halfBeamAt } from './hull.js';
import { cylinderBetween, tubeGeometry } from './utils.js';

export function createEnergySystem(materials, textures) {
  const group = new THREE.Group();
  group.name = 'ConceptualElectricSystem';
  group.visible = false;

  const systemCore = new THREE.Group();
  systemCore.name = 'ElectricSystemCore';
  const flowGroup = new THREE.Group();
  flowGroup.name = 'EnergyFlowSchematic';
  const hologramGroup = new THREE.Group();
  hologramGroup.name = 'EnergyHolograms';

  group.add(systemCore, flowGroup, hologramGroup);

  const battery = buildBatteryBank(materials, textures);
  const power = buildPowerDistribution(materials);
  const propulsion = buildPropulsion(materials);
  const pv = buildPhotovoltaicConcepts(materials, textures);
  const shore = buildShorePowerConcept(materials);

  systemCore.add(battery.group, power.group, propulsion.group);
  hologramGroup.add(pv.group, shore.group);

  // 仅用于 X-Ray 模式的概念检修照明，不改变外观模式
  const inspectionLights = new THREE.Group();
  inspectionLights.name = 'ConceptInspectionLights';
  const inspectionA = new THREE.PointLight(0x8fffd9, 130, 48, 2);
  inspectionA.position.set(-12, 3.6, 0);
  const inspectionB = new THREE.PointLight(0x68dfff, 110, 42, 2);
  inspectionB.position.set(-44, 1.2, 3.2);
  inspectionLights.add(inspectionA, inspectionB);
  systemCore.add(inspectionLights);

  const flows = buildEnergyFlows(materials, pv, shore);
  flowGroup.add(flows.group);

  const animatedMaterials = {
    batteryGlow: [],
    motorGlow: [],
    pvGlow: [],
    shoreGlow: []
  };

  battery.animatedMaterials.forEach((material) => animatedMaterials.batteryGlow.push(material));
  propulsion.animatedMaterials.forEach((material) => animatedMaterials.motorGlow.push(material));
  pv.animatedMaterials.forEach((material) => animatedMaterials.pvGlow.push(material));
  shore.animatedMaterials.forEach((material) => animatedMaterials.shoreGlow.push(material));

  let activeMode = 'exterior';

  function setMode(mode) {
    activeMode = mode;
    const showCore = mode === 'structure' || mode === 'energy';
    const showFlow = mode === 'energy';
    group.visible = showCore;
    systemCore.visible = showCore;
    flowGroup.visible = showFlow;
    hologramGroup.visible = showFlow;
    pv.group.visible = showFlow;
    shore.group.visible = showFlow;
  }

  function update(delta, elapsed) {
    if (!group.visible) return;

    propulsion.propellers.forEach(({ group: propeller, speed }) => {
      propeller.rotation.x += delta * speed;
    });

    if (activeMode === 'energy') {
      flows.update(elapsed);
      pv.update(elapsed);
      shore.update(elapsed);
      animatedMaterials.batteryGlow.forEach((material, index) => {
        material.opacity = 0.38 + Math.sin(elapsed * 2.1 + index * 0.45) * 0.16;
      });
      animatedMaterials.motorGlow.forEach((material, index) => {
        material.opacity = 0.34 + Math.sin(elapsed * 2.8 + index) * 0.12;
      });
      animatedMaterials.pvGlow.forEach((material) => {
        material.opacity = 0.18 + Math.sin(elapsed * 1.4) * 0.05;
      });
      animatedMaterials.shoreGlow.forEach((material) => {
        material.opacity = 0.4 + Math.sin(elapsed * 2.4) * 0.16;
      });
    }
  }

  return {
    group,
    systemCore,
    flowGroup,
    hologramGroup,
    battery,
    power,
    propulsion,
    pv,
    shore,
    flows,
    setMode,
    update,
    getMode: () => activeMode
  };
}

/* -------------------------------------------------------------------------- */
/* 10 箱式电池舱                                                                */
/* -------------------------------------------------------------------------- */
function buildBatteryBank(materials, textures) {
  const group = new THREE.Group();
  group.name = 'ContainerBatteryBank';

  const boxLength = 5.7;
  const boxHeight = 2.59;
  const boxWidth = 2.44;
  const rowZ = [-2.9, 2.9];
  const xPositions = [-24.1, -17.7, -11.3, -4.9, 1.5];
  // 概念布置：将 10 个箱体呈现在敞口货舱的可见范围内，便于识别；
  // 真实电池舱位置未公开，故不声称与实船一致。
  const yCenter = 1.35;
  const positions = [];

  rowZ.forEach((z) => {
    xPositions.forEach((x) => positions.push({ x, z }));
  });

  // 电池箱体
  const bodyGeometry = new RoundedBoxGeometry(boxLength, boxHeight, boxWidth, 2, 0.07);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x123c31,
    metalness: 0.24,
    roughness: 0.58,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4
  });
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, positions.length);
  bodies.name = 'BatteryEnclosureBodies';
  bodies.castShadow = true;
  bodies.receiveShadow = true;

  const dummy = new THREE.Object3D();
  positions.forEach((p, index) => {
    dummy.position.set(p.x, yCenter, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    bodies.setMatrixAt(index, dummy.matrix);
  });
  bodies.instanceMatrix.needsUpdate = true;
  group.add(bodies);

  // 深绿金属顶盖；白色只保留窄标识带，避免过曝连成发光条
  const lidGeometry = new RoundedBoxGeometry(boxLength - 0.18, 0.12, boxWidth - 0.18, 2, 0.04);
  const lidMaterial = new THREE.MeshStandardMaterial({
    color: 0x193830,
    metalness: 0.14,
    roughness: 0.76
  });
  const lids = new THREE.InstancedMesh(lidGeometry, lidMaterial, positions.length);
  positions.forEach((p, index) => {
    dummy.position.set(p.x, yCenter + boxHeight / 2 + 0.035, p.z);
    dummy.updateMatrix();
    lids.setMatrixAt(index, dummy.matrix);
  });
  lids.instanceMatrix.needsUpdate = true;
  lids.castShadow = true;
  group.add(lids);

  const lidBands = new THREE.InstancedMesh(
    new THREE.BoxGeometry(boxLength - 1.2, 0.035, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x6f8378, toneMapped: true }),
    positions.length
  );
  positions.forEach((p, index) => {
    dummy.position.set(p.x, yCenter + boxHeight / 2 + 0.11, p.z);
    dummy.updateMatrix();
    lidBands.setMatrixAt(index, dummy.matrix);
  });
  lidBands.instanceMatrix.needsUpdate = true;
  group.add(lidBands);

  // 顶部编号 01–10：一眼确认“10 箱”概念布置
  const numberAtlas = makeBatteryNumberAtlas();
  const numberedTop = buildBatteryNumberGeometry(
    positions,
    yCenter + boxHeight / 2 + 0.135,
    numberAtlas
  );
  group.add(numberedTop);

  // 10 个箱体的轮廓线：远景也能数清 2×5 概念阵列
  group.add(buildBatteryOutlines(positions, yCenter, boxLength, boxHeight, boxWidth));

  // 侧面标识屏（2 面 × 10 箱）
  const labelMaterial = new THREE.MeshStandardMaterial({
    map: textures.batteryTexture,
    roughness: 0.7,
    metalness: 0.05
  });
  const labelGeometry = new THREE.PlaneGeometry(boxLength - 0.22, boxHeight - 0.22);
  const labelCount = positions.length * 2;
  const labels = new THREE.InstancedMesh(labelGeometry, labelMaterial, labelCount);
  let labelIndex = 0;
  positions.forEach((p) => {
    [1, -1].forEach((side) => {
      dummy.position.set(p.x, yCenter - 0.02, p.z + side * (boxWidth / 2 + 0.012));
      dummy.rotation.set(0, side > 0 ? 0 : Math.PI, 0);
      dummy.updateMatrix();
      labels.setMatrixAt(labelIndex, dummy.matrix);
      labelIndex += 1;
    });
  });
  labels.instanceMatrix.needsUpdate = true;
  group.add(labels);

  // 箱角 / 绝缘底座
  const cornerGeometry = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  const cornerMaterial = new THREE.MeshStandardMaterial({
    color: 0x879c8e,
    metalness: 0.38,
    roughness: 0.48
  });
  const corners = new THREE.InstancedMesh(cornerGeometry, cornerMaterial, positions.length * 8);
  let cornerIndex = 0;
  positions.forEach((p) => {
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        [-1, 1].forEach((sy) => {
          dummy.position.set(
            p.x + sx * (boxLength / 2 - 0.12),
            yCenter + sy * (boxHeight / 2 - 0.12),
            p.z + sz * (boxWidth / 2 - 0.12)
          );
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          corners.setMatrixAt(cornerIndex, dummy.matrix);
          cornerIndex += 1;
        });
      });
    });
  });
  corners.instanceMatrix.needsUpdate = true;
  group.add(corners);

  // 高位高压接口与状态灯
  const connectorGeometry = new THREE.BoxGeometry(0.34, 0.24, 0.1);
  const connectors = new THREE.InstancedMesh(connectorGeometry, materials.darkMetal, positions.length);
  positions.forEach((p, index) => {
    dummy.position.set(p.x + 2.1, yCenter + 0.45, p.z + (p.z > 0 ? 1.27 : -1.27));
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    connectors.setMatrixAt(index, dummy.matrix);
  });
  group.add(connectors);

  const ledMaterial = new THREE.MeshBasicMaterial({
    color: 0x5bffae,
    transparent: true,
    opacity: 0.45,
    toneMapped: false
  });
  const leds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.5, 0.045, 0.025),
    ledMaterial,
    positions.length * 2
  );
  let ledIndex = 0;
  positions.forEach((p) => {
    [-1, 1].forEach((side) => {
      dummy.position.set(p.x - 1.7, yCenter + 0.88, p.z + side * (boxWidth / 2 + 0.018));
      dummy.rotation.set(0, side > 0 ? 0 : Math.PI, 0);
      dummy.updateMatrix();
      leds.setMatrixAt(ledIndex, dummy.matrix);
      ledIndex += 1;
    });
  });
  group.add(leds);

  // 电池舱框架、检修走道
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x253a35,
    metalness: 0.7,
    roughness: 0.35
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(34.5, 0.18, 9.8), frameMaterial);
  base.position.set(-11.3, -0.18, 0);
  group.add(base);

  const centerWalkway = new THREE.Mesh(
    new THREE.BoxGeometry(32.5, 0.08, 1.1),
    materials.deckDark
  );
  centerWalkway.position.set(-11.3, -0.02, 0);
  group.add(centerWalkway);

  // 冷却/消防总管
  const pipePoints = [];
  for (let x = -28; x <= 6; x += 2) {
    pipePoints.push(new THREE.Vector3(x, 2.9, 0));
  }
  const pipe = new THREE.Mesh(tubeGeometry(pipePoints, 0.055, 60, 6), materials.motorCopper);
  group.add(pipe);

  // 电池架护栏（只做舱内示意）
  const railParts = [];
  [-1, 1].forEach((side) => {
    [-5.1, 1.9].forEach((x) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.07), materials.whiteTrim);
      post.position.set(x, 0.5, side * 0.55);
      railParts.push(post);
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 0.05), materials.whiteTrim);
    rail.position.set(-1.6, 1.0, side * 0.55);
    railParts.push(rail);
  });
  railParts.forEach((part) => group.add(part));

  // 电池信息牌：概念说明，不属于实船标识
  const sign = makeBatteryBankSign();
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 1.1),
    sign.material
  );
  signMesh.position.set(-16.2, 3.1, 7.5);
  signMesh.rotation.x = 0;
  signMesh.renderOrder = 3;
  group.add(signMesh);

  group.userData.componentId = 'battery-system';
  return {
    group,
    positions,
    animatedMaterials: [ledMaterial]
  };
}

function makeBatteryNumberAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 10; index += 1) {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const x = col * 204.8;
    const y = row * 256;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(3, 23, 19, 0.62)';
    ctx.fillRect(7, 7, 190, 242);
    ctx.strokeStyle = 'rgba(110, 232, 190, 0.36)';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 7, 190, 242);

    ctx.fillStyle = 'rgba(208, 244, 228, 0.92)';
    ctx.font = '600 100px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(index + 1).padStart(2, '0'), 26, 120);
    ctx.fillStyle = 'rgba(112, 218, 180, 0.72)';
    ctx.font = '500 21px Consolas, monospace';
    ctx.fillText('BESS MODULE', 27, 166);
    ctx.fillStyle = 'rgba(198, 223, 210, 0.48)';
    ctx.font = '400 17px Consolas, monospace';
    ctx.fillText('LITHIUM / HV', 27, 204);
    ctx.fillStyle = 'rgba(96, 234, 188, 0.7)';
    ctx.fillRect(27, 218, 142, 3);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildBatteryOutlines(positions, yCenter, length, height, width) {
  const positionsArray = [];
  const hx = length / 2;
  const hy = height / 2;
  const hz = width / 2;
  const cornerOffsets = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  positions.forEach((point) => {
    const corners = cornerOffsets.map(([dx, dy, dz]) => [
      point.x + dx,
      yCenter + dy,
      point.z + dz
    ]);
    edges.forEach(([a, b]) => {
      positionsArray.push(...corners[a], ...corners[b]);
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x6ef0c4,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    toneMapped: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'BatteryModuleOutlines';
  lines.renderOrder = 5;
  return lines;
}

function buildBatteryNumberGeometry(positions, y, texture) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];
  const cellW = 1 / 5;
  const cellH = 1 / 2;

  positions.forEach((point, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const cx = point.x - 1.45;
    const cz = point.z;
    const w = 1.7;
    const d = 1.05;
    const u0 = col * cellW;
    const u1 = (col + 1) * cellW;
    const v0 = 1 - (row + 1) * cellH;
    const v1 = 1 - row * cellH;
    const base = vertices.length / 3;

    // 近侧边对应纹理底部，远侧边对应纹理顶部
    vertices.push(
      cx - w / 2, y, cz + d / 2,
      cx + w / 2, y, cz + d / 2,
      cx + w / 2, y, cz - d / 2,
      cx - w / 2, y, cz - d / 2
    );
    uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'BatteryTopNumbers';
  mesh.renderOrder = 4;
  return mesh;
}

function makeBatteryBankSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 200);
  ctx.fillStyle = 'rgba(3, 17, 14, 0.82)';
  ctx.fillRect(0, 0, 1024, 200);
  ctx.strokeStyle = 'rgba(91, 255, 174, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 1022, 198);
  ctx.fillStyle = 'rgba(91, 255, 174, 0.9)';
  ctx.font = '500 48px Consolas, monospace';
  ctx.fillText('BESS 01 — 10', 40, 82);
  ctx.fillStyle = 'rgba(210, 236, 223, 0.75)';
  ctx.font = '400 24px Consolas, monospace';
  ctx.fillText('CONCEPT ARRANGEMENT / NOT SHIP DRAWING', 40, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return {
    material: new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide
    })
  };
}

/* -------------------------------------------------------------------------- */
/* 配电与能量管理                                                               */
/* -------------------------------------------------------------------------- */
function buildPowerDistribution(materials) {
  const group = new THREE.Group();
  group.name = 'EMSAndPowerDistribution';

  const floorY = -6.2;
  const cabinetMaterial = new THREE.MeshStandardMaterial({
    color: 0x314a4a,
    metalness: 0.68,
    roughness: 0.3
  });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b201f,
    metalness: 0.35,
    roughness: 0.55
  });

  [-1, 0, 1].forEach((index) => {
    const cabinet = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 2.2), cabinetMaterial);
    body.position.y = 1.15;
    cabinet.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.68, 1.8), panelMaterial);
    panel.position.set(0.62, 1.12, 0);
    cabinet.add(panel);

    for (let i = 0; i < 4; i += 1) {
      const lamp = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, 0.04),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0x58ffc0 : 0x3adfff,
          transparent: true,
          opacity: 0.5,
          toneMapped: false
        })
      );
      lamp.position.set(0.655, 1.6 - i * 0.24, -0.38);
      lamp.rotation.y = Math.PI / 2;
      cabinet.add(lamp);
    }
    cabinet.position.set(-31.2 + index * 1.8, floorY, 0);
    group.add(cabinet);
  });

  const transformer = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 2.6, 18),
    materials.motorMetal
  );
  transformer.rotation.z = Math.PI / 2;
  transformer.position.set(-34.5, -4.9, 0);
  group.add(transformer);

  const busMaterial = new THREE.MeshBasicMaterial({
    color: 0x5feaff,
    transparent: true,
    opacity: 0.5,
    toneMapped: false
  });
  [0.55, 1.1, 1.65].forEach((offset) => {
    const bus = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.055, 6.2),
      busMaterial
    );
    bus.position.set(-29.8, -2.9 + offset * 0.3, 0);
    group.add(bus);
  });

  group.userData.componentId = 'battery-system';
  return {
    group,
    nodePosition: new THREE.Vector3(-31.4, -3.7, 0)
  };
}

/* -------------------------------------------------------------------------- */
/* 双电机 / 轴系 / 螺旋桨                                                        */
/* -------------------------------------------------------------------------- */
function buildPropulsion(materials) {
  const group = new THREE.Group();
  group.name = 'TwinScrewPropulsion';
  const propellers = [];
  const animatedMaterials = [];

  [-1, 1].forEach((side, index) => {
    const assembly = new THREE.Group();
    assembly.name = side > 0 ? 'StarboardPropulsion' : 'PortPropulsion';
    const z = side * 4.05;

    // 电机本体
    const motorBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 3.4, 22),
      materials.motorMetal
    );
    motorBody.rotation.z = Math.PI / 2;
    motorBody.position.set(-42.5, -3.0, z);
    motorBody.castShadow = true;
    assembly.add(motorBody);

    // 电机散热筋
    for (let i = 0; i < 8; i += 1) {
      const fin = new THREE.Mesh(
        new THREE.TorusGeometry(1.13, 0.035, 5, 24),
        materials.darkMetal
      );
      fin.rotation.y = Math.PI / 2;
      fin.position.set(-44 + i * 0.43, -3.0, z);
      assembly.add(fin);
    }

    // 电机端盖
    const endCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.02, 0.38, 20),
      materials.motorCopper
    );
    endCap.rotation.z = Math.PI / 2;
    endCap.position.set(-44.35, -3.0, z);
    assembly.add(endCap);

    const motorRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x5ddfff,
      transparent: true,
      opacity: 0.4,
      toneMapped: false
    });
    const motorRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.16, 0.025, 6, 36),
      motorRingMaterial
    );
    motorRing.rotation.y = Math.PI / 2;
    motorRing.position.set(-40.9, -3.0, z);
    assembly.add(motorRing);
    animatedMaterials.push(motorRingMaterial);

    const rearRing = motorRing.clone();
    rearRing.material = motorRingMaterial.clone();
    rearRing.position.x = -44.4;
    assembly.add(rearRing);
    animatedMaterials.push(rearRing.material);

    // 电机基座
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.45, 2.0),
      materials.darkMetal
    );
    base.position.set(-42.5, -4.25, z);
    assembly.add(base);

    // 齿轮箱 / 轴承箱（外观概念）
    const gearbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.6, 1.8),
      materials.motorMetal
    );
    gearbox.position.set(-45.3, -4.0, z);
    assembly.add(gearbox);

    // 轴系
    const shaftStart = new THREE.Vector3(-46.0, -4.35, z);
    const shaftEnd = new THREE.Vector3(-63.35, -4.7, z);
    const shaft = new THREE.Mesh(
      cylinderBetween(shaftStart, shaftEnd, 0.22, 12),
      materials.shaft
    );
    shaft.castShadow = true;
    assembly.add(shaft);

    const shaftGlow = new THREE.Mesh(
      cylinderBetween(
        shaftStart.clone().add(new THREE.Vector3(0, 0.26, 0)),
        shaftEnd.clone().add(new THREE.Vector3(0, 0.26, 0)),
        0.018,
        6
      ),
      new THREE.MeshBasicMaterial({
        color: 0xffb45c,
        transparent: true,
        opacity: 0.36,
        toneMapped: false
      })
    );
    assembly.add(shaftGlow);

    const bearing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.8, 14),
      materials.darkMetal
    );
    bearing.rotation.z = Math.PI / 2;
    bearing.position.set(-55.0, -4.42, z);
    assembly.add(bearing);

    // 艉轴支撑
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 3.0, 0.55),
      materials.hullRed
    );
    strut.position.set(-59.2, -5.7, z);
    strut.rotation.z = -0.35;
    assembly.add(strut);

    // 螺旋桨
    const propeller = new THREE.Group();
    propeller.position.set(-64.0, -4.7, z);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.48, 1.0, 16),
      materials.propeller
    );
    hub.rotation.z = Math.PI / 2;
    propeller.add(hub);

    const bladeGeometry = createPropellerBladeGeometry();
    for (let b = 0; b < 5; b += 1) {
      const blade = new THREE.Mesh(bladeGeometry, materials.propeller);
      blade.rotation.x = (b / 5) * Math.PI * 2;
      blade.castShadow = true;
      propeller.add(blade);
    }
    assembly.add(propeller);
    propellers.push({ group: propeller, speed: 2.9 + index * 0.25 });

    // 桨后导流锥
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.43, 1.1, 16),
      materials.propeller
    );
    cone.rotation.z = -Math.PI / 2;
    cone.position.set(-64.6, -4.7, z);
    assembly.add(cone);

    assembly.userData.componentId = 'propulsion';
    group.add(assembly);
  });

  // 概念轴隧支撑
  const tunnel = new THREE.Mesh(
    new THREE.BoxGeometry(23, 0.2, 11),
    materials.darkMetal
  );
  tunnel.position.set(-51, -5.0, 0);
  group.add(tunnel);

  group.userData.componentId = 'propulsion';
  return {
    group,
    propellers,
    animatedMaterials,
    motorPositions: [
      new THREE.Vector3(-42.5, -3, 4.05),
      new THREE.Vector3(-42.5, -3, -4.05)
    ],
    propPositions: [
      new THREE.Vector3(-64, -4.7, 4.05),
      new THREE.Vector3(-64, -4.7, -4.05)
    ]
  };
}

function createPropellerBladeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.22, 0);
  shape.bezierCurveTo(0.85, 0.23, 1.45, 0.78, 2.1, 0.64);
  shape.bezierCurveTo(2.5, 0.48, 2.38, -0.14, 1.85, -0.34);
  shape.bezierCurveTo(1.25, -0.54, 0.65, -0.35, 0.22, -0.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    steps: 1,
    curveSegments: 8
  });
  geometry.center();
  geometry.rotateX(Math.PI / 2);
  geometry.rotateY(0.32);
  return geometry;
}

/* -------------------------------------------------------------------------- */
/* 光伏 / 岸电概念层                                                            */
/* -------------------------------------------------------------------------- */
function buildPhotovoltaicConcepts(materials, textures) {
  const group = new THREE.Group();
  group.name = 'PhotovoltaicConcept';

  const panelMaterial = new THREE.MeshPhysicalMaterial({
    map: textures.solarTexture,
    color: 0x63a797,
    transparent: true,
    opacity: 0.46,
    metalness: 0.38,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.45
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x61d7ad,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const holoPostMaterial = new THREE.MeshBasicMaterial({
    color: 0x64d9c0,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    toneMapped: false
  });

  const definitions = [
    { x: 39.4, y: 13.18, z: 3.1, width: 7.2, depth: 2.8, angle: 0.04 },
    { x: 39.4, y: 13.18, z: -3.1, width: 7.2, depth: 2.8, angle: 0.04 },
    { x: -49.0, y: 12.0, z: 2.8, width: 6.4, depth: 2.4, angle: -0.03 },
    { x: -49.0, y: 12.0, z: -2.8, width: 6.4, depth: 2.4, angle: -0.03 }
  ];

  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  definitions.forEach((def, index) => {
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.scale.set(def.width, def.depth, 1);
    panel.rotation.x = -Math.PI / 2 + def.angle;
    panel.position.set(def.x, def.y + index * 0.002, def.z);
    group.add(panel);

    const outlineGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(def.width, def.depth));
    const outline = new THREE.LineSegments(outlineGeometry, materials.hologramEdge);
    outline.rotation.copy(panel.rotation);
    outline.position.copy(panel.position);
    group.add(outline);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(def.width, def.depth),
      glowMaterial
    );
    glow.rotation.copy(panel.rotation);
    glow.position.set(def.x, def.y - 0.32, def.z);
    group.add(glow);
  });

  // 概念安装支架：全息短线，不接触船体
  const legs = [
    [36.6, 12.55, 3.1],
    [42.2, 12.55, 3.1],
    [36.6, 12.55, -3.1],
    [42.2, 12.55, -3.1]
  ];
  legs.forEach(([x, y, z]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.9, 5),
      holoPostMaterial
    );
    post.position.set(x, y, z);
    group.add(post);
  });

  const scanLine = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2.6),
    new THREE.MeshBasicMaterial({
      color: 0x8fffe0,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
  scanLine.position.set(35.8, 13.25, 0);
  scanLine.rotation.y = Math.PI / 2;
  group.add(scanLine);

  group.userData.componentId = 'pv-system';

  function update(elapsed) {
    const span = 7.2;
    scanLine.position.x = 39.4 - span / 2 + ((elapsed * 1.2) % span);
    panelMaterial.opacity = 0.4 + Math.sin(elapsed * 1.3) * 0.04;
  }

  return {
    group,
    animatedMaterials: [glowMaterial],
    update,
    positions: [new THREE.Vector3(39.4, 13.45, 0), new THREE.Vector3(-49, 12.25, 0)]
  };
}

function buildShorePowerConcept(materials) {
  const group = new THREE.Group();
  group.name = 'ShorePowerConcept';
  const x = -28.5;
  const z = halfBeamAt(x) + 0.15;

  const hatch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.18, 26),
    materials.darkMetal
  );
  hatch.rotation.x = Math.PI / 2;
  hatch.position.set(x, 1.8, z);
  group.add(hatch);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x54e7ff,
    transparent: true,
    opacity: 0.4,
    toneMapped: false
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 28), glowMaterial);
  ring.position.set(x, 1.8, z + 0.1);
  group.add(ring);

  const socketA = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.3, 12),
    materials.motorCopper
  );
  socketA.rotation.x = Math.PI / 2;
  socketA.position.set(x - 0.24, 1.8, z + 0.12);
  group.add(socketA);
  const socketB = socketA.clone();
  socketB.position.x = x + 0.24;
  group.add(socketB);

  // 外接高压电缆：概念线缆，不代表实船接口位置
  const cablePoints = [
    new THREE.Vector3(x, 1.8, z + 0.1),
    new THREE.Vector3(x + 1.2, 2.8, z + 5.5),
    new THREE.Vector3(x + 2.5, 1.2, z + 10.5),
    new THREE.Vector3(x + 4.5, 0.4, z + 15.5)
  ];
  const cable = new THREE.Mesh(
    tubeGeometry(cablePoints, 0.06, 54, 6),
    new THREE.MeshStandardMaterial({
      color: 0x2a4140,
      metalness: 0.5,
      roughness: 0.45
    })
  );
  group.add(cable);

  const connector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.34, 0.55, 12),
    materials.darkMetal
  );
  connector.rotation.x = Math.PI / 2;
  connector.position.copy(cablePoints[cablePoints.length - 1]);
  group.add(connector);

  // 以漂浮的全息标记说明“岸电示意”，不营造真实码头设施
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.018, 6, 56),
    new THREE.MeshBasicMaterial({
      color: 0x54e7ff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.copy(cablePoints[cablePoints.length - 1]);
  group.add(halo);

  group.userData.componentId = 'shore-power';

  function update(elapsed) {
    glowMaterial.opacity = 0.34 + Math.sin(elapsed * 2.2) * 0.13;
    halo.rotation.z += 0.003;
  }

  return {
    group,
    update,
    animatedMaterials: [glowMaterial],
    portPosition: new THREE.Vector3(x, 1.8, z),
    cableEnd: cablePoints[cablePoints.length - 1]
  };
}

/* -------------------------------------------------------------------------- */
/* 能源流向示意                                                                 */
/* -------------------------------------------------------------------------- */
function buildEnergyFlows(materials, pv, shore) {
  const group = new THREE.Group();
  group.name = 'EnergyFlowLines';

  const nodes = {
    batteryBus: new THREE.Vector3(-11.5, 1.8, 0),
    ems: new THREE.Vector3(-31.2, -3.2, 0),
    motorPort: new THREE.Vector3(-42.5, -3.0, -4.05),
    motorStarboard: new THREE.Vector3(-42.5, -3.0, 4.05),
    propPort: new THREE.Vector3(-64, -4.7, -4.05),
    propStarboard: new THREE.Vector3(-64, -4.7, 4.05),
    pvForward: new THREE.Vector3(39.4, 13.4, 0),
    pvAft: new THREE.Vector3(-49, 12.25, 0),
    shore: shore.portPosition.clone()
  };

  const flowDefinitions = [
    {
      name: 'Battery → EMS',
      points: [
        nodes.batteryBus,
        new THREE.Vector3(-17, 0.4, 0),
        new THREE.Vector3(-25, -1.4, 0),
        nodes.ems
      ],
      material: new THREE.LineDashedMaterial({
        color: 0x59ffad,
        dashSize: 1.2,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0x59ffad,
      particleCount: 4
    },
    {
      name: 'EMS → Port motor',
      points: [
        nodes.ems,
        new THREE.Vector3(-36, -1.0, 1),
        nodes.motorPort
      ],
      material: new THREE.LineDashedMaterial({
        color: 0x5de0ff,
        dashSize: 1.2,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0x5de0ff,
      particleCount: 3
    },
    {
      name: 'EMS → Starboard motor',
      points: [
        nodes.ems,
        new THREE.Vector3(-36, -1.0, -1),
        nodes.motorStarboard
      ],
      material: new THREE.LineDashedMaterial({
        color: 0x5de0ff,
        dashSize: 1.2,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0x5de0ff,
      particleCount: 3
    },
    {
      name: 'Port motor → propeller',
      points: [
        nodes.motorPort,
        new THREE.Vector3(-54, -4.1, -4.05),
        nodes.propPort
      ],
      material: new THREE.LineDashedMaterial({
        color: 0xffc26e,
        dashSize: 0.9,
        gapSize: 0.7,
        transparent: true,
        opacity: 0.65,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0xffc26e,
      particleCount: 3
    },
    {
      name: 'Starboard motor → propeller',
      points: [
        nodes.motorStarboard,
        new THREE.Vector3(-54, -4.1, 4.05),
        nodes.propStarboard
      ],
      material: new THREE.LineDashedMaterial({
        color: 0xffc26e,
        dashSize: 0.9,
        gapSize: 0.7,
        transparent: true,
        opacity: 0.65,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0xffc26e,
      particleCount: 3
    },
    {
      name: 'PV → EMS',
      points: [
        nodes.pvForward,
        new THREE.Vector3(20, 13, 0),
        new THREE.Vector3(-8, 8, 0),
        nodes.ems
      ],
      material: new THREE.LineDashedMaterial({
        color: 0x8effba,
        dashSize: 1.3,
        gapSize: 1.4,
        transparent: true,
        opacity: 0.4,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0x8effba,
      particleCount: 2
    },
    {
      name: 'Shore power → battery',
      points: [
        nodes.shore,
        new THREE.Vector3(-23, 2.5, 7.0),
        new THREE.Vector3(-17, 2.0, 3.2),
        nodes.batteryBus
      ],
      material: new THREE.LineDashedMaterial({
        color: 0x52ddff,
        dashSize: 1.1,
        gapSize: 1.1,
        transparent: true,
        opacity: 0.46,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      }),
      color: 0x52ddff,
      particleCount: 3
    }
  ];

  const curves = [];
  const particles = [];
  flowDefinitions.forEach((definition) => {
    const curve = new THREE.CatmullRomCurve3(definition.points);
    curves.push(curve);
    const points = curve.getPoints(96);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, definition.material);
    line.computeLineDistances();
    line.renderOrder = 18;
    group.add(line);

    for (let i = 0; i < definition.particleCount; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6),
        new THREE.MeshBasicMaterial({
          color: definition.color,
          transparent: true,
          opacity: 0.9,
          toneMapped: false
        })
      );
      particle.userData.curve = curve;
      particle.userData.offset = i / definition.particleCount;
      particle.userData.speed = 0.055 + i * 0.007;
      particle.renderOrder = 19;
      group.add(particle);
      particles.push(particle);
    }
  });

  // EMS 中央节点
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0x68f4d0,
    transparent: true,
    opacity: 0.6,
    toneMapped: false
  });
  const emsNode = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), nodeMaterial);
  emsNode.position.copy(nodes.ems);
  group.add(emsNode);

  const emsHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.016, 6, 48),
    materials.hologramEdge
  );
  emsHalo.position.copy(nodes.ems);
  emsHalo.rotation.x = Math.PI / 2;
  group.add(emsHalo);

  function update(elapsed) {
    particles.forEach((particle) => {
      const progress = (elapsed * particle.userData.speed + particle.userData.offset) % 1;
      const point = particle.userData.curve.getPointAt(progress);
      particle.position.copy(point);
      const scale = 0.8 + Math.sin(elapsed * 5 + particle.userData.offset * 10) * 0.2;
      particle.scale.setScalar(scale);
    });
    emsHalo.rotation.z = elapsed * 0.25;
    emsHalo.scale.setScalar(1 + Math.sin(elapsed * 1.7) * 0.08);
  }

  group.userData.componentId = 'battery-system';
  return { group, update, nodes };
}
