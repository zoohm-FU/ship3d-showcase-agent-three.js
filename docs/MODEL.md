# 三维模型说明与替换教程 / MODEL & REPLACEMENT

**项目：** SHIP 3D V3.0 — 宁远电鲲  
**模型资产：** [`models/ningyuan-diankun.glb`](../models/ningyuan-diankun.glb)

## 1. 模型来源

当前运行时模型不是外部购买或通用素材，而是本项目根据：

- 7 张项目方实船/运营参考图（外观比例、涂装、全包裹艏部、绿色艉部甲板室、光伏、货舱设施）
- CCS / 公开媒体确认的主尺度
- 明确标为概念的内部系统逻辑

在 Three.js 中程序化生成的 **1:1 米制几何**，再通过 GLTFExporter 导出为 GLB。没有官方 CAD、线型图或实船完工模型可用；模型中的内部布置是概念可视化。

## 2. 模型规格

| 属性 | 数值 |
| --- | --- |
| 文件名 | `ningyuan-diankun.glb` |
| 大小 | 2,549,072 bytes（约 2.43 MiB） |
| 二进制 glTF | glTF 2.0 |
| 网格数 | 219 |
| InstancedMesh | 0（导出时已烘焙为普通网格，兼容性优先） |
| 动画 | 0（静态外观模型；运行时动画由程序驱动） |
| 纹理 | 程序化 CanvasTexture，嵌入 GLB |
| 坐标 | X 艏向，Y 向上，Z 右舷 |
| 单位 | 米 |
| 设计水线 | `y = 0` |
| 包围盒 | 约 128.09 × 28.85 × 22.60 m |
| 包围盒中心 | (0.048, 7.925, 0) |
| SHA-256 | `F90F86DA7625C45AD2F8002C36C58BE70B552987BFBABA97E9126F822C998919` |

包围盒高度包含桅杆；船体主尺度使用：

```text
LOA 127.8 m · Beam 21.6 m · Depth 10.5 m · Design draft 6.5 m
```

## 3. 组成

运行时和 GLB 的主要部件：

| 节点/系统 | 内容 |
| --- | --- |
| 船体 | 曲面放样外壳、更饱满的艏部、绿色上船体、暗红防污底、白色水线漆带、艏部触水段竖向收尖、绿色艉封板 |
| 甲板与货舱 | 开孔甲板、货舱围板、舱内纵桁、箱格导轨、黄色绑扎梁 |
| 艏部驾驶楼 | 从船艏包裹至桥楼下沿的抬高绿色艏部结构（仅露白色驾驶室层）、弧面双窗、白色多层桥楼、桥翼、窗带、通导桅、屋顶雷达/天线/探照设备、救生圈 |
| 艉部甲板室 | 紧贴艉端的绿色多层甲板室、横向加宽至接近船体外板、白色窗框/檐口、绿色设备塔、屋顶光伏阵列、红色软管卷盘、栏杆与梯子 |
| 外观细节 | 系缆桩、锚机、绞车、栏杆、甲板管系、排水孔、消防/救生设备、船名与 NBOSCO 涂装、艏部弧面双窗、竖向艏柱、艉部屋顶光伏、红色软管卷盘 |
| 概念能源系统 | 10 个箱式电池、BMS/EMS 柜、双电机、轴系、双桨、光伏全息板、岸电接口、能流线 |
| 技术标注 | 总长/型宽/型深/吃水的三维尺寸线（仅运行时） |

GLB **不包含**：概念能源层、结构辅助线、三维尺寸线、HTML 标签、点击高亮盒、水面、灯光、后处理。

## 4. 运行时模型与 GLB 的关系

- 应用启动时使用 `js/main.js → createNingyuanShip()` 的程序化模型，以实现透明 X-Ray、部件拾取、模式切换和动画。
- `models/ningyuan-diankun.glb` 是从同一程序化外观导出的静态快照，用于 DCC、外部查看、存档和进一步制作。
- 修改 `hull.js / superstructure.js / materials.js / energy.js` 后，GLB 需要重新导出：

```bat
npm.cmd run build
npm.cmd run preview
npm.cmd run export:model
```

导出脚本默认把文件写到 `models/ningyuan-diankun.glb`，同时会通过浏览器下载并保存；导出时会临时切换为外观模式，并在结束后恢复原模式。

## 5. 打开与检查

推荐：

- Three.js `GLTFLoader`（已验证）
- Blender 4.x
- Windows 3D Viewer / 支持 glTF 2.0 的 DCC

独立验证：

```bat
npm.cmd run dev
npm.cmd run verify:model
```

会打开 `tests/glb-viewer.html`，独立加载 GLB，检查网格数、尺寸、InstancedMesh 数量，并输出 `docs/previews/11-glb-verify.png`。

## 6. 替换教程 A：仅替换静态 GLB

适用于获得官方/精修模型，但不想改动交互结构。

