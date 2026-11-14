/**
 * Windows 构建包装器
 * 将 esbuild 的临时目录放到项目内，避免系统临时目录权限问题。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localTemp = path.join(projectRoot, '.tmp');
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(viteBin)) {
  console.error('未找到 Vite，请先运行：npm.cmd install');
  process.exit(1);
}

fs.mkdirSync(localTemp, { recursive: true });

const child = spawn(process.execPath, [viteBin, 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, TEMP: localTemp, TMP: localTemp }
});

child.on('exit', (code) => {
  try {
    if (code === 0) {
      // 静态参考照片与可下载模型不在 Vite 的模块依赖图里，需随构建一起发布
      const assetsSource = path.join(projectRoot, 'assets');
      const modelsSource = path.join(projectRoot, 'models');
      if (fs.existsSync(assetsSource)) {
        fs.cpSync(assetsSource, path.join(projectRoot, 'dist', 'assets'), {
          recursive: true,
          force: true
        });
      }
      if (fs.existsSync(modelsSource)) {
        fs.cpSync(modelsSource, path.join(projectRoot, 'dist', 'models'), {
          recursive: true,
          force: true
        });
      }
      console.log('  static assets copied → dist/assets, dist/models');
    }
  } catch (error) {
    console.error('静态资源复制失败：', error);
    process.exitCode = 1;
  }
  try {
    fs.rmSync(localTemp, { recursive: true, force: true });
  } catch {
    // Windows 偶尔延迟释放临时文件，不影响构建结果
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('构建启动失败：', error);
  process.exit(1);
});
