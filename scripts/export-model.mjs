/**
 * 从运行中的 SHIP 3D 页面导出静态 GLB。
 *
 * 使用方式：
 *   1. npm run build
 *   2. npm run preview
 *   3. npm run export:model
 *
 * 默认从 http://127.0.0.1:4174 导出，输出到 models/ningyuan-diankun.glb。
 * 可用 SHIP3D_URL 覆盖页面地址。
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(projectRoot, 'models', 'ningyuan-diankun.glb');
const url = process.env.SHIP3D_URL || 'http://127.0.0.1:4174/';
const executablePath =
  process.env.SHIP3D_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

fs.mkdirSync(path.dirname(target), { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox', '--hide-scrollbars']
});
const page = await browser.newPage({ acceptDownloads: true });
page.on('pageerror', (error) => console.error('PAGEERROR', error.message));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('.app.is-ready', { timeout: 30000 });
  await page.waitForTimeout(2500);

  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  const exported = await page.evaluate(async () => window.__SHIP3D__.exportGLB());
  const download = await downloadPromise;
  await download.saveAs(target);
  const stat = fs.statSync(target);
  console.log(`GLB exported: ${target} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Reported size: ${exported?.size ?? 'unknown'} bytes`);
} finally {
  await browser.close();
}
