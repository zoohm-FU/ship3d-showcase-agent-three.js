# SHIP 3D · 宁远电鲲

**用 AI Agent 构建可交互的船舶数字样机**

740 TEU 纯电动敞口集装箱船 · Three.js / WebGL 视觉重建  
Three.js r170 · Vite 6 · WebGL 2 · V3.0

> [!IMPORTANT]
> 本项目是非官方、非商业的视觉重建，不是官方 CAD、总布置图或工程交付物，与船东、船厂、中国船级社及媒体机构无隶属或背书关系。除明确引用的公开参数外，模型中的内部布置和系统位置均为概念示意。

![SHIP 3D 外观展示](docs/previews/01-exterior.png)

## 项目简介

SHIP 3D 是 **宁远电鲲 / NINGYUAN DIANKUN** 的浏览器三维展示项目。船体、上层建筑、涂装和主要舾装由 Three.js 以 1:1 米制程序化生成；外观、结构、能源、技术参数四个模式共用同一套场景和真实性能 HUD。

这个项目想展示的不是“AI 生成一张好看的船图”，而是一条可检查的工作流：agent 从公开资料和参考照片出发，完成程序化建模、交互、性能监控、自动 QA，并导出 GLB；人负责提供照片、指出视觉偏差和最终验收。

### 核心特征

- **1:1 米制程序化船体**，不是图片贴片或简单方块拼装。
- **四个交互模式**：外观、结构、能源、技术参数。
- **真实性能读数**：FPS / Draw Calls / Triangles / Geometries / Textures。
- **可检查模型**：219 个网格、2.43 MB 的 GLB，可独立加载。

## 四个模式

<table>
<tr>
<td width="52%" valign="top">
<h3>01 · 外观展示</h3>
<p>按项目方参考照片重建绿色上船体、暗红防污底、抬高并全包裹的艏部、敞口货舱，以及紧贴艉端的绿色甲板室。</p>
<ul>
<li>旋转、缩放、热点和部件列表</li>
<li>艏部弧面双窗与竖向艏柱</li>
<li>艉部屋顶光伏、红色软管卷盘</li>
</ul>
</td>
<td width="48%" valign="top">
<img src="docs/previews/01-exterior.png" width="100%" alt="外观展示模式">
</td>
</tr>
</table>

<table>
<tr>
<td width="48%" valign="top">
<img src="docs/previews/02-structure.png" width="100%" alt="结构解析模式">
</td>
<td width="52%" valign="top">
<h3>02 · 结构解析</h3>
<p>半透明船体、结构辅助线、甲板与货舱、概念电池阵列、双机双桨。</p>
<ul>
<li>点击 3D 部件或右侧列表查看档案</li>
<li>电池阵列与电力推进特写</li>
<li>明确区分照片可见外观与概念内部</li>
</ul>
</td>
</tr>
</table>

<table>
<tr>
<td width="52%" valign="top">
<h3>03 · 能源系统</h3>
<p>电池 → EMS/配电 → 双电机 → 双桨；高压岸电与光伏作为补充输入；能量流实时动画。</p>
<ul>
<li>能源链节点与 3D 部件联动</li>
<li>电池、推进聚焦镜头</li>
<li>系统位置为概念示意，不接实船遥测</li>
</ul>
</td>
<td width="48%" valign="top">
<img src="docs/previews/05-energy.png" width="100%" alt="能源系统模式">
</td>
</tr>
</table>

<table>
<tr>
<td width="48%" valign="top">
<img src="docs/previews/08-technical.png" width="100%" alt="技术参数模式">
</td>
<td width="52%" valign="top">
<h3>04 · 技术参数</h3>
<p>总长、型宽、型深、吃水等公开参数，以及 A/B/C 来源等级和三维尺寸标注。</p>
<ul>
<li>来源弹窗与参数口径说明</li>
<li>尺寸线可随相机旋转</li>
<li>公开数据与待复核线索分开标注</li>
</ul>
</td>
</tr>
</table>

## Agent 工作流

Agent 没有 CAD 文件。它从公开事实、项目方参考照片和反复的视觉审核出发，逐步补齐船体、上层建筑、材质、交互和测试。

<table>
<tr>
<td width="50%" valign="top">
<h3>Agent 负责</h3>
<ul>
<li>整理公开参数与来源等级</li>
<li>程序化船体、上层建筑、舾装和涂装</li>
<li>四模式、X-Ray、拾取、标签、能量流</li>
<li>性能读数、自动 QA、GLB 导出</li>
</ul>
</td>
<td width="50%" valign="top">
<h3>人负责</h3>
<ul>
<li>提供参考照片和视觉方向</li>
<li>指出艏部包裹层数、窗户、艉部宽度等偏差</li>
<li>确认功能优先级和最终外观</li>
<li>决定公开定位和授权边界</li>
</ul>
</td>
</tr>
</table>

### 修正记录

