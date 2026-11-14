# 性能报告 / PERFORMANCE REPORT

**项目：** SHIP 3D V3.0 — 宁远电鲲  
**测试日期：** 2026-11-14  
**构建：** `npm run build` → `npm run preview`（生产构建，非开发模式）  
**原始数据：** [`docs/performance-data.json`](performance-data.json)

## 1. 测试环境

| 项目 | 配置 |
| --- | --- |
| 操作系统 | Windows 10 Pro 10.0.19045 |
| CPU | AMD Ryzen 5 2600（6 核 / 12 线程） |
| 内存 | 16 GB |
| GPU | AMD Radeon RX 580 2048SP |
| 浏览器 | Microsoft Edge 157（headless / Chromium 157） |
| WebGL | WebGL 2.0（OpenGL ES 3.0 Chromium） |
| 渲染后端 | ANGLE Direct3D 11 |
| 视口 | 1440 × 900，DPR 1 |
| Node.js | v24.20.0 |
| 构建体积 | JS 715.3 KB（gzip 192.7 KB）· CSS 48.4 KB（gzip 10.3 KB） |

测试使用真实硬件 GPU，不是虚拟占位数据。所有数值来自页面自身 `PerformanceManager` 和 `renderer.info`。

## 2. 测量方法

- **FPS**：由 `requestAnimationFrame` 的实际帧数除以真实墙钟时间计算，每 650 ms 更新一次。无预置帧率、无人工延时。
- **Draw Calls / Triangles**：将 `renderer.info.autoReset` 设为 `false`，每帧渲染前重置，渲染结束后读取；包含阴影 pass 与后处理 pass，反映真实的 GPU 提交量。
- **Geometries / Textures**：读取 `renderer.info.memory`。
- 每个画质先预热 2.6 秒，再间隔 760 ms 采样 5 次，取平均与最小值。
- 测试期间水面、雷达、航行灯、能源粒子、船体浮动等动画持续运行，船体从未隐藏。
- 页面运行在 1440 × 900、DPR 1；测试机显示器的实际 DPR 为 1。

## 3. 画质档结果（外观模式）

| 画质 | 平均 FPS | 最低采样 FPS | Draw Calls | Triangles | Geometries | Textures | Detail LOD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| **HIGH** | **59.7** | 59.6 | **391** | 54,202 | 201 | 28 | 2 |
| **BALANCED** | **59.8** | 59.8 | **365** | 54,202 | 201 | 28 | 1 |
| **PERFORMANCE** | **60.0** | 59.8 | **235** | 38,286 | 201 | 27 | 0 |

采样序列：

```text
HIGH        59.6 / 60.0 / 59.8 / 59.8 / 59.6
BALANCED    59.8 / 59.8 / 59.8 / 59.8 / 59.8
PERFORMANCE 60.9 / 59.8 / 59.8 / 59.8 / 59.8
```

画质档的设置：

| 设置 | HIGH | BALANCED | PERFORMANCE |
| --- | --- | --- | --- |
| 最大设备像素比 | 2 | 1.5 | 1 |
| 阴影 | 2048 阴影贴图 | 1024 阴影贴图 | 关闭 |
| Bloom | 开启 | 开启（较弱） | 关闭 |
| EffectComposer | 开启 | 开启 | 关闭 |
| 水面细节 | 1.0 | 0.68 | 0.34 |
| 细漆线 | 保留 | 隐藏 | 隐藏 |
| 甲板非关键细节 | 保留 | 保留 | 隐藏绑扎桥、艏部机械、艉绞车、上层建筑栏杆等 |

PERFORMANCE 档仍保留：船体壳体、主上层建筑、10 箱电池、EMS、双电机/轴/桨、水面、能源流、标签与全部交互。它只降低渲染成本与非关键装饰细节。

## 4. 四模式结果（HIGH）

| 模式 | 平均 FPS | Draw Calls | Triangles | Geometries | Textures |
| --- | ---: | ---: | ---: | ---: | ---: |
| 外观展示 | 59.8 | 393 | 54,202 | 203 | 28 |
| 结构解析 | 59.8 | 394 | 59,188 | 284 | 31 |
| 能源系统 | 59.8 | 453 | 63,820 | 334 | 31 |
| 技术参数 | 59.8 | 400 | 54,202 | 343 | 31 |

结构/能源模式的 Draw Calls 略高，原因是新增结构辅助线、概念电池/推进设备、能源流与标签；通过高质量档仍保持 60 FPS。

## 5. 性能设计

- **几何**：船体为连续放样曲面，不是图片替代；箱格导轨、系缆桩、箱角等重复件用 InstancedMesh；绑扎桥、栏杆等合并绘制。
- **材质**：共享 PBR 材质与程序化 CanvasTexture；不同模式使用克隆材质做透明度/色调过渡，避免重建场景。
- **水面**：自定义 Shader 动态水波 + 网格 + 扫描光；不依赖外部贴图。
- **后处理**：UnrealBloom + OutputPass；质量档可关闭。
- **阴影**：PCFSoftShadowMap；环境反射使用 RoomEnvironment。
- **自适应**：AUTO 模式下连续低帧会降档，恢复稳定后可回升一档；降档只影响渲染成本项和少量非关键细节。
- **真实读数**：HUD 始终显示五项真实数据，`QUALITY` 按钮显示当前档位，来源与模型边界不占用帧率统计。

## 6. 解读与限制

- 在该测试机上，三种画质均接近 **60 FPS 上限**，说明 1440×900 下主要受 vSync/显示刷新限制，而非 GPU 满载。
- PERFORMANCE 档的 Draw Calls 从 391 降到 235（约 −40%），Triangles 降低约 29%，为低端 GPU/高分屏提供实际余量。
- 以上是单机、单浏览器、单次测试的代表值。不同显卡、驱动、浏览器、DPR、后台占用都会改变结果；页面内 HUD 才是当前设备的事实读数。
- 移动端自动以 BALANCED 启动；更高 DPR 会受最大像素比限制。
- 截图中的 FPS 是瞬态读数，可能因截图编码/合成出现 56–60 的波动；本报告使用 5 次采样的平均值。

## 7. 复现

```bat
npm.cmd install
npm.cmd run build
npm.cmd run preview
:: 另开终端
npm.cmd run benchmark
```

脚本默认访问 `http://127.0.0.1:4174/`，使用本机 Edge；可用 `SHIP3D_URL` 和 `SHIP3D_BROWSER` 覆盖。结果写入 `docs/performance-data.json`，画质截图写入 `tests/artifacts/benchmark-*.png`。

---

**结论：** 在测试硬件上，SHIP 3D V3.0 以生产构建在 1440×900 下实现 **约 60 FPS**（画质档平均 59.7–60.0 FPS），并暴露真实 Draw Calls / Triangles / Geometries / Textures；三档质量和四模式均可复现。目标“约 60 FPS”达标。
