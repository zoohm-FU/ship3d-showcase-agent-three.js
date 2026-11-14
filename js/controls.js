/**
 * 相机导演
 * - OrbitControls 自由旋转 / 缩放
 * - 预设机位平滑切换
 * - 自动环视状态
 * - 竖屏自适应构图
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { easeInOutCubic } from './utils.js';

export const VIEW_PRESETS = {
  perspective: {
    id: 'perspective',
    label: '45° 透视',
    position: [146, 44, 153],
    target: [0, 9, 0]
  },
  front: {
    id: 'front',
    label: '正视',
    position: [176, 20, 0.1],
    target: [0, 10, 0]
  },
  side: {
    id: 'side',
    label: '侧视',
    position: [0.1, 28, 288],
    target: [0, 10, 0]
  },
  top: {
    id: 'top',
    label: '俯视',
    position: [0.1, 285, 8],
    target: [0, 4, 0]
  },
  structure: {
    id: 'structure',
    label: '结构解析',
    position: [128, 56, 154],
    target: [0, 5, 0]
  },
  energy: {
    id: 'energy',
    label: '能源系统',
    position: [122, 74, 145],
    target: [0, 3, 0]
  },
  technical: {
    id: 'technical',
    label: '技术参数',
    position: [150, 62, 160],
    target: [0, 9, 0]
  },
  'battery-focus': {
    id: 'battery-focus',
    label: '电池舱特写',
    position: [30, 38, 68],
    target: [-11, 2, 0]
  },
  'propulsion-focus': {
    id: 'propulsion-focus',
    label: '推进系统特写',
    position: [-108, 22, 52],
    target: [-53, -1.5, 0]
  }
};

export class CameraDirector {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.autoRotate = false;
    this._transition = null;
    this._autoListeners = new Set();
    this._interactionListeners = new Set();
    this._viewListeners = new Set();

    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.58;
    this.controls.zoomSpeed = 0.72;
    this.controls.minDistance = 72;
    this.controls.maxDistance = 520;
    this.controls.minPolarAngle = 0.045;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.36;
    this.controls.target.set(0, 9, 0);

    const preset = this.resolvePreset('perspective');
    camera.position.copy(preset.position);
    this.controls.target.copy(preset.target);
    camera.lookAt(this.controls.target);
    this.controls.update();

    this._interrupt = this._interrupt.bind(this);
    domElement.addEventListener('pointerdown', this._interrupt, { capture: true, passive: true });
    domElement.addEventListener('wheel', this._interrupt, { capture: true, passive: true });
  }

  getFramingScale() {
    const aspect = this.camera.aspect;
    if (aspect < 0.68) return 1.42;
    if (aspect < 0.92) return 1.24;
    if (aspect < 1.16) return 1.08;
    return 1;
  }

  resolvePreset(name) {
    const preset = VIEW_PRESETS[name] || VIEW_PRESETS.perspective;
    const target = new THREE.Vector3(...preset.target);
    const position = new THREE.Vector3(...preset.position);
    const scale = this.getFramingScale();
    position.sub(target).multiplyScalar(scale).add(target);
    return { position, target, preset };
  }

  flyTo(name, { duration = 1.5, stopAuto = true, notifyView = true } = {}) {
    if (!VIEW_PRESETS[name]) return false;
    if (stopAuto && this.autoRotate) this.setAutoRotate(false);

    const resolved = this.resolvePreset(name);
    this._transition = {
      elapsed: 0,
      duration,
      fromPosition: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      toPosition: resolved.position,
      toTarget: resolved.target
    };
    this.controls.enabled = false;

    if (notifyView) {
      this._viewListeners.forEach((callback) => callback(name));
    }
    return true;
  }

  intro() {
    const preset = this.resolvePreset('perspective');
    const start = preset.position.clone().sub(preset.target).multiplyScalar(1.14).add(preset.target);
    start.y += 4;
    this.camera.position.copy(start);
    this.controls.target.copy(preset.target);
    this._transition = null;
    this.controls.enabled = false;
    this.flyTo('perspective', { duration: 2.6, stopAuto: false, notifyView: false });
  }

  reset() {
    this.setAutoRotate(false);
    return this.flyTo('perspective', { duration: 1.25, stopAuto: false });
  }

  setAutoRotate(enabled) {
    const next = Boolean(enabled);
    if (next === this.autoRotate) return;
    this.autoRotate = next;
    this.controls.autoRotate = next;
    if (next) this.cancelTransition();
    this._autoListeners.forEach((callback) => callback(next));
  }

  toggleAutoRotate() {
    this.setAutoRotate(!this.autoRotate);
    return this.autoRotate;
  }

  cancelTransition() {
    if (!this._transition) {
      this.controls.enabled = true;
      return;
    }
    this._transition = null;
    this.controls.enabled = true;
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  _interrupt() {
    this._interactionListeners.forEach((callback) => callback());
    if (this._transition) this.cancelTransition();
  }

  onAutoRotateChange(callback) {
    this._autoListeners.add(callback);
    return () => this._autoListeners.delete(callback);
  }

  onInteraction(callback) {
    this._interactionListeners.add(callback);
    return () => this._interactionListeners.delete(callback);
  }

  onViewChange(callback) {
    this._viewListeners.add(callback);
    return () => this._viewListeners.delete(callback);
  }

  update(delta) {
    if (this._transition) {
      const transition = this._transition;
      transition.elapsed += delta;
      const progress = Math.min(1, transition.elapsed / transition.duration);
      const eased = easeInOutCubic(progress);

      this.camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      this.controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      this.camera.lookAt(this.controls.target);

      if (progress >= 1) {
        this._transition = null;
        this.controls.enabled = true;

        // 清空上一次自动旋转/阻尼留下的残量，确保预设机位精准
        this.controls.enableDamping = false;
        this.controls.update();
        this.controls.enableDamping = true;
        this.camera.position.copy(transition.toPosition);
        this.controls.target.copy(transition.toTarget);
        this.camera.lookAt(this.controls.target);
      }
      return;
    }

    this.controls.update();
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this._interrupt, true);
    this.domElement.removeEventListener('wheel', this._interrupt, true);
    this.controls.dispose();
  }
}
