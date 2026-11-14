/**
 * SHIP 3D V3 UI 控制层
 * - 四模式切换、部件详情、来源与数据分级
 * - HTML 热点投影、技术尺寸标注
 * - 移动端抽屉、加载层、性能 HUD
 */
import * as THREE from 'three';
import {
  SHIP,
  SPECS,
  SOURCES,
  SOURCE_TIERS,
  COMPONENTS,
  MODES,
  ENERGY_FLOW,
  METRIC_BADGES
} from './data.js';
import { formatCompact } from './performance.js';

const LABEL_MODES = {
  exterior: ['forward-house', 'cargo-hold', 'aft-house'],
  structure: ['battery-system', 'propulsion'],
  energy: ['battery-system', 'pv-system', 'shore-power'],
  technical: []
};

const ENERGY_COMPONENT_MAP = {
  battery: 'battery-system',
  ems: 'battery-system',
  motors: 'propulsion',
  props: 'propulsion',
  pv: 'pv-system',
  shore: 'shore-power'
};

const VIEW_LABELS = {
  perspective: '45° 透视',
  front: '正视',
  side: '侧视',
  top: '俯视'
};

export class UI {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.ship = null;
    this.mode = 'exterior';
    this.activeView = 'perspective';
    this.autoRotate = false;
    this.selectedComponentId = null;
    this.hotspots = [];
    this.dimensionLabels = [];
    this.mobilePanel = null;
    this.toastTimer = 0;
    this.metricsAnimated = false;

    this.el = {
      app: document.querySelector('#app'),
      loader: document.querySelector('#loader'),
      loaderBar: document.querySelector('#loader-bar'),
      loaderPercent: document.querySelector('#loader-percent'),
      loaderStatus: document.querySelector('#loader-status'),
      fatal: document.querySelector('#fatal-error'),
      fatalMessage: document.querySelector('#fatal-message'),
      modeButtons: Array.from(document.querySelectorAll('.mode-btn[data-mode]')),
      cameraButtons: Array.from(document.querySelectorAll('.camera-key[data-view]')),
      autoButton: document.querySelector('#auto-orbit'),
      resetButton: document.querySelector('#reset-camera'),
      qualityButton: document.querySelector('#quality-cycle'),
      brand: document.querySelector('#brand-home'),
      keyMetrics: document.querySelector('#key-metrics'),
      dossierFacts: document.querySelector('#dossier-facts'),
      contextBody: document.querySelector('#context-body'),
      contextPanel: document.querySelector('#context-panel'),
      profilePanel: document.querySelector('#profile-panel'),
      hotspots: document.querySelector('#hotspot-layer'),
      dimensions: document.querySelector('#dimension-layer'),
      banner: document.querySelector('#mode-banner'),
      bannerNo: document.querySelector('#mode-banner-no'),
      bannerEn: document.querySelector('#mode-banner-en'),
      bannerZh: document.querySelector('#mode-banner-zh'),
      toast: document.querySelector('#data-toast'),
      sourceDialog: document.querySelector('#source-dialog'),
      sourceBody: document.querySelector('#source-dialog-body'),
      openSources: Array.from(document.querySelectorAll('.js-open-sources')),
      mobileOpen: Array.from(document.querySelectorAll('[data-open-panel]')),
      mobileScrim: document.querySelector('#mobile-scrim'),
      stats: {
        fps: document.querySelector('#stat-fps'),
        draw: document.querySelector('#stat-draw'),
        tri: document.querySelector('#stat-tri'),
        geo: document.querySelector('#stat-geo'),
        tex: document.querySelector('#stat-tex')
      }
    };

