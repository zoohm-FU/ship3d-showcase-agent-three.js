/**
 * 宁远电鲲 — 数据、来源与可交互部件配置
 * ------------------------------------------------------------------
 * 数据分层原则：
 *  A 级 = 船级社 / 官方媒体；
 *  B 级 = 主流媒体公开报道；
 *  C 级 = 项目输入或媒体整理，尚待原始资料复核；
 *  M 级 = 三维重建 / 概念示意，不代表实船结构。
 *
 * 本项目是视觉演示与数字孪生概念原型，不是船舶设计文件。
 * 详细来源见 docs/SOURCES.md。
 */

export const SHIP = {
  nameZh: '宁远电鲲',
  nameEn: 'NINGYUAN DIANKUN',
  typeZh: '740TEU 纯电动敞口集装箱船',
  typeEn: '740 TEU PURE-ELECTRIC OPEN-TOP CONTAINER SHIP',
  operator: '宁波远洋运输股份有限公司',
  builder: '江西江新造船有限公司',
  classSociety: '中国船级社 CCS',
  status: '商业运营中',
  route: '宁波舟山港 — 嘉兴港',
  maidenVoyage: '2026-04-15',
  modelVersion: 'SHIP 3D V3.0',
  modelBasis: '实船照片 + 公开参数视觉重建，非官方 CAD / 线型图',
  hullColors: ['#10ab43', '#5f2421'],
  powerLabel: 'PURE ELECTRIC',
  zeroEmission: true
};

export const SOURCE_TIERS = {
  A: {
    id: 'A',
    label: '官方公开',
    en: 'OFFICIAL',
    className: 'tier-a',
    description: '中国船级社、新华社等官方渠道。'
  },
  B: {
    id: 'B',
    label: '公开报道',
    en: 'REPORTED',
    className: 'tier-b',
    description: '主流媒体公开报道，参数未逐项经原始文件复核。'
  },
  C: {
    id: 'C',
    label: '待复核',
    en: 'TO VERIFY',
    className: 'tier-c',
    description: '媒体整理或项目输入线索，界面明确标注。'
  },
  M: {
    id: 'M',
    label: '概念重建',
    en: 'RECONSTRUCTED',
    className: 'tier-m',
    description: '三维外观重建或系统原理示意，不代表实船内部布置。'
  }
};

