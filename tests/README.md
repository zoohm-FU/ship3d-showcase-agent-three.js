# Tests / 验证脚本

这些脚本使用本机安装的 Microsoft Edge（Playwright Core 驱动）与真实 WebGL 硬件渲染，不下载浏览器。

## 依赖的服务器

| 脚本 | npm 命令 | 默认地址 | 前置服务器 |
| --- | --- | --- | --- |
| `qa-v3.mjs` | `npm run qa` | `http://127.0.0.1:5174/` | `npm run dev` |
| `benchmark-v3.mjs` | `npm run benchmark` | `http://127.0.0.1:4174/` | `npm run build && npm run preview` |
| `capture-previews.mjs` | `npm run capture` | `http://127.0.0.1:4174/` | 同上 |
| `verify-glb.mjs` | `npm run verify:model` | `http://127.0.0.1:5174/` | `npm run dev`（需要 `tests/glb-viewer.html`） |

可用环境变量覆盖：

```bat
set SHIP3D_URL=http://127.0.0.1:4174/
set SHIP3D_BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

## 输出

- `docs/performance-data.json` — 真实性能采样
- `docs/previews/` — 生产预览截图
- `tests/artifacts/` — QA / 基准截图与结果（临时目录，已被 `.gitignore` 忽略）

## 覆盖范围

`qa-v3.mjs`：

- WebGL 初始化、四模式切换
- 实时 FPS/Draw/Triangles/Geometries/Textures 全部可见
- 结构/能源聚焦机位
- 画布 3D 拾取、清除选择
- 来源弹窗、8 个公开来源
- 视角按钮、键盘快捷键、自动环视
- 三档画质、动画持续、船体未隐藏
- 控制台/pageerror 检查

`benchmark-v3.mjs`：生产构建下 HIGH/BALANCED/PERFORMANCE 与四模式实际 FPS 及渲染统计。

`verify-glb.mjs`：用 Three.js GLTFLoader 独立加载 GLB，验证网格数、无 InstancedMesh 依赖与包围盒尺寸。

## 注意

- 脚本为 Windows 路径预设；非 Windows 请设置 `SHIP3D_BROWSER`。
- 图像类测试不是像素级快照对比；重点是页面状态、实时数据、交互与错误检查。
- 截图中的瞬时 FPS 可能因截图合成、后台任务出现小幅波动；性能结论以多次采样的基准脚本为准。
