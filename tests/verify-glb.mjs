/**
 * 静态 GLB 验证：用 Three.js GLTFLoader 独立加载 models/ningyuan-diankun.glb。
 * 前置：npm run dev（默认 5174），tests/glb-viewer.html 仅在开发服务器可用。
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const previewDir = path.resolve(__dirname, '..', 'docs', 'previews');
fs.mkdirSync(previewDir, { recursive: true });

const baseUrl = process.env.SHIP3D_URL || 'http://127.0.0.1:5174/';
const browser = await chromium.launch({
  executablePath:
    process.env.SHIP3D_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
  args: [
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb'
  ]
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(new URL('tests/glb-viewer.html', baseUrl).href, {
    waitUntil: 'networkidle',
    timeout: 45000
  });
  await page.waitForFunction(() => window.__GLB_READY__ || window.__GLB_ERROR__, null, {
    timeout: 30000
  });
  const state = await page.evaluate(() => ({
    ready: window.__GLB_READY__ || null,
    error: window.__GLB_ERROR__ || null
  }));
  assert.equal(state.error, null);
  assert.ok(state.ready.meshes >= 200);
  assert.equal(state.ready.instancedMeshes, 0);
  assert.ok(state.ready.size[0] > 120 && state.ready.size[0] < 140);
  assert.ok(state.ready.size[1] > 25);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(previewDir, '11-glb-verify.png') });
  assert.deepEqual(pageErrors, []);
  console.log('GLB VERIFIED:', JSON.stringify(state.ready));
} finally {
  await browser.close();
}
