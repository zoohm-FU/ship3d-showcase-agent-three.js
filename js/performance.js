/**
 * 性能管理器
 * - 实时 FPS / Draw Calls / Triangles / Geometries / Textures
 * - AUTO / HIGH / BALANCED / PERFORMANCE 四档渲染质量
 * - 自动降档：只降低特效与采样成本，不隐藏整船、不暂停动画、不虚报帧率
 */
export const QUALITY_PROFILES = {
  high: {
    id: 'high',
    label: 'HIGH',
    fullLabel: '高画质',
    maxPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    bloomStrength: 0.3,
    composer: true,
    waterDetail: 1,
    detailLevel: 2
  },
  balanced: {
    id: 'balanced',
    label: 'BALANCED',
    fullLabel: '均衡',
    maxPixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    bloomStrength: 0.2,
    composer: true,
    waterDetail: 0.68,
    detailLevel: 1
  },
  performance: {
    id: 'performance',
    label: 'PERF',
    fullLabel: '性能优先',
    maxPixelRatio: Math.min(window.devicePixelRatio || 1, 1),
    shadows: false,
    shadowMapSize: 1024,
    bloom: false,
    bloomStrength: 0,
    composer: false,
    waterDetail: 0.34,
    detailLevel: 0
  }
};

const QUALITY_ORDER = ['auto', 'high', 'balanced', 'performance'];

export class PerformanceManager {
  constructor({ stage, onStats, onQualityChange, onDetailLevel } = {}) {
    this.stage = stage;
    this.onStats = onStats;
    this.onQualityChange = onQualityChange;
    this.onDetailLevel = onDetailLevel;

    this.mode = 'auto';
    this.activeProfile = this.resolveAutoProfile();
    this.frameCount = 0;
    this.sampleStartedAt = performance.now();
    this.startedAt = performance.now();
    this.fpsHistory = [];
    this.lowStreak = 0;
    this.highStreak = 0;
    this.lastDowngradeAt = 0;
    this.stats = {
      fps: 0,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      quality: this.activeProfile.id,
      mode: this.mode
    };
    this.applyProfile(this.activeProfile, false);
  }

  resolveAutoProfile() {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;
    if (coarse && (cores < 8 || memory < 6)) return QUALITY_PROFILES.balanced;
    if (window.innerWidth < 1200) return QUALITY_PROFILES.balanced;
    return QUALITY_PROFILES.high;
  }

  getCurrentProfile() {
    return this.activeProfile;
  }

  setMode(mode) {
    if (!QUALITY_ORDER.includes(mode)) return;
    this.mode = mode;
    if (mode === 'auto') {
      const profile = this.resolveAutoProfile();
      this.applyProfile(profile, true);
    } else {
      this.applyProfile(QUALITY_PROFILES[mode], true);
    }
    this.lowStreak = 0;
    this.highStreak = 0;
  }

  cycleMode() {
    const index = QUALITY_ORDER.indexOf(this.mode);
    const next = QUALITY_ORDER[(index + 1) % QUALITY_ORDER.length];
    this.setMode(next);
    return this.mode;
  }

  applyProfile(profile, notify = true) {
    this.activeProfile = profile;
    this.stage.applyQuality(profile);
    this.onDetailLevel?.(profile.detailLevel);
    if (notify) {
      this.onQualityChange?.({
        mode: this.mode,
        profile,
        label: this.mode === 'auto' ? 'AUTO' : profile.label
      });
    }
  }

  /**
   * 在每帧渲染之后调用。
   * @param {number} now performance.now()
   */
  frame(now = performance.now()) {
    this.frameCount += 1;
    const elapsed = now - this.sampleStartedAt;
    if (elapsed < 650) return;

    const fps = (this.frameCount * 1000) / elapsed;
    this.frameCount = 0;
    this.sampleStartedAt = now;

    const info = this.stage.renderer.info;
    this.stats = {
      fps,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      quality: this.activeProfile.id,
      mode: this.mode
    };
    this.onStats?.(this.stats);

    // 自动模式：稳定运行后，如果持续低于目标帧率则分档降低渲染成本
    if (this.mode === 'auto' && now - this.startedAt > 2400) {
      this.observeAutoQuality(fps, now);
    }
  }

  observeAutoQuality(fps, now) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 16) this.fpsHistory.shift();

    if (fps < 48) {
      this.lowStreak += 1;
      this.highStreak = 0;
    } else if (fps > 57) {
      this.highStreak += 1;
      this.lowStreak = 0;
    } else {
      this.lowStreak = 0;
      this.highStreak = 0;
    }

    if (this.lowStreak >= 3 && this.activeProfile.id !== 'performance') {
      const nextProfile =
        this.activeProfile.id === 'high'
          ? QUALITY_PROFILES.balanced
          : QUALITY_PROFILES.performance;
      this.applyProfile(nextProfile, false);
      this.lowStreak = 0;
      this.lastDowngradeAt = now;
      this.onQualityChange?.({
        mode: this.mode,
        profile: nextProfile,
        label: `AUTO · ${nextProfile.label}`,
        autoAdjusted: true
      });
    }

    // 若设备恢复且有足够长的稳定窗口，自动模式最多回升一档，避免来回震荡
    if (
      this.highStreak >= 12 &&
      now - this.lastDowngradeAt > 18000 &&
      this.activeProfile.id === 'performance'
    ) {
      this.applyProfile(QUALITY_PROFILES.balanced, false);
      this.highStreak = 0;
      this.onQualityChange?.({
        mode: this.mode,
        profile: QUALITY_PROFILES.balanced,
        label: 'AUTO · BALANCED',
        autoAdjusted: true
      });
    }
  }

  getStats() {
    return { ...this.stats, mode: this.mode, profile: this.activeProfile.id };
  }
}

export function formatCompact(value) {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}
