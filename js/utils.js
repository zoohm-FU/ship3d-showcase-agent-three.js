/**
 * 几何与数学小工具
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;

export function smoothstep(min, max, value) {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** 以中心点为基准的圆角矩形点集 */
export function roundedRectPoints(width, depth, radius, { clockwise = false, segments = 5 } = {}) {
  const w = width / 2;
  const d = depth / 2;
  const r = Math.min(radius, w, d);
  const corners = [
    [w - r, -d + r, -Math.PI / 2],
    [w - r, d - r, 0],
    [-w + r, d - r, Math.PI / 2],
    [-w + r, -d + r, Math.PI]
  ];
  const points = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segments; i += 1) {
      const angle = start + (i / segments) * (Math.PI / 2);
      points.push(new THREE.Vector2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
  }
  return clockwise ? points.reverse() : points;
}

/**
 * 由平面轮廓生成垂直棱柱。
 * shape 的 y 轴映射到世界 -Z；extrude depth 映射到世界 +Y。
 */
export function prismFromPoints(points, height, material, { baseY = 0, holes = [] } = {}) {
  const shape = new THREE.Shape(points);
  if (holes.length) {
    holes.forEach((holePoints) => {
      shape.holes.push(new THREE.Path(holePoints));
    });
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 8
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, baseY, 0);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 将一组 Mesh 合并为单一几何体，减少 draw call */
export function mergeMeshes(meshes, material, { castShadow = true, receiveShadow = true } = {}) {
  if (!meshes.length) return null;
  const geometries = meshes.map((mesh) => {
    mesh.updateMatrix();
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrix);
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) return null;
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/** 生成两点间的圆柱体几何（用于栏杆、管路） */
export function cylinderBetween(start, end, radius, radialSegments = 6) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2
  );
  return geometry;
}

/** 管状曲线的几何封装 */
export function tubeGeometry(points, radius, tubularSegments = 60, radialSegments = 5, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.2);
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
}

/** 合并几何体列表 */
export function mergeGeometryList(list) {
  if (!list.length) return null;
  const merged = mergeGeometries(list, false);
  list.forEach((geometry) => geometry.dispose());
  return merged;
}

/** 通过水平剖面轮廓生成封闭船体几何 */
export function loftHull(stations, ringSize) {
  const positions = [];
  const indicesByMaterial = [[], [], []]; // green, red, boot
  const vertexIndex = new Map();

  stations.forEach((station) => {
    station.ring.forEach((point) => {
      positions.push(point.x, point.y, point.z);
    });
  });

  const getIndex = (stationIndex, ringIndex) => stationIndex * ringSize + ringIndex;

  for (let i = 0; i < stations.length - 1; i += 1) {
    for (let j = 0; j < ringSize; j += 1) {
      const nextJ = (j + 1) % ringSize;
      // 甲板顶边不封闭：ring 的头尾是左右舷甲板点，由甲板面负责封闭
      if (j === ringSize - 1) continue;

      const a = getIndex(i, j);
      const b = getIndex(i + 1, j);
      const c = getIndex(i + 1, nextJ);
      const d = getIndex(i, nextJ);

      const averageY = (
        positions[a * 3 + 1] +
        positions[b * 3 + 1] +
        positions[c * 3 + 1] +
        positions[d * 3 + 1]
      ) / 4;

      const target =
        averageY < 1.12
          ? indicesByMaterial[1]
          : averageY < 1.34
            ? indicesByMaterial[2]
            : indicesByMaterial[0];

      target.push(a, b, c, a, c, d);
    }
  }

  const indices = [
    ...indicesByMaterial[0],
    ...indicesByMaterial[1],
    ...indicesByMaterial[2]
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.addGroup(0, indicesByMaterial[0].length, 0);
  geometry.addGroup(indicesByMaterial[0].length, indicesByMaterial[1].length, 1);
  geometry.addGroup(
    indicesByMaterial[0].length + indicesByMaterial[1].length,
    indicesByMaterial[2].length,
    2
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** 构建物体的包围框中心点 */
export function getObjectCenter(object) {
  const box = new THREE.Box3().setFromObject(object);
  return box.getCenter(new THREE.Vector3());
}

export function createDashLine(points, material, dashSize = 1, gapSize = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}