export const SOURCES = [
  {
    id: 'ccs',
    tier: 'A',
    publisher: '中国船级社 CCS',
    title: '全球最大国内首制万吨级纯电动高端智能海船“宁远电鲲”完成建造检验发证',
    date: '2026-04-07',
    url: 'https://www.ccs.org.cn/ccswz//articleDetail?id=202604070331469396',
    reachable: true,
    usedFor: ['总长 127.8 m', '740 个 20 英尺箱位', '双机双桨', '最大航速 11.5 kn', '10 个箱式电池', '光伏系统', '高压岸电 + 箱式电池换电']
  },
  {
    id: 'xinhua',
    tier: 'A',
    publisher: '新华网',
    title: '全球最大万吨级纯电动智能集装箱海船从宁波舟山港首航',
    date: '2026-04-15',
    url: 'https://www.xinhuanet.com/20260415/bad51c86ab14452d819cbb2c9f48abdd/c.html',
    reachable: true,
    usedFor: ['船型定位', '首航 / 商业运营', '运营场景']
  },
  {
    id: 'chinadaily',
    tier: 'B',
    publisher: '中国日报网',
    title: '从“三线军工厂”驶出的零碳巨轮：全球最大纯电海船“宁远电鲲”如何改写航运史',
    date: '2026-08-24',
    url: 'https://cn.chinadaily.com.cn/a/202608/24/WS6a8bc9fc45ce1aabf7a93497.html',
    reachable: true,
    usedFor: ['总长 127.8 m', '10 个独立箱式电池', '约 2 万千瓦时电量', '岸电快充 + 吊装换电双模式', '零排放运营']
  },
  {
    id: 'qq',
    tier: 'B',
    publisher: '腾讯新闻',
    title: '国内首制！万吨级纯电动集装箱海船，到底有多硬核',
    date: '2026-04-15',
    url: 'https://news.qq.com/rain/a/20260415A05SS500',
    reachable: true,
    usedFor: ['型宽 21.6 m', '设计吃水 6.5 m', '约 742 个标准箱（与 CCS 公布的 740 有差异）']
  },
  {
    id: 'toutiao',
    tier: 'C',
    publisher: '今日头条（媒体整理）',
    title: '2万度电续航90海里！中国纯电巨轮问世',
    date: '2026-04-19',
    url: 'https://www.toutiao.com/article/7630314817122845230/',
    reachable: true,
    usedFor: ['型深 10.5 m（待 CCS 原文复核）', '载重吨与续航区间等背景资料']
  },
  {
    id: 'user-photos',
    tier: 'C',
    publisher: '项目方提供',
    title: '宁远电鲲实船参考照片（7 张）',
    date: '2026-11-14',
    url: '',
    reachable: true,
    usedFor: [
      '绿色上船体 / 暗红防污底',
      '艏部全包裹绿色结构与白色桥楼',
      '艉部绿色甲板室紧贴艉端',
      '艉部屋顶光伏与设备塔',
      '敞开式货舱及甲板栏杆布局',
      '船名与 NBOSCO 涂装'
    ]
  },
  {
    id: 'project-input',
    tier: 'C',
    publisher: '项目输入线索',
    title: '约 19,600 kWh / 2 × 875 kW 永磁同步推进（待权威原文确认）',
    date: '2026-11-14',
    url: '',
    reachable: true,
    usedFor: ['电池容量精确值', '推进电机功率与电机类型']
  },
  {
    id: 'model-reconstruction',
    tier: 'M',
    publisher: 'SHIP 3D V3.0 项目组',
    title: '根据公开照片与参数进行的三维视觉重建',
    date: '2026-11-14',
    url: '',
    reachable: true,
    usedFor: ['船舶外观、比例、甲板设备、电池舱剖面、能源流向、设备定位']
  }
];

export const SPECS = [
  {
    key: 'loa',
    label: '总长',
    en: 'LENGTH OVERALL',
    short: 'LOA',
    value: 127.8,
    decimals: 1,
    unit: 'm',
    tier: 'A',
    sources: ['ccs'],
    featured: true
  },
  {
    key: 'beam',
    label: '型宽',
    en: 'BREADTH',
    short: 'BREADTH',
    value: 21.6,
    decimals: 1,
    unit: 'm',
    tier: 'B',
    sources: ['qq'],
    featured: true
  },
  {
    key: 'depth',
    label: '型深',
    en: 'DEPTH MOULDED',
    short: 'DEPTH',
    value: 10.5,
    decimals: 1,
    unit: 'm',
    tier: 'C',
    sources: ['toutiao'],
    caveat: '媒体整理值，界面保留 C 级标识，待原始资料复核。'
  },
  {
    key: 'draft',
    label: '设计吃水',
    en: 'DESIGN DRAFT',
    short: 'DRAFT',
    value: 6.5,
    decimals: 1,
    unit: 'm',
    tier: 'B',
    sources: ['qq'],
    caveat: '设计吃水来自主流媒体公开报道。'
  },
  {
    key: 'teu',
    label: '载箱量',
    en: 'CONTAINER CAPACITY',
    short: 'CAPACITY',
    value: 740,
    decimals: 0,
    unit: 'TEU',
    tier: 'A',
    sources: ['ccs'],
    featured: true,
    caveat: 'CCS 公开资料载明 740 个 20 英尺箱位；部分媒体写为 742。本项目以 CCS 口径为准。'
  },
  {
    key: 'battery',
    label: '电池容量',
    en: 'BATTERY CAPACITY',
    short: 'ENERGY',
    value: 19600,
    display: '≈19,600',
    decimals: 0,
    unit: 'kWh',
    tier: 'C',
    sources: ['chinadaily', 'project-input'],
    featured: true,
    caveat: '中国日报称约 2 万千瓦时；19,600 kWh 与 10 箱配置为项目输入线索，待原始技术文件确认。'
  },
  {
    key: 'power',
    label: '推进功率',
    en: 'PROPULSION POWER',
    short: 'POWER',
    value: 875,
    display: '2 × 875',
    decimals: 0,
    unit: 'kW',
    tier: 'C',
    sources: ['project-input'],
    caveat: 'CCS 公开资料只确认“双机双桨”；单机 875 kW 与永磁同步机型来自项目输入线索，需以设备铭牌或官方资料复核。'
  },
  {
    key: 'speed',
    label: '最大航速',
    en: 'MAX SPEED',
    short: 'SPEED',
    value: 11.5,
    decimals: 1,
    unit: 'kn',
    tier: 'A',
    sources: ['ccs'],
    caveat: '公开资料只明确最大航速；设计/服务航速与续航条件未在可获取资料中统一表述。'
  }
];

