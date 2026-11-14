# 宁远电鲲静态模型 / STATIC MODEL

## 文件

| 字段 | 内容 |
| --- | --- |
| 文件 | `ningyuan-diankun.glb` |
| 格式 | glTF 2.0 Binary（GLB） |
| 大小 | 2,549,072 bytes（约 2.43 MiB） |
| SHA-256 | `F90F86DA7625C45AD2F8002C36C58BE70B552987BFBABA97E9126F822C998919` |
| 网格数 | 219 |
| InstancedMesh | 0（导出时已烘焙为普通网格） |
| 动画 | 0 |
| 单位 | 米 |
| 坐标 | X：艏向；Y：向上；Z：右舷 |
| 设计水线 | `y = 0` |
| 包围盒 | 约 128.09 × 28.85 × 22.60 m |
| 纹理 | 内嵌 CanvasTexture / PNG 图像 |
| 来源 | SHIP 3D V3.0 程序化模型导出 |

## 设计主尺度

```text
LOA       127.8 m
Beam       21.6 m
Depth      10.5 m
Draft       6.5 m
```

## 包含

- 绿色上船体 / 暗红防污底 / 白色水线漆带
- 曲面船壳、连续艏部曲面、绿色艉封板
- 艏部全包裹绿色结构、白色桥楼、桥翼、连续窗带、雷达桅杆、屋顶设备
- 敞开式货舱、货舱围板、箱格导轨、黄色绑扎梁
- 紧贴艉端的绿色甲板室、屋顶光伏阵列、绿色设备塔、红色软管卷盘、栏杆
- 系缆桩、锚机、绞车、甲板管系、排水孔
- 船名、NBOSCO、Battery Power 等涂装（烘焙为材质贴图）

## 不包含

- 概念电池舱/10 箱电池的内部布置
- EMS、电机、轴系、螺旋桨
- 光伏全息层、岸电接口、能源流
- 结构辅助线、三维尺寸标注、HTML 标签
- 水面、灯光、后处理、交互动画

> 这些内容属于运行时的概念可视化，见 `docs/SOURCES.md` 与 `docs/MODEL.md`。

## 打开方式

优先使用支持 glTF 2.0 的查看器：

- Three.js `GLTFLoader`（项目已验证）
- Blender 4.x
- Windows 3D Viewer
- 其他 glTF 2.0 查看器

### Three.js 示例

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

new GLTFLoader().load('./models/ningyuan-diankun.glb', (gltf) => {
  const ship = gltf.scene;
  // 单位：米；水线 y=0；艏向 +X
  scene.add(ship);
});
```

### 验证

```bat
npm.cmd run dev
npm.cmd run verify:model
```

会独立加载 GLB、检查 219 个网格与模型尺寸，并输出 `docs/previews/11-glb-verify.png`。

## 重新生成

当前模型是程序化外观的静态快照：

```bat
npm.cmd run build
npm.cmd run preview
npm.cmd run export:model
```

然后更新本文件中的大小和 SHA-256。

## 边界

- 不是官方 CAD、线型图或实船完工模型。
- 内部布置是概念示意，不能用于船舶设计、配载、稳性、结构计算、改装或安全相关用途。
- 实船照片与公开来源的说明见 `docs/SOURCES.md`；模型替换流程见 `docs/MODEL.md`。