    this.renderProfile();
    this.renderSources();
    this.bindStaticEvents();
    this.setMode('exterior');
    this.setActiveView('perspective');
    this.setQuality({ mode: 'auto', profile: { fullLabel: '自动' }, label: 'AUTO' });
  }

  /* ---------------------------------------------------------------------- */
  /* 数据渲染                                                                */
  /* ---------------------------------------------------------------------- */
  renderProfile() {
    const featured = SPECS.filter((spec) => spec.featured);
    this.el.keyMetrics.innerHTML = featured
      .map(
        (spec) => `
          <div class="metric">
            <div class="metric__top">
              <span>${spec.label}</span>
              <i class="tier-dot tier-dot--${spec.tier.toLowerCase()}" title="${SOURCE_TIERS[spec.tier].label}"></i>
            </div>
            <div class="metric__value">
              <span data-count="${spec.value}" data-display="${spec.display || ''}" data-decimals="${spec.decimals}">${spec.display || spec.value.toFixed(spec.decimals)}</span><small>${spec.unit}</small>
            </div>
            <div class="metric__en">${spec.en}</div>
          </div>
        `
      )
      .join('');

    this.el.dossierFacts.innerHTML = `
      <dl class="dossier-fact"><dt>船型</dt><dd>${SHIP.typeZh}</dd></dl>
      <dl class="dossier-fact"><dt>运营方</dt><dd>${SHIP.operator}</dd></dl>
      <dl class="dossier-fact"><dt>建造方</dt><dd>${SHIP.builder}</dd></dl>
      <dl class="dossier-fact"><dt>入级</dt><dd>${SHIP.classSociety}</dd></dl>
      <dl class="dossier-fact"><dt>首航</dt><dd>${SHIP.maidenVoyage} · ${SHIP.route}</dd></dl>
    `;
  }

  renderSources() {
    const tierCards = Object.values(SOURCE_TIERS)
      .map(
        (tier) => `
          <article class="source-tier-card">
            <span class="tier-chip ${tier.className}">${tier.id} / ${tier.label}</span>
            <h3>${tier.en}</h3>
            <p>${tier.description}</p>
          </article>
        `
      )
      .join('');

    const gallery = [
      ['ship-bow-aerial.png', '艏部全包裹绿色结构 / 白色桥楼 / 顶面 NBOSCO（新华网图，项目方提供）'],
      ['ship-stern-view.webp', '艉部绿色甲板室 / 屋顶光伏 / 甲板室紧贴艉端（视频截图，项目方提供）'],
      ['ship-loaded-side.jpg', '满载侧面 / 蓝色集装箱为运营箱，不是电池箱'],
      ['ship-bow-quarter.png', '艏部驾驶楼 / 绿色船体 / 暗红防污底 / 船名'],
      ['ship-side-yard.webp', '侧视全船 / 敞开货舱 / 艏艉双岛式外观'],
      ['ship-side-empty.webp', '侧视空载状态 / 甲板栏杆与箱区设备'],
      ['ship-loaded-quarter.webp', '装载状态参考 / 蓝色集装箱（非电池箱）']
    ]
      .map(
        ([file, caption]) => `
          <figure>
            <img src="./assets/reference/${file}" alt="${caption}" loading="eager" />
            <figcaption>${caption}</figcaption>
          </figure>
        `
      )
      .join('');

    const sourceEntries = SOURCES.map(
      (source) => `
        <article class="source-entry">
          <div class="source-entry__tier">
            <span class="tier-chip tier-${source.tier.toLowerCase()}">${source.tier}</span>
          </div>
          <div class="source-entry__main">
            <h3>${source.title}</h3>
            <p>${source.publisher} · ${source.date}</p>
            ${
              source.url
                ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">打开原始来源 ↗</a>`
                : '<span class="source-entry__internal">项目内提供 / 无外链</span>'
            }
          </div>
          <div class="source-entry__used">
            <b>USED FOR / 用于支持</b>
            ${source.usedFor.join('<br />')}
          </div>
        </article>
      `
    ).join('');

    this.el.sourceBody.innerHTML = `
      <section class="source-section">
        <div class="source-section__title">SOURCE TIER DEFINITION / 来源分级<span>4 LEVELS</span></div>
        <div class="source-tier-grid">${tierCards}</div>
      </section>

      <section class="source-section">
        <div class="source-section__title">REFERENCE PHOTOS / 项目方提供外观参考<span>7 IMAGES / APPEARANCE REFERENCE</span></div>
        <div class="source-gallery">${gallery}</div>
      </section>

      <section class="source-section">
        <div class="source-section__title">PUBLIC SOURCES / 可追溯公开来源<span>ACCESSED 2026-11-14</span></div>
        <div class="source-list">${sourceEntries}</div>
      </section>

      <section class="source-section">
        <div class="source-section__title">MODEL BOUNDARY / 模型边界<span>NOT A SHIP DRAWING</span></div>
        <div class="source-boundary">
          <div>
            <h4>WHAT IS RECONSTRUCTED</h4>
            <p>船体曲面、绿色/暗红涂装分界、艏部驾驶楼、艉部甲板室、桅杆、栏杆、甲板箱格与设备形态，均基于照片外观和主尺度进行视觉重建。</p>
          </div>
          <div>
            <h4>WHAT IS CONCEPTUAL</h4>
            <p>电池舱内部排布、EMS 柜位、电机/轴系细节、光伏安装位置、岸电接口、能源流线均为系统原理示意。为便于观察，10 箱电池在模型中放在敞口货舱内，不代表实船舱位；这些内容不能用于工程判断。</p>
          </div>
          <div>
            <h4>PARAMETER CONFLICT</h4>
            <p>CCS 公布 740 个 20 英尺箱位，部分媒体写作 742；本项目采用 CCS 口径。型深 10.5 m 来自媒体整理，仍需原始资料复核。</p>
          </div>
          <div>
            <h4>NOT REAL-TIME</h4>
            <p>能源流与设备状态只表达动力架构逻辑。页面没有接入实船遥测，不展示虚构的实时 SOC、功率或航行数据。</p>
          </div>
        </div>
        <div class="source-model">
          <div>
            <h4>STATIC GLB / 静态模型文件</h4>
            <p>由当前外观模型导出的 GLB（约 2.43 MB），米制坐标，设计水线位于 y = 0；实例化构件已烘焙为普通网格。仅包含外观结构，不包含概念能源层、交互标签或尺寸线。</p>
          </div>
          <a href="./models/ningyuan-diankun.glb" download>下载 GLB 模型 ↓</a>
        </div>
      </section>
    `;
  }

  attachShip(ship) {
    this.ship = ship;
    this.buildHotspots();
    this.buildDimensionLabels();
  }

  buildHotspots() {
    if (!this.ship) return;
    this.el.hotspots.innerHTML = '';
    this.hotspots = COMPONENTS.map((component) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'hotspot';
      element.dataset.component = component.id;
      element.innerHTML = `
        <span class="hotspot__pin">${component.index}</span>
        <span class="hotspot__leader" aria-hidden="true"></span>
        <span class="hotspot__label">
          <em>${component.category}</em>
          <b>${component.name}</b>
          <small>${component.en}</small>
        </span>
      `;
      element.setAttribute('aria-label', `选择部件：${component.name}`);
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        this.handleComponentSelection(component.id);
      });
      this.el.hotspots.appendChild(element);
      return {
        element,
        component,
        anchor: new THREE.Vector3(...component.anchor)
      };
    });
    this.updateHotspotMode();
  }

  buildDimensionLabels() {
    if (!this.ship) return;
    this.el.dimensions.innerHTML = '';
    this.dimensionLabels = this.ship.dimensionLabels.map((entry) => {
      const element = document.createElement('div');
      element.className = 'dimension-label';
      element.innerHTML = `<b>${entry.text}</b>`;
      this.el.dimensions.appendChild(element);
      return { element, entry };
    });
    this.setDimensionVisibility(false);
  }

  setDimensionVisibility(visible) {
    this.dimensionLabels.forEach(({ element }) => {
      element.hidden = !visible;
      if (!visible) element.classList.remove('is-visible');
    });
  }

  updateHotspotMode() {
    const visibleIds = LABEL_MODES[this.mode] || [];
    this.hotspots.forEach(({ element, component }) => {
      element.hidden = !visibleIds.includes(component.id);
      element.classList.toggle('is-active', this.selectedComponentId === component.id);
    });
  }

  /**
   * 每帧根据相机投影更新 HTML 热点与尺寸标签。
   */
  updateOverlays(camera) {
    if (!this.ship) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.mode !== 'technical') {
      const temp = new THREE.Vector3();
      this.hotspots.forEach(({ element, component, anchor }) => {
        if (element.hidden) return;
        temp.copy(anchor);
        this.ship.floatGroup.localToWorld(temp);
        temp.project(camera);

        const x = (temp.x * 0.5 + 0.5) * width;
        const y = (-temp.y * 0.5 + 0.5) * height;
        const visible =
          temp.z < 1 &&
          x > 28 &&
          x < width - 28 &&
          y > 108 &&
          y < height - 94;

        element.classList.toggle('is-visible', visible);
        if (visible) {
          element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          element.classList.toggle('is-flipped', x > width * 0.61);
        }
      });
    }

    if (this.mode === 'technical' && this.ship.dimensionGroup.group.visible) {
      const temp = new THREE.Vector3();
      this.dimensionLabels.forEach(({ element, entry }) => {
        temp.copy(entry.position);
        this.ship.root.localToWorld(temp);
        temp.project(camera);
        const x = (temp.x * 0.5 + 0.5) * width;
        const y = (-temp.y * 0.5 + 0.5) * height;
        const visible = temp.z < 1 && x > 0 && x < width && y > 90 && y < height - 70;
        element.classList.toggle('is-visible', visible);
        if (visible) element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 模式与面板                                                              */
  /* ---------------------------------------------------------------------- */
  setMode(mode) {
    if (!MODES.find((item) => item.id === mode)) return;
    this.mode = mode;
    this.selectedComponentId = null;
    this.el.app.dataset.mode = mode;
    this.el.modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    });

    const meta = MODES.find((item) => item.id === mode);
    this.el.bannerNo.textContent = meta.index;
    this.el.bannerEn.textContent = meta.en;
    this.el.bannerZh.textContent = meta.label;

    this.renderContext();
    this.updateHotspotMode();
    this.setDimensionVisibility(mode === 'technical');
    this.closeMobilePanel();
    this.animateBanner();
  }

  animateBanner() {
    if (!this.el.banner.animate) return;
    this.el.banner.animate(
      [
        { opacity: 0, transform: 'translate(-50%, 8px)' },
        { opacity: 0.82, transform: 'translate(-50%, 0)' }
      ],
      { duration: 520, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'both' }
    );
  }

  renderContext() {
    if (this.mode === 'exterior') {
      this.el.contextBody.innerHTML = this.exteriorContext();
    } else if (this.mode === 'structure') {
      this.el.contextBody.innerHTML = this.structureContext();
    } else if (this.mode === 'energy') {
      this.el.contextBody.innerHTML = this.energyContext();
    } else {
      this.el.contextBody.innerHTML = this.technicalContext();
    }
  }

  exteriorContext() {
    const components = this.componentsForMode('exterior');
    return `
      <div class="context-head">
        <span class="context-mode-no">MODE 01</span>
        <span class="context-mode-en">EXTERIOR / PHOTO MATCH</span>
        <span class="tier-chip tier-m context-badge">RECONSTRUCTED</span>
      </div>
      <div class="context-title">
        <h2>实船外观重建</h2>
        <span>7 REFERENCE IMAGES</span>
      </div>
      <p class="context-caption">
        按项目方提供照片还原绿色上船体、暗红防污底、艏部全包裹驾驶楼、敞开式货舱与紧贴艉端的绿色甲板室。
      </p>

      <div class="feature-block">
        <div class="feature-block__top"><span>EXTERIOR SIGNATURE</span><b>PHOTO-BASED / M</b></div>
        <p>绿色艏部结构从船艏包覆至白色桥楼下部；艉部为紧贴艉端的绿色甲板室，顶部布置光伏与设备塔。</p>
      </div>

      <div class="observation-list">
        <div><span>BOW / 艏部</span><b>全包裹绿色艏部 + 白色桥楼</b></div>
        <div><span>STERN / 艉部</span><b>绿色甲板室贴合艉端</b></div>
        <div><span>CARGO / 货区</span><b>无舱盖敞开式箱位</b></div>
        <div><span>SOLAR / 光伏</span><b>艉部顶面光伏阵列</b></div>
      </div>

      <div class="hairline"></div>
      <div class="section-label">OBSERVED COMPONENTS<span>点击查看档案</span></div>
      ${this.componentListHTML(components)}
      ${this.componentDetailHTML()}

      <div class="tech-actions">
        <button type="button" class="outline-btn" data-context-action="sources">参考照片 / 数据来源</button>
        <button type="button" class="outline-btn" data-context-action="reset-view">默认视角</button>
      </div>

      <div class="context-footer">
        <span>BOUNDARY</span>
        <p>当前外观为照片视觉重建，不是官方 CAD、线型图或完工模型。仪表/舱室内部不可见部分不做实船声称。</p>
      </div>
    `;
  }

  structureContext() {
    const components = this.componentsForMode('structure');
    return `
      <div class="context-head">
        <span class="context-mode-no">MODE 02</span>
        <span class="context-mode-en">STRUCTURE / X-RAY</span>
        <span class="tier-chip tier-m context-badge">CONCEPT CUTAWAY</span>
      </div>
      <div class="context-title">
        <h2>结构解析</h2>
        <span>SELECT COMPONENT</span>
      </div>
      <p class="context-caption">
        船体外壳半透明化，显示甲板箱格、10 箱电池概念阵列与双机推进区域。点击模型或下方列表查看部件档案。
      </p>

      <div class="feature-block">
        <div class="feature-block__top"><span>MODEL LAYERS</span><b>X-RAY / M</b></div>
        <p>浅绿色结构线为船体横剖/纵剖辅助线；内部设备位置属于系统演示布置，不是实船舱室图。</p>
      </div>

      <div class="section-label">VERTICAL LAYERS<span>概念层位</span></div>
      <div class="deck-stack">
        <div class="deck-stack__row">
          <span class="deck-stack__elev">+04.0 m</span>
          <b>主甲板</b>
          <em>MAIN DECK</em>
        </div>
        <div class="deck-stack__row is-concept">
          <span class="deck-stack__elev">+01.35 m</span>
          <b>电池概念层</b>
          <em>BESS / M</em>
        </div>
        <div class="deck-stack__row">
          <span class="deck-stack__elev">−03.70 m</span>
          <b>货舱底</b>
          <em>TANK TOP</em>
        </div>
        <div class="deck-stack__row is-concept">
          <span class="deck-stack__elev">−04.7 m</span>
          <b>推进轴系层</b>
          <em>SHAFT / M</em>
        </div>
      </div>

      <div class="focus-actions">
        <button type="button" class="outline-btn" data-context-action="focus-battery">聚焦 10× 电池</button>
        <button type="button" class="outline-btn" data-context-action="focus-propulsion">聚焦电力推进</button>
        <button type="button" class="outline-btn focus-actions__wide" data-context-action="focus-overview">返回全景视角</button>
      </div>

      <div class="section-label">COMPONENT INDEX<span>${components.length} ITEMS</span></div>
      ${this.componentListHTML(components)}
      ${this.componentDetailHTML()}

      <div class="caution-box">
        <span>NOTE</span>
        <p>未公开的内部结构被明确作为概念可视化处理；点选桥楼、货舱、艉部甲板室时展示的是照片可见外观信息。</p>
      </div>
    `;
  }

  energyContext() {
    const components = this.componentsForMode('energy');
    const chain = ENERGY_FLOW.filter((node) => ['battery', 'ems', 'motors', 'props'].includes(node.id));
    const inputs = ENERGY_FLOW.filter((node) => ['pv', 'shore'].includes(node.id));

    return `
      <div class="context-head">
        <span class="context-mode-no">MODE 03</span>
        <span class="context-mode-en">ENERGY / SYSTEM SCHEMATIC</span>
        <span class="tier-chip tier-m context-badge">SYSTEM CONCEPT</span>
      </div>
      <div class="context-title">
        <h2>能源系统</h2>
        <span>NOT REAL-TIME</span>
      </div>
      <p class="context-caption">
        纯电动力链示意：箱式电池 → 能量管理/配电 → 双机推进 → 双桨。高压岸电与光伏为补能输入。
      </p>

      <div class="feature-block">
        <div class="feature-block__top"><span>VERIFIED SYSTEM FACTS</span><b>CCS / PUBLIC</b></div>
        <p>10 个箱式电池 · 约 2 万千瓦时 · 高压岸电充电 + 吊装换电 · 双机双桨 · 配备光伏。</p>
      </div>

      <div class="section-label">MAIN POWERTRAIN<span>点击节点定位</span></div>
      <div class="energy-chain">
        ${chain
          .map(
            (node, index) => `
              ${index > 0 ? '<span class="energy-connector" aria-hidden="true"></span>' : ''}
              ${this.energyNodeHTML(node)}
            `
          )
          .join('')}
      </div>

      <div class="section-label">ENERGY INPUTS<span>CHARGING / SOLAR</span></div>
      <div class="energy-chain">
        ${inputs.map((node) => this.energyNodeHTML(node)).join('')}
      </div>

      <div class="energy-legend">
        <span><i></i>电池储能</span>
        <span><i></i>配电/控制</span>
        <span><i></i>推进输出</span>
        <span><i></i>光伏/岸电</span>
      </div>

      <div class="focus-actions">
        <button type="button" class="outline-btn" data-context-action="focus-battery">聚焦 10× 电池</button>
        <button type="button" class="outline-btn" data-context-action="focus-propulsion">聚焦电力推进</button>
        <button type="button" class="outline-btn focus-actions__wide" data-context-action="focus-overview">返回全景视角</button>
      </div>

      ${this.componentDetailHTML()}

      <div class="section-label">CONCEPTUAL COMPONENTS<span>INTERNAL LAYOUT</span></div>
      ${this.componentListHTML(components)}

      <div class="caution-box">
        <span>NOT REAL-TIME</span>
        <p>流光仅表示动力系统原理与能量方向，不代表实际潮流、SOC 或实船功率；电池舱、轴系和岸电接口位置均为概念示意。</p>
      </div>
    `;
  }

  technicalContext() {
    const verified = SPECS.filter((spec) => spec.tier === 'A').length;
    const pending = SPECS.filter((spec) => spec.tier === 'C').length;
    return `
      <div class="context-head">
        <span class="context-mode-no">MODE 04</span>
        <span class="context-mode-en">TECHNICAL / SOURCED DATA</span>
        <span class="tier-chip tier-a context-badge">TIER SYSTEM</span>
      </div>
      <div class="context-title">
        <h2>技术参数</h2>
        <span>8 PARAMETERS</span>
      </div>
      <p class="context-caption">
        仅展示可追溯公开口径。A 级为船级社/官方来源；C 级为媒体或项目输入线索，均保留复核状态。
      </p>

      <div class="tech-summary">
        <strong>${SPECS.length} PARAMETERS</strong>
        <span>${verified} OFFICIAL · ${pending} TO VERIFY<br />ACCESSED 2026-11-14</span>
      </div>

      <div class="spec-table">
        ${SPECS.map((spec) => this.specLineHTML(spec)).join('')}
      </div>

      <div class="spec-note">
        CCS 公开资料只明确“最大航速 11.5 kn”，设计/服务航速与续航条件在不同报道中口径不完全一致，本项目不将未统一的数据写成确定值。
      </div>

      <div class="tech-actions">
        <button type="button" class="outline-btn" data-context-action="sources">打开来源与口径</button>
        <button type="button" class="outline-btn" data-context-action="reset-view">重置观察</button>
      </div>

      <div class="model-evidence">
        <span class="tier-chip tier-m">MODEL / M</span>
        <p>三维网格依据照片外观和主尺度重建。未公开区域的内部布置不构成实船工程依据。</p>
      </div>
    `;
  }

  specLineHTML(spec) {
    const sourceTitle = spec.sources
      .map((id) => SOURCES.find((source) => source.id === id)?.publisher)
      .filter(Boolean)
      .join(' / ');
    return `
      <div class="spec-line" title="${sourceTitle}">
        <div class="spec-line__label">
          ${spec.label}
          <em>${spec.en}</em>
        </div>
        <div class="spec-line__value">
          ${spec.display || this.formatSpecNumber(spec)}
          <small>${spec.unit}</small>
        </div>
        <span class="tier-chip tier-${spec.tier.toLowerCase()}" title="${SOURCE_TIERS[spec.tier].label}">${spec.tier}</span>
      </div>
      ${spec.caveat ? `<p class="spec-caveat">${spec.caveat}</p>` : ''}
    `;
  }

  energyNodeHTML(node) {
    const componentId = ENERGY_COMPONENT_MAP[node.id];
    const active = componentId === this.selectedComponentId;
    return `
      <button type="button" class="energy-node ${active ? 'is-active' : ''}" data-component="${componentId}" style="--node-color:${node.color}">
        <span class="energy-node__dot"></span>
        <span class="energy-node__copy">
          <b>${node.name}</b>
          <em>${node.en}</em>
        </span>
        <span class="energy-node__meta">${node.meta}</span>
      </button>
    `;
  }

  componentsForMode(mode) {
    return COMPONENTS.filter((component) => component.modelModes.includes(mode));
  }

  componentListHTML(components) {
    return `
      <div class="component-list">
        ${components
          .map(
            (component) => `
              <button type="button" class="component-item ${this.selectedComponentId === component.id ? 'is-active' : ''}" data-component="${component.id}">
                <span class="component-item__no">${component.index}</span>
                <span class="component-item__copy">
                  <b>${component.name}</b>
                  <em>${component.en}</em>
                </span>
                <span class="tier-chip tier-${component.tier.toLowerCase()}">${component.tier}</span>
              </button>
            `
          )
          .join('')}
      </div>
    `;
  }

  componentDetailHTML() {
    const component = COMPONENTS.find((item) => item.id === this.selectedComponentId);
    if (!component) {
      return `<div class="empty-selection">选择 3D 部件或上方列表，查看公开事实、概念边界与来源。</div>`;
    }

    const sourceLinks = component.sources
      .map((id) => {
        const source = SOURCES.find((item) => item.id === id);
        if (!source) return '';
        return source.url
          ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.publisher} ↗</a>`
          : `<span>${source.publisher}</span>`;
      })
      .join('');

    return `
      <div class="component-detail">
        <div class="component-detail__title">
          <span class="component-detail__index">${component.index}</span>
          <div>
            <h3>${component.name}</h3>
            <p>${component.en} / ${component.category}</p>
          </div>
          <span class="tier-chip tier-${component.tier.toLowerCase()}" style="margin-left:auto">${component.tier}</span>
        </div>
        <p class="component-detail__summary">${component.summary}</p>
        <ul class="fact-list">
          ${component.facts.map((fact) => `<li>${fact}</li>`).join('')}
        </ul>
        <div class="caution-box">
          <span>BOUNDARY</span>
          <p>${component.caution}</p>
        </div>
        <div class="source-inline">${sourceLinks}</div>
      </div>
    `;
  }

  /* ---------------------------------------------------------------------- */
  /* 事件                                                                    */
  /* ---------------------------------------------------------------------- */
  bindStaticEvents() {
    this.el.modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onMode?.(button.dataset.mode);
      });
    });

    this.el.cameraButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.handlers.onView?.(button.dataset.view);
      });
    });

    this.el.autoButton.addEventListener('click', () => {
      this.handlers.onAutoRotate?.();
    });

    this.el.resetButton.addEventListener('click', () => {
      this.handlers.onReset?.();
    });

    this.el.qualityButton.addEventListener('click', () => {
      this.handlers.onQuality?.();
    });

    this.el.brand.addEventListener('click', (event) => {
      event.preventDefault();
      this.handlers.onHome?.();
    });

    this.el.toast.addEventListener('click', () => {
      window.clearTimeout(this.toastTimer);
      this.el.toast.classList.remove('is-visible');
    });

    this.el.openSources.forEach((button) => {
      button.addEventListener('click', () => this.openSources());
    });

    this.el.contextBody.addEventListener('click', (event) => {
      const target = event.target.closest('[data-component], [data-context-action]');
      if (!target) return;

      if (target.dataset.component) {
        this.handleComponentSelection(target.dataset.component);
        return;
      }

      if (target.dataset.contextAction === 'sources') {
        this.openSources();
      }
      if (target.dataset.contextAction === 'reset-view') {
        this.handlers.onReset?.();
      }
      if (target.dataset.contextAction?.startsWith('focus-')) {
        this.handlers.onFocus?.(target.dataset.contextAction.replace('focus-', ''));
        if (window.innerWidth <= 1180) this.closeMobilePanel();
      }
    });

    this.el.sourceDialog.addEventListener('click', (event) => {
      if (event.target === this.el.sourceDialog) this.closeSources();
      if (event.target.closest('[data-close-sources]')) this.closeSources();
    });
    this.el.sourceDialog.addEventListener('cancel', () => this.closeSources());

    this.el.mobileOpen.forEach((button) => {
      button.addEventListener('click', () => this.toggleMobilePanel(button.dataset.openPanel));
    });

    document.querySelectorAll('[data-close-panel]').forEach((button) => {
      button.addEventListener('click', () => this.closeMobilePanel());
    });

    this.el.mobileScrim.addEventListener('click', () => this.closeMobilePanel());

    document.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const detail = event.target instanceof Element && event.target.closest('button, a, input, select, textarea');
      if (detail) return;

      if (event.code === 'Digit1') this.handlers.onView?.('perspective');
      else if (event.code === 'Digit2') this.handlers.onView?.('front');
      else if (event.code === 'Digit3') this.handlers.onView?.('side');
      else if (event.code === 'Digit4') this.handlers.onView?.('top');
      else if (event.code === 'KeyR') this.handlers.onReset?.();
      else if (event.code === 'Space') {
        event.preventDefault();
        this.handlers.onAutoRotate?.();
      } else if (event.code === 'Escape') {
        this.closeMobilePanel();
      }
    });

    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > 1180) this.closeMobilePanel();
      },
      { passive: true }
    );
  }

  handleComponentSelection(componentId) {
    const component = COMPONENTS.find((item) => item.id === componentId);
    if (!component || !component.modelModes.includes(this.mode)) return;
    if (this.selectedComponentId === componentId) {
      this.selectedComponentId = null;
      this.handlers.onComponentSelect?.(null);
    } else {
      this.selectedComponentId = componentId;
      this.handlers.onComponentSelect?.(componentId);
    }
    this.refreshSelectionUI();
  }

  selectComponentFromScene(componentId) {
    if (!componentId) {
      this.clearSelection();
      return;
    }
    const component = COMPONENTS.find((item) => item.id === componentId);
    if (!component || !component.modelModes.includes(this.mode)) return;
    this.selectedComponentId = componentId;
    this.refreshSelectionUI();
  }

  clearSelection() {
    this.selectedComponentId = null;
    this.refreshSelectionUI();
  }

  refreshSelectionUI() {
    this.updateHotspotMode();
    this.renderContext();
    this.hotspots.forEach(({ element, component }) => {
      element.classList.toggle('is-active', this.selectedComponentId === component.id);
      element.setAttribute('aria-pressed', String(this.selectedComponentId === component.id));
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 相机 / 质量 / 性能                                                       */
  /* ---------------------------------------------------------------------- */
  setActiveView(view) {
    this.activeView = view;
    this.el.cameraButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === view);
    });
  }

  clearActiveView() {
    this.activeView = null;
    this.el.cameraButtons.forEach((button) => button.classList.remove('is-active'));
  }

  setAutoRotate(enabled) {
    this.autoRotate = Boolean(enabled);
    this.el.autoButton.setAttribute('aria-pressed', String(this.autoRotate));
    if (this.autoRotate) this.clearActiveView();
  }

  setQuality({ mode, profile, label, autoAdjusted = false }) {
    const profileName = profile?.fullLabel || '自动';
    const display = mode === 'auto' ? 'AUTO' : profileName;
    this.el.qualityButton.querySelector('b').textContent = display.toUpperCase();
    this.el.qualityButton.title = `当前质量：${mode === 'auto' ? `自动选择 · ${profileName}` : profileName}${autoAdjusted ? '（已自动调整）' : ''}。点击切换。`;
    if (autoAdjusted) {
      this.showToast(`自动质量已调整为 ${profileName}：仅调整采样、阴影与后处理，不暂停动画、不隐藏船体。`);
    }
  }

  setStats(stats) {
    this.el.stats.fps.textContent = Math.round(stats.fps);
    this.el.stats.draw.textContent = formatCompact(stats.drawCalls);
    this.el.stats.tri.textContent = formatCompact(stats.triangles);
    this.el.stats.geo.textContent = formatCompact(stats.geometries);
    this.el.stats.tex.textContent = formatCompact(stats.textures);
  }

  /* ---------------------------------------------------------------------- */
  /* 加载 / 错误 / Toast                                                      */
  /* ---------------------------------------------------------------------- */
  setProgress(percent, status) {
    const rounded = Math.max(0, Math.min(100, Math.round(percent)));
    this.el.loaderBar.style.width = `${rounded}%`;
    this.el.loaderPercent.textContent = `${String(rounded).padStart(2, '0')}%`;
    if (status) this.el.loaderStatus.textContent = status;
  }

  finishLoading() {
    this.setProgress(100, 'DIGITAL TWIN READY');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      this.el.app.classList.add('is-ready');
      this.el.loader.classList.add('is-hidden');
      this.animateFeaturedMetrics();
      window.setTimeout(() => {
        this.el.loader?.setAttribute('aria-hidden', 'true');
      }, 1000);
    }, reduceMotion ? 20 : 320);
  }

  animateFeaturedMetrics() {
    if (this.metricsAnimated) return;
    this.metricsAnimated = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const counters = Array.from(this.el.keyMetrics.querySelectorAll('[data-count]'));
    const finalize = (element) => {
      const display = element.dataset.display;
      element.textContent = display || Number(element.dataset.count).toLocaleString('en-US');
    };

    if (reduceMotion) {
      counters.forEach(finalize);
      return;
    }

    const duration = 1100;
    const start = performance.now() + 240;
    const tick = (now) => {
      const progress = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach((element) => {
        const target = Number(element.dataset.count);
        const display = element.dataset.display;
        const decimals = Number(element.dataset.decimals);
        if (display) {
          element.textContent = progress >= 1 ? display : Math.round(target * eased).toLocaleString('en-US');
        } else {
          element.textContent = (target * eased).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
        }
      });
      if (progress < 1) requestAnimationFrame(tick);
      else counters.forEach(finalize);
    };
    requestAnimationFrame(tick);
  }

  showFatal(message) {
    if (message) this.el.fatalMessage.textContent = message;
    this.el.fatal.hidden = false;
    this.el.loader.classList.add('is-hidden');
    this.el.fatal.querySelector('button')?.focus();
  }

  showToast(message, duration = 3600) {
    window.clearTimeout(this.toastTimer);
    this.el.toast.textContent = message;
    this.el.toast.classList.add('is-visible');
    this.toastTimer = window.setTimeout(() => {
      this.el.toast.classList.remove('is-visible');
    }, duration);
  }

  /* ---------------------------------------------------------------------- */
  /* 资料弹层                                                                */
  /* ---------------------------------------------------------------------- */
  openSources() {
    if (!this.el.sourceDialog.open) {
      this.el.sourceDialog.showModal();
      this.el.sourceDialog.scrollTop = 0;
      const inner = this.el.sourceDialog.querySelector('.source-dialog__inner');
      if (inner) inner.scrollTop = 0;
    }
  }

  closeSources() {
    if (this.el.sourceDialog.open) this.el.sourceDialog.close();
  }

  /* ---------------------------------------------------------------------- */
  /* 移动端                                                                  */
  /* ---------------------------------------------------------------------- */
  toggleMobilePanel(panelName) {
    if (this.mobilePanel === panelName) {
      this.closeMobilePanel();
    } else {
      this.openMobilePanel(panelName);
    }
  }

  openMobilePanel(panelName) {
    this.mobilePanel = panelName;
    this.el.profilePanel.classList.toggle('is-open', panelName === 'profile');
    this.el.contextPanel.classList.toggle('is-open', panelName === 'context');
    this.el.mobileOpen.forEach((button) => {
      button.setAttribute('aria-expanded', String(button.dataset.openPanel === panelName));
    });
    this.el.mobileScrim.hidden = false;
  }

  closeMobilePanel() {
    this.mobilePanel = null;
    this.el.profilePanel.classList.remove('is-open');
    this.el.contextPanel.classList.remove('is-open');
    this.el.mobileOpen.forEach((button) => button.setAttribute('aria-expanded', 'false'));
    this.el.mobileScrim.hidden = true;
  }

  /* ---------------------------------------------------------------------- */
  /* 工具                                                                    */
  /* ---------------------------------------------------------------------- */
  formatSpecNumber(spec) {
    return Number(spec.value).toLocaleString('en-US', {
      minimumFractionDigits: spec.decimals,
      maximumFractionDigits: spec.decimals
    });
  }

  dispose() {
    window.clearTimeout(this.toastTimer);
  }
}