export const MODES = [
  {
    id: 'exterior',
    index: '01',
    label: '外观展示',
    en: 'EXTERIOR',
    short: '外观',
    caption: 'PHOTO-RECONSTRUCTED EXTERIOR',
    description: '从实船照片重建的绿色船体、双岛式上层建筑与敞开货舱。'
  },
  {
    id: 'structure',
    index: '02',
    label: '结构解析',
    en: 'STRUCTURE',
    short: '结构',
    caption: 'HULL & COMPONENT X-RAY',
    description: '半透明船体、结构分区与设备定位。点击部件查看公开资料与概念边界。'
  },
  {
    id: 'energy',
    index: '03',
    label: '能源系统',
    en: 'ENERGY',
    short: '能源',
    caption: 'BATTERY → POWER → PROPULSION',
    description: '10 箱电池、电力控制、双机双桨、光伏与岸电的系统原理示意。'
  },
  {
    id: 'technical',
    index: '04',
    label: '技术参数',
    en: 'TECHNICAL',
    short: '参数',
    caption: 'VERIFIED DATA & SOURCE TIERS',
    description: '按来源等级展示已核实公开参数与仍需复核的项目。'
  }
];

/**
 * 可交互部件
 * anchor 单位为米，与模型 1:1。
 * modelMode 表示在哪些模式显示对应标签。
 */