| 轮次 | 问题 | 修正 |
| --- | --- | --- |
| 1 | 前甲板开放，艏部有突出体 | 移除突出球鼻，建立绿色全包裹艏部 |
| 2 | 艉部甲板室为白色、位置偏前、艉端有空余 | 改为绿色，贴合艉端，补屋顶光伏和红色卷盘 |
| 3 | 绿色包裹偏低，艏部缺少窗 | 抬高一层，增加两扇弧面窗，艏柱竖向收尖 |
| 4 | 艉部两侧仍留有明显侧甲板 | 甲板室横向加宽至接近外板，保留阶梯层次 |

这些是整理后的工程记录，不是原始思维链。第一版不是最终版，修正过程本身也是这个项目的一部分。

### 最终核对视图

<table>
<tr>
<td width="50%" valign="top">
<img src="docs/previews/14-bow-headon.png" width="100%" alt="艏部正视：抬高包裹与弧面双窗">
<p align="center"><sub>艏部：抬高后的绿色包裹、弧面双窗、竖向艏柱</sub></p>
</td>
<td width="50%" valign="top">
<img src="docs/previews/15-stern-headon.png" width="100%" alt="艉部正视：接近全宽的绿色甲板室">
<p align="center"><sub>艉部：接近全宽的绿色甲板室与屋顶光伏</sub></p>
</td>
</tr>
</table>

## 性能

HUD 中的数值来自真实渲染统计和墙钟帧时间，不预置、不伪造。测试环境为 **AMD Radeon RX 580 2048SP、Ryzen 5 2600、Windows 10、Edge 157、1440 × 900、DPR 1、生产构建**。

| 画质 | 平均 FPS | Draw Calls | Triangles | 说明 |
| --- | ---: | ---: | ---: | --- |
| **HIGH** | **59.7** | **391** | **54,202** | 阴影 + Bloom + 全细节 |
| **BALANCED** | **59.8** | **365** | **54,202** | 较低阴影采样，减少细漆线 |
| **PERFORMANCE** | **60.0** | **235** | **38,286** | 关闭阴影/后处理，保留船体与核心结构 |

- 四个模式在 HIGH 下平均约 **59.8 FPS**。
- 画质切换只调整采样、阴影、后处理和少量非关键细节，不隐藏整船、不暂停动画、不虚报 FPS。
- 性能与显卡、分辨率、驱动和浏览器有关，不代表所有设备。

完整方法、逐模式采样和限制见 [docs/PERFORMANCE.md](docs/PERFORMANCE.md)。

## 模型

运行时模型是程序化几何，不是图片贴片或简单方块拼装。船体由放样截面生成，材质、甲板开孔、涂装、结构线和设备均由代码构建。

| 属性 | 数值 |
| --- | --- |
| 文件 | [models/ningyuan-diankun.glb](models/ningyuan-diankun.glb) |
| 大小 | 2,549,072 bytes（2.43 MiB） |
| 网格数 | 219 |
| InstancedMesh | 0（导出时已烘焙） |
| 动画 | 0 |
| 坐标 | X 艏向，Y 向上，Z 右舷；米制；设计水线 `y = 0` |
| 包围盒 | 128.09 × 28.85 × 22.60 m |
| SHA-256 | `F90F86DA7625C45AD2F8002C36C58BE70B552987BFBABA97E9126F822C998919` |

GLB 只包含外观结构；概念能源层、尺寸线、HTML 标签、水面和灯光不导出。

模型结构、导出方法和替换流程见 [docs/MODEL.md](docs/MODEL.md)；文件元数据见 [models/README.md](models/README.md)。

## 快速开始

环境：**Node.js 20+**，支持 WebGL 2 的现代浏览器（Edge / Chrome / Firefox），无需后端、CDN 或 API Key。

```bash
npm ci
npm run dev
```

打开 **http://127.0.0.1:5174/**。

生产构建：

```bash
npm run build
npm run preview
```

打开 **http://127.0.0.1:4174/**。

> 不要直接双击 `index.html`。ES Module、WebGL 和 GLB 下载都需要通过本地服务器访问。

Windows 也可以双击 `start.bat`（开发）或 `start-production.bat`（构建 + 生产预览）。

## 数据与边界

| 等级 | 含义 |
| --- | --- |
| **A / 官方公开** | 中国船级社 CCS、新华社等 |
| **B / 公开报道** | 主流媒体，未逐项回到原始文件 |
| **C / 待复核** | 媒体整理或项目输入线索 |
| **M / 概念重建** | 三维重建或系统原理示意，不代表实船内部布置 |

核心边界：

- CCS 公开资料支持 **740 TEU、127.8 m 总长、双机双桨、最大 11.5 kn、10 个箱式电池、光伏、高压岸电 + 换电**。
- 型宽和吃水来自公开媒体；型深、电池容量、单机功率保留 B/C 级，不写成绝对事实。
- 模型货舱内的 **2 × 5 共 10 箱电池阵列是概念布置**，不是已公开的实船电池舱位置。
- 能源流、EMS 柜位、轴系、光伏面积/接线、岸电接口位置均为概念示意。
- 保留公开口径冲突：**740 vs 742 TEU**、**约 2 万 vs 19,600 kWh**，优先采用 CCS。
- 不接入实船遥测，不展示真实 SOC 或功率。