1. 将新模型放到 `models/`，例如 `models/ningyuan-diankun-official.glb`。
2. 用 Blender/Three 检查：
   - 单位是否为米；
   - 艏向是否指向 +X；
   - 设计水线是否在 y = 0；
   - 总长包围盒是否约 127.8 m。
3. 替换 `models/ningyuan-diankun.glb`（或修改 `js/ui.js` 中下载链接的 path）。
4. 更新 `models/README.md`、`docs/MODEL.md` 中的尺寸、网格数与 SHA-256。
5. 说明该模型的来源和等级。如果它来自非公开资料，必须取得授权；如果仍是照片重建，继续标 M。
6. 重新构建：`npm.cmd run build`。

> 这个方案不会改变应用里显示的程序化模型，只替换可下载的静态资产。若希望页面显示官方模型，见方案 B/C。

## 7. 替换教程 B：用官方 GLB 替换外观显示（推荐）

保留现有结构/能源概念模式，仅替换外观模式。这样不会破坏 10 箱电池、能流、点击标签等交互。

1. 将官方 GLB 放到 `models/`，如 `models/ningyuan-diankun-official.glb`。
2. 在 `js/ship.js` 或新的 loader 模块中加载：

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('./models/ningyuan-diankun-official.glb');
const official = gltf.scene;
official.name = 'OfficialExterior';

// 米制、Y-up、艏向 +X；按需要微调
official.position.set(0, 0, 0);
official.rotation.set(0, 0, 0);
official.scale.setScalar(1);

// 若模型原点不在水线，将其平移到 y=0 设计水线
const box = new THREE.Box3().setFromObject(official);
official.position.y -= box.min.y + 6.5; // 示例：仅当官方模型以船底为原点时使用
```

3. 在 `NingyuanDiankun` 中新增 `officialRoot`，并在 `setMode('exterior')` 时显示它、隐藏程序化 `hull.group` 与 `superstructure.group` 的可见性；结构/能源模式继续使用程序化模型。
4. 材质需要支持当前场景的 PBR 光照与色彩空间。若官方 GLB 带自发光/自定义 Shader，先统一到 `MeshStandardMaterial` / `MeshPhysicalMaterial`。
5. 保留 `ship.componentGroups` 中的外观部件标签：
   - 如果官方模型没有对应节点，可把拾取组设置为官方模型的某个子树；
   - 若无法拆分，可保留现有程序化模型的“透明拾取代理”（不可见但可 Raycast），用于标签和选择。
6. 将 `ship.floatGroup` 的浮动效果应用到官方模型或其父组，避免双重漂浮。
7. 保持 GLB 不覆盖现有 `models/ningyuan-diankun.glb`，便于回退和 A/B 对比。
8. 更新 `docs/SOURCES.md` 的模型来源等级和 `docs/MODEL.md` 的规格。

## 8. 替换教程 C：完整替换（外观 + 内部）

只有拿到 **官方模型 + 官方舱室布置 + 可公开授权** 才建议这样做。否则会制造“内部结构已证实”的错误印象。

需要：

1. 按当前坐标约定统一：米制、Y-up、+X 艏向、y=0 水线。
2. 把模型节点映射到：
   - `forward-house`
   - `cargo-hold`
   - `aft-house`
   - `battery-system`
   - `propulsion`
   - `pv-system`
   - `shore-power`
3. 为可拾取网格写入 `userData.componentId`，并更新 `collectPickMeshes()`。
4. 重建 X-Ray 材质：`ship.js` 中的 `prepareFadeGroup()` 需要能处理新模型的材质；半透明模式不应对透明原件重复克隆导致过度绘制。
5. 重建能源流坐标与相机锚点：`js/data.js` 中 `COMPONENTS[].anchor`、`js/energy.js` 中的 `nodes`、`js/controls.js` 中的 `battery-focus` / `propulsion-focus`。
6. 更新 `js/ui.js` 中部件名称、事实与来源等级。
7. 重新运行：

```bat
npm.cmd run dev
npm.cmd run qa
npm.cmd run build
npm.cmd run preview
npm.cmd run benchmark
npm.cmd run capture
```

## 9. 坐标与单位检查清单

- [ ] 1 单位 = 1 米
- [ ] Y 向上
- [ ] 艏向 +X
- [ ] 右舷 +Z
- [ ] 设计水线 y = 0
- [ ] 总长包围盒约 127.8 m
- [ ] 材质色彩空间为 sRGB
- [ ] 官方模型文件有清晰来源与授权
- [ ] 未公开内部结构继续标 M 级
- [ ] 重新计算 `models/README.md` 中的 SHA-256

## 10. 许可与边界

- 当前 GLB 由本项目程序化生成，仅用于本数字展示项目的交付与评审。
- 实船照片由项目方提供；第三方公开报道和照片的权利归原权利人。
- 模型不是官方设计文件，不得用于建造、配载、稳性、结构计算、改装或任何安全相关用途。
- 若替换为官方模型，请同步更新数据来源、版权和审批记录，不要直接静默覆盖当前概念模型。