export const COMPONENTS = [
  {
    id: 'forward-house',
    index: 'A',
    group: '外观结构',
    name: '艏部驾驶楼',
    en: 'FORWARD DECKHOUSE',
    category: 'OBSERVED / 外观可见',
    tier: 'M',
    sources: ['user-photos', 'model-reconstruction'],
    anchor: [43.5, 20.5, 9.2],
    modelModes: ['exterior', 'structure'],
    summary: '照片显示驾驶楼位于艏部，绿色艏部结构从船艏向上、向后包裹桥楼下部，白色桥楼嵌入其中，带桥翼、桅杆和通导设备。',
    facts: [
      '照片可见：绿色艏部全包裹基座、白色多层桥楼、连续驾驶室窗带、两翼平台与桅杆设备。',
      '照片中桥楼前方没有开放前甲板；绿色艏部顶面带有 NBOSCO 标识与检修口。',
      '桥楼具体层高、内部舱室与设备型号未公开，本模型按外观比例重建。'
    ],
    caution: '内部结构和设备位置为视觉重建，不代表实船布置。'
  },
  {
    id: 'cargo-hold',
    index: 'B',
    group: '货载结构',
    name: '敞口货舱与箱位',
    en: 'OPEN-TOP CARGO HOLD',
    category: 'OFFICIAL CAPACITY',
    tier: 'A',
    sources: ['ccs', 'user-photos'],
    anchor: [2, 9.5, 0],
    modelModes: ['exterior', 'structure'],
    summary: '740 个 20 英尺箱位的敞口集装箱船。照片可见无舱盖的敞开式甲板、白色的箱区轨道与黄色绑扎设施。',
    facts: ['CCS：740 个标准 20 英尺箱位。', '船型：敞口集装箱船（open-top）。', '本模型展示空载货舱和箱格结构；未按实船配载图摆放集装箱。'],
    caution: '箱格数量、导轨布置与绑扎设备形态为照片外观重建。'
  },
  {
    id: 'aft-house',
    index: 'C',
    group: '外观结构',
    name: '艉部甲板室 / 设备区',
    en: 'AFT DECKHOUSE',
    category: 'OBSERVED / 用途待确认',
    tier: 'M',
    sources: ['user-photos', 'model-reconstruction'],
    anchor: [-56.5, 16.8, 7.2],
    modelModes: ['exterior', 'structure'],
    summary: '照片显示艉部为紧贴艉端的绿色多层甲板室，带白色窗框与檐口、绿色设备塔、顶部光伏阵列和红色软管卷盘。公开资料未说明其内部功能。',
    facts: [
      '照片可见艉部绿色多层甲板室、白色窗框/栏杆、屋顶光伏、绿色塔状结构与舷侧红色软管卷盘。',
      '甲板室后缘紧贴艉端，没有明显多余艉甲板空间。',
      '不把该区域标注为“烟囱”或确定为某一设备舱室。'
    ],
    caution: '该区域用途未在可获取公开资料中说明，模型只还原外观形态；艉部光伏的面积和功率未公开。'
  },
  {
    id: 'battery-system',
    index: 'D',
    group: '新能源系统',
    name: '10 × 箱式动力电池',
    en: 'CONTAINERIZED BATTERY BANK',
    category: 'SYSTEM SCHEMATIC / 概念布置',
    tier: 'M',
    sources: ['ccs', 'chinadaily', 'project-input', 'model-reconstruction'],
    anchor: [-11.3, 6.4, 0],
    modelModes: ['structure', 'energy'],
    summary: '公开资料确认全船配置 10 个箱式电池，可采用高压岸电充电和吊装箱式电池快速换电。',
    facts: [
      'CCS：配置 10 个箱式电池作为动力核心。',
      '中国日报：约 2 万千瓦时，分装在 10 个独立箱式电池中。',
      '项目输入：精确容量约 19,600 kWh（C 级，待复核）。',
      '为便于观察，模型将 10 箱以 2 × 5 概念阵列放在敞口货舱内，不代表实船舱位。'
    ],
    caution: '10 箱电池的实船排布未公开。本模型的 2 × 5 阵列与货舱内位置均为概念可视化，不能作为实船内部布置依据。'
  },
  {
    id: 'propulsion',
    index: 'E',
    group: '新能源系统',
    name: '双机双桨推进',
    en: 'TWIN-SCREW ELECTRIC PROPULSION',
    category: 'OFFICIAL / 部分参数待核',
    tier: 'M',
    sources: ['ccs', 'project-input', 'model-reconstruction'],
    anchor: [-54, 10.2, 8.8],
    modelModes: ['structure', 'energy'],
    summary: 'CCS 公开资料明确该船采用双机双桨推进系统，最大航速 11.5 节。',
    facts: [
      'CCS：双机双桨推进，最大航速 11.5 kn。',
      '项目输入：两台约 875 kW 永磁同步推进电机（C 级，待复核）。'
    ],
    caution: '轴系长度、齿轮箱、电机具体型号和舱室位置为概念可视化，不代表实船设计。'
  },
  {
    id: 'pv-system',
    index: 'F',
    group: '新能源系统',
    name: '光伏辅助系统',
    en: 'PHOTOVOLTAIC ASSIST',
    category: 'OFFICIAL PRESENCE / 位置概念',
    tier: 'M',
    sources: ['ccs', 'model-reconstruction'],
    anchor: [39.4, 15.4, 0],
    modelModes: ['energy'],
    summary: 'CCS 公开资料确认船上配备光伏系统；照片显示艉部甲板室顶部实际布置了成组光伏板。',
    facts: [
      'CCS：船上配备光伏系统。',
      '照片可见：艉部绿色甲板室屋顶有成组深色光伏板。',
      '公开资料未给出光伏面积、功率与电气连接细节。'
    ],
    caution: '艉部光伏位置来自照片外观；能量系统中的光伏全息层为系统示意，具体面积、功率和接线未公开。'
  },
  {
    id: 'shore-power',
    index: 'G',
    group: '新能源系统',
    name: '高压岸电接入',
    en: 'HIGH-VOLTAGE SHORE POWER',
    category: 'OFFICIAL METHOD / 位置概念',
    tier: 'M',
    sources: ['ccs', 'chinadaily', 'model-reconstruction'],
    anchor: [-28, 6.4, 13.4],
    modelModes: ['energy'],
    summary: '该船支持高压岸电快充，并可通过吊装箱式电池实现快速换电。',
    facts: [
      'CCS：既可通过高压岸电充电，又能通过吊装箱式电池实现快速换电。',
      '中国日报：高压岸电快充 + 箱式电池吊装换电双模式。'
    ],
    caution: '岸电接口在实船上的具体位置与形式未公开，本模型仅做系统位置示意。'
  }
];