第三方参考照片不随公开仓库分发，仅用于本地视觉重建；来源链接和观察记录见 [docs/SOURCES.md](docs/SOURCES.md)。

## 项目结构

```text
.
├─ index.html                  # 应用外壳、HUD、对话框
├─ css/style.css               # 工业 HUD、模式与响应式布局
├─ js/
│  ├─ main.js                  # 启动、模式、拾取、渲染循环、GLB 导出
│  ├─ scene.js                 # 渲染器、灯光、水面、后处理
│  ├─ hull.js                  # 放样船体、甲板、货舱、舾装
│  ├─ superstructure.js        # 艏部桥楼、艉部甲板室、桅杆与设备
│  ├─ energy.js                # 电池、EMS、电机、桨、光伏、岸电
│  ├─ ship.js                  # 总装、X-Ray、拾取、尺寸线、LOD
│  ├─ controls.js              # 相机导演、预设、自动环视
│  ├─ performance.js           # 实时统计与自适应质量
│  ├─ ui.js                    # 模式内容、部件详情、来源弹窗
│  ├─ data.js                  # 船舶数据、来源等级、部件档案
│  ├─ materials.js             # 材质与程序化贴图
│  └─ utils.js                 # 几何、曲线、合并工具
├─ assets/                     # 纹理、贴花与静态素材
├─ models/                     # GLB、manifest 与模型说明
├─ docs/                       # 来源、模型、性能与预览图
├─ tests/                      # QA、性能基准、截图、GLB 验证
├─ scripts/                    # 构建包装器与模型导出
├─ start.bat
└─ start-production.bat
```

公开分发是纯静态的：没有后端、数据库或密钥。`dist/`、`node_modules/`、本地缓存和第三方参考照片不进入源码仓库。

## 测试

浏览器 QA 是本地测试，因为它需要真实 GPU、WebGL 和本地浏览器，而不是模拟 DOM。

```bash
npm run dev          # 终端 1：开发服务器 5174

npm run qa           # 四模式、拾取、HUD、来源弹窗、移动端
npm run build
npm run preview      # 终端 2：生产预览 4174
npm run benchmark    # 三档画质与四模式性能
npm run capture      # 文档截图
npm run verify:model # GLB 独立加载验证（开发服务器）
npm run export:model # 从实时场景重新导出 GLB（生产预览）
```

说明：

- 浏览器脚本默认按 **Windows + 本机 Microsoft Edge** 配置；支持覆盖页面地址的脚本可用 `SHIP3D_URL`，部分脚本支持 `SHIP3D_BROWSER`。
- QA 覆盖四模式、真实性能读数、3D 拾取、空水域清除选择、来源弹窗、相机预设、键盘、自动环视、三档画质、动画连续性和控制台错误。
- 本仓库的浏览器测试是本地测试；GitHub Actions 只用于构建静态 Pages 产物，不在 CI 中宣称浏览器 QA 通过。

## 已知限制

- 没有官方 CAD、线型图或舱室图；外观是照片参照重建。
- 照片未覆盖的背面、设备细节和内部结构是合理补全，不是已核实几何。
- 公开资料存在冲突；项目保留冲突并优先 CCS。
- 电机供应商、精确功率和永磁机型仍是待复核线索。
- 电池排布、EMS、轴系、光伏接线和岸电接口是视觉概念。
- 性能取决于 GPU、分辨率、驱动和浏览器；上表只代表测试机。
- 外链可能随时间失效。

## 授权与致谢

- **代码**：MIT。
- **原始三维模型、文档、自制渲染图**：CC BY-NC 4.0。
- **第三方参考照片、新闻图片、船名与标识**：不包含在上述授权中，权利归各自所有者。
- 本项目是非官方、非商业案例，与船东、船厂、中国船级社或媒体无隶属或背书关系。

如果你是权利人并希望删除或调整某素材，请在仓库中提交 issue。

参考照片不随仓库分发；模型与渲染图是视觉重建，不是设计文件。

## 参考来源

- 中国船级社 CCS：https://www.ccs.org.cn/ccswz//articleDetail?id=202604070331469396
- 新华网：https://www.xinhuanet.com/20260415/bad51c86ab14452d819cbb2c9f48abdd/c.html
- 中国日报网：https://cn.chinadaily.com.cn/a/202608/24/WS6a8bc9fc45ce1aabf7a93497.html
- 腾讯新闻：https://news.qq.com/rain/a/20260415A05SS500
- 今日头条：https://www.toutiao.com/article/7630314817122845230/

逐项参数口径、冲突处理和更多来源见 [docs/SOURCES.md](docs/SOURCES.md)。

---

**SHIP 3D V3.0** · 宁远电鲲视觉重建 · 2026  
Three.js + Vite · 非官方船舶文件
