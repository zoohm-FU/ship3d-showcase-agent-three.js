/**
 * 生产预览截图与静态资产回归检查。
 * 前置：npm run build && npm run preview
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const previewDir = path.join(rootDir, 'docs', 'previews');
fs.mkdirSync(previewDir, { recursive: true });

const url = process.env.SHIP3D_URL || 'http://127.0.0.1:4174/';
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

const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  assert.equal(response.status(), 200);
  await page.waitForSelector('.app.is-ready', { timeout: 30000 });
  await page.waitForTimeout(6200);
  // 让首次进入的边界提示淡出，截图只保留主界面
  await page.evaluate(() => document.querySelector('#data-toast')?.classList.remove('is-visible'));
  await page.waitForTimeout(450);

  for (const asset of [
    'assets/reference/ship-bow-quarter.png',
    'assets/reference/ship-bow-aerial.png',
    'assets/reference/ship-stern-view.webp',
    'assets/reference/ship-loaded-side.jpg',
    'assets/reference/ship-side-yard.webp',
    'models/ningyuan-diankun.glb'
  ]) {
    const assetResponse = await page.request.get(new URL(asset, url).href);
    assert.equal(assetResponse.status(), 200, `${asset} should be served in production`);
    assert.ok((await assetResponse.body()).length > 1000, `${asset} should not be empty`);
  }

  await page.click('.source-trigger');
  await page.waitForTimeout(800);
  const galleryStatus = await page.$$eval('.source-gallery img', (images) =>
    images.map((image) => ({ complete: image.complete, width: image.naturalWidth }))
  );
  assert.equal(galleryStatus.length, 7);
  assert.ok(galleryStatus.every((item) => item.complete && item.width > 0));
  const downloadHref = await page.getAttribute('.source-model a', 'href');
  assert.equal(downloadHref, './models/ningyuan-diankun.glb');
  await page.screenshot({ path: path.join(previewDir, 'sources.png') });
  await page.click('[data-close-sources]');
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(previewDir, '01-exterior.png') });

  await page.click('[data-mode="structure"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(previewDir, '02-structure.png') });

  await page.click('[data-context-action="focus-battery"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(previewDir, '03-structure-battery.png') });

  await page.click('[data-context-action="focus-propulsion"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(previewDir, '04-structure-propulsion.png') });

  await page.click('[data-mode="energy"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(previewDir, '05-energy.png') });

  await page.click('[data-context-action="focus-battery"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(previewDir, '06-energy-battery.png') });

  await page.click('[data-context-action="focus-propulsion"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(previewDir, '07-energy-propulsion.png') });

  await page.click('[data-mode="technical"]');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(previewDir, '08-technical.png') });

  // 使用独立页面拍摄无 HUD 的艏部/艉部细节，避免模式切换后的相机状态干扰
  const detailPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  detailPage.on('pageerror', (error) => errors.push(error.message));
  detailPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await detailPage.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await detailPage.waitForSelector('.app.is-ready', { timeout: 30000 });
  await detailPage.waitForTimeout(3200);
  await detailPage.addStyleTag({
    content:
      '.panel,.topbar,.command-bar,.hotspot-layer,.mode-banner,.data-toast,.stage-marks{display:none!important}'
  });
  await detailPage.evaluate(() => {
    const app = window.__SHIP3D__;
    app.director.cancelTransition();
    app.stage.camera.position.set(92, 25, 58);
    app.director.controls.target.set(48, 6, 0);
    app.director.controls.update();
  });
  await detailPage.waitForTimeout(800);
  await detailPage.screenshot({ path: path.join(previewDir, '12-bow-refit.png') });

  await detailPage.evaluate(() => {
    const app = window.__SHIP3D__;
    app.stage.camera.position.set(-92, 27, 52);
    app.director.controls.target.set(-48, 7, 0);
    app.director.controls.update();
  });
  await detailPage.waitForTimeout(800);
  await detailPage.screenshot({ path: path.join(previewDir, '13-stern-refit.png') });

  await detailPage.evaluate(() => {
    const app = window.__SHIP3D__;
    app.stage.camera.position.set(118, 17, 0);
    app.director.controls.target.set(52, 7, 0);
    app.director.controls.update();
  });
  await detailPage.waitForTimeout(600);
  await detailPage.screenshot({ path: path.join(previewDir, '14-bow-headon.png') });

  await detailPage.evaluate(() => {
    const app = window.__SHIP3D__;
    app.stage.camera.position.set(-122, 18, 0);
    app.director.controls.target.set(-56, 8, 0);
    app.director.controls.update();
  });
  await detailPage.waitForTimeout(600);
  await detailPage.screenshot({ path: path.join(previewDir, '15-stern-headon.png') });
  await detailPage.close();

  assert.deepEqual(errors, []);
  console.log('DESKTOP PREVIEWS CAPTURED:', previewDir);

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1
  });
  const mobileErrors = [];
  mobile.on('pageerror', (error) => mobileErrors.push(error.message));
  mobile.on('console', (message) => {
    if (message.type() === 'error') mobileErrors.push(message.text());
  });
  await mobile.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await mobile.waitForSelector('.app.is-ready', { timeout: 30000 });
  await mobile.waitForTimeout(6200);
  await mobile.evaluate(() => document.querySelector('#data-toast')?.classList.remove('is-visible'));
  await mobile.waitForTimeout(450);
  await mobile.screenshot({ path: path.join(previewDir, '09-mobile.png') });
  await mobile.click('[data-mode="structure"]');
  await mobile.waitForTimeout(1800);
  await mobile.click('[data-open-panel="context"]');
  await mobile.waitForTimeout(700);
  await mobile.screenshot({ path: path.join(previewDir, '10-mobile-structure.png') });

  assert.deepEqual(mobileErrors, []);
  console.log('MOBILE PREVIEW CAPTURED');
} finally {
  await browser.close();
}