export const METRIC_BADGES = [
  { value: '740', unit: 'TEU', label: '箱位' },
  { value: '10', unit: 'BOX', label: '箱式电池' },
  { value: '127.8', unit: 'm', label: '总长' },
  { value: '11.5', unit: 'kn', label: '最大航速' }
];

export const ENERGY_FLOW = [
  {
    id: 'battery',
    name: '箱式动力电池',
    en: 'BATTERY BANK',
    meta: '10 BOX / ≈19,600 kWh',
    tier: 'M',
    color: '#68e68b',
    note: '舱内 2 × 5 排列为概念示意。'
  },
  {
    id: 'ems',
    name: '能量管理 / 配电',
    en: 'EMS & POWER DISTRIBUTION',
    meta: 'SYSTEM SCHEMATIC',
    tier: 'M',
    color: '#5de5ff',
    note: '具体柜体数量与位置未公开。'
  },
  {
    id: 'motors',
    name: '双机推进',
    en: 'TWIN ELECTRIC PROPULSION',
    meta: 'TWIN-SCREW / 11.5 kn MAX',
    tier: 'A',
    sourceTier: 'A',
    color: '#7eb6ff',
    note: 'CCS 确认双机双桨。'
  },
  {
    id: 'props',
    name: '双螺旋桨',
    en: 'TWIN PROPELLERS',
    meta: 'PROPULSION',
    tier: 'M',
    color: '#ffca72',
    note: '桨叶几何为概念建模。'
  },
  {
    id: 'pv',
    name: '光伏辅助',
    en: 'PHOTOVOLTAIC ASSIST',
    meta: 'PRESENCE CONFIRMED',
    tier: 'M',
    color: '#a8f07a',
    note: '照片可见艉部屋顶光伏；面积、功率与接线未公开。'
  },
  {
    id: 'shore',
    name: '高压岸电',
    en: 'SHORE POWER',
    meta: 'FAST CHARGE / SWAP',
    tier: 'A',
    sourceTier: 'A',
    color: '#59d9ff',
    note: '接口位置为概念示意。'
  }
];

/** 3D 尺寸采用米制；与公开总长/型宽/型深/吃水一致。 */
export const DIMENSIONS = {
  length: 127.8,
  beam: 21.6,
  depth: 10.5,
  draft: 6.5,
  deckY: 4.0,
  keelY: -6.5
};
