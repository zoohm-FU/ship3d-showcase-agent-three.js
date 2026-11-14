/**
 * SHIP 3D V3 / 功能回归测试
 * 使用本机 Edge + WebGL 硬件渲染。
 */
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
  args: [
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb'
  ]
});
const baseUrl = process.env.SHIP3D_URL || 'http://127.0.0.1:5174/';
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

const results = [];
function pass(name, info = '') {
  results.push({ name, ok: true, info });
  console.log(`PASS ${name}${info ? ` :: ${info}` : ''}`);
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('.app.is-ready', { timeout: 30000 });
  await page.waitForTimeout(4200);

  const initial = await page.evaluate(() => window.__SHIP3D__.getState());
  assert.equal(initial.mode, 'exterior');
  assert.ok(initial.stats.fps > 30, `FPS ${initial.stats.fps}`);
  assert.ok(initial.stats.drawCalls > 0);
  assert.ok(initial.stats.triangles > 10000);
  assert.ok(initial.stats.geometries > 0);
  assert.ok(initial.stats.textures > 0);
  pass('initial WebGL scene', `FPS ${initial.stats.fps.toFixed(1)} / draw ${initial.stats.drawCalls}`);

  const statsVisible = await page.evaluate(() =>
    ['#stat-fps', '#stat-draw', '#stat-tri', '#stat-geo', '#stat-tex'].map((selector) => {
      const el = document.querySelector(selector);
      return { selector, text: el?.textContent, display: el ? getComputedStyle(el).display : null };
    })
  );
  assert.ok(statsVisible.every((stat) => stat.display !== 'none' && stat.text !== '--'));
  pass('real performance HUD exposed', JSON.stringify(statsVisible));

  for (const mode of ['structure', 'energy', 'technical', 'exterior']) {
    await page.click(`[data-mode="${mode}"]`);
    await page.waitForTimeout(1700);
    const state = await page.evaluate(() => window.__SHIP3D__.getState());
    assert.equal(state.mode, mode);
    assert.equal(await page.getAttribute('#app', 'data-mode'), mode);
    assert.ok(state.stats.fps > 30, `${mode} FPS ${state.stats.fps}`);
    const activeModes = await page.$$eval('.mode-btn.is-active', (els) =>
      els.map((element) => element.dataset.mode)
    );
    assert.deepEqual(activeModes, [mode]);
    assert.ok((await page.textContent('#context-body')).trim().length > 40);
    pass(`mode ${mode}`, `FPS ${state.stats.fps.toFixed(1)}`);
  }

  // 结构模式：电池/推进特写
  await page.click('[data-mode="structure"]');
  await page.waitForTimeout(1700);
  await page.click('[data-context-action="focus-battery"]');
  await page.waitForTimeout(1700);
  const batteryFocus = await page.evaluate(() => window.__SHIP3D__.getState());
  assert.ok(Math.abs(batteryFocus.camera[0] - 30) < 8);
  pass('structure battery focus', batteryFocus.camera.join(', '));
  await page.click('[data-context-action="focus-propulsion"]');
  await page.waitForTimeout(1700);
  const propFocus = await page.evaluate(() => window.__SHIP3D__.getState());
  assert.ok(propFocus.camera[0] < 0);
  pass('structure propulsion focus', propFocus.camera.join(', '));

  // 3D 拾取：扫描一个未被 HTML 覆盖的船体点
  await page.click('[data-mode="structure"]');
  await page.waitForTimeout(1700);
  const pickPoint = await page.evaluate(() => {
    const app = window.__SHIP3D__;
    const canvas = document.querySelector('#scene-canvas');
    const rect = canvas.getBoundingClientRect();
    for (let y = 300; y <= 650; y += 12) {
      for (let x = 390; x <= 1030; x += 12) {
        const top = document.elementFromPoint(x, y);
        if (top !== canvas) continue;
        const ndc = new (app.ship.root.position.constructor)(
          ((x - rect.left) / rect.width) * 2 - 1,
          -((y - rect.top) / rect.height) * 2 + 1,
          0
        );
        const id = app.ship.pick(ndc, app.stage.camera);
        if (id) return { x, y, id };
      }
    }
    return null;
  });
  assert.ok(pickPoint, 'No pickable 3D point found');
  await page.mouse.click(pickPoint.x, pickPoint.y);
  await page.waitForTimeout(600);
  const selected = await page.evaluate(() => window.__SHIP3D__.getState().selected);
  assert.ok(selected, '3D pick did not select a component');
  assert.ok((await page.textContent('#context-body')).includes('BOUNDARY'));
  pass('3D component picking', `${pickPoint.id} at ${pickPoint.x},${pickPoint.y}`);

  // 点击空水域清除选择
  const emptyPoint = await page.evaluate(() => {
    const app = window.__SHIP3D__;
    const canvas = document.querySelector('#scene-canvas');
    const rect = canvas.getBoundingClientRect();
    for (let y = 640; y <= 760; y += 10) {
      for (let x = 450; x <= 980; x += 16) {
        if (document.elementFromPoint(x, y) !== canvas) continue;
        const ndc = new (app.ship.root.position.constructor)(
          ((x - rect.left) / rect.width) * 2 - 1,
          -((y - rect.top) / rect.height) * 2 + 1,
          0
        );
        if (!app.ship.pick(ndc, app.stage.camera)) return { x, y };
      }
    }
    return null;
  });
  if (emptyPoint) {
    await page.mouse.click(emptyPoint.x, emptyPoint.y);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__SHIP3D__.getState().selected), null);
    pass('empty-water clears selection');
  }

  // 来源弹窗
  await page.click('.source-trigger');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.querySelector('#source-dialog').open), true);
  const sourceCount = await page.$$eval('.source-entry', (entries) => entries.length);
  assert.ok(sourceCount >= 5);
  await page.screenshot({ path: path.join(artifacts, 'qa-sources.png') });
  await page.click('[data-close-sources]');
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.querySelector('#source-dialog').open), false);
  pass('source dialog', `${sourceCount} public sources`);

  // 视角按钮 / 键盘 / 自动旋转
  await page.click('[data-view="front"]');
  await page.waitForTimeout(1600);
  const front = await page.evaluate(() => window.__SHIP3D__.getState().camera);
  assert.ok(Math.abs(front[0] - 176) < 10);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('3');
  await page.waitForTimeout(1600);
  assert.equal(await page.getAttribute('.camera-key.is-active', 'data-view'), 'side');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__SHIP3D__.getState().autoRotate), true);
  await page.keyboard.press('Space');
  pass('camera views, keyboard and auto orbit');

  // 画质三档 + 动画/船体不被暂停或隐藏
  const qualityResults = {};
  for (const quality of ['high', 'balanced', 'performance']) {
    await page.evaluate((value) => window.__SHIP3D__.setQuality(value), quality);
    await page.waitForTimeout(2600);
    const radarBefore = await page.evaluate(
      () => window.__SHIP3D__.ship.superstructure.animated.radars[0].group.rotation.y
    );
    await page.waitForTimeout(700);
    const sample = await page.evaluate(() => {
      const app = window.__SHIP3D__;
      return {
        state: app.getState(),
        propRotation: app.ship.superstructure.animated.radars[0].group.rotation.y,
        rootVisible: app.ship.root.visible && app.ship.floatGroup.visible,
        hullVisible: app.ship.hull.group.visible,
        canvasVisible: getComputedStyle(document.querySelector('#scene-canvas')).display !== 'none'
      };
    });
    assert.ok(sample.state.stats.fps > 25, `${quality} FPS ${sample.state.stats.fps}`);
    assert.ok(sample.propRotation > radarBefore, `${quality}: animation paused`);
    assert.ok(sample.rootVisible && sample.hullVisible && sample.canvasVisible);
    qualityResults[quality] = {
      fps: Number(sample.state.stats.fps.toFixed(1)),
      drawCalls: sample.state.stats.drawCalls,
      triangles: sample.state.stats.triangles,
      geometries: sample.state.stats.geometries,
      textures: sample.state.stats.textures,
      detailLevel: sample.state.detailLevel
    };
    await page.screenshot({ path: path.join(artifacts, `qa-quality-${quality}.png`) });
    pass(`quality ${quality}`, JSON.stringify(qualityResults[quality]));
  }

  await page.evaluate(() => window.__SHIP3D__.performance.setMode('auto'));
  await page.waitForTimeout(900);

  assert.deepEqual(consoleErrors, []);
  pass('no console or page errors');

  fs.writeFileSync(
    path.join(artifacts, 'qa-results.json'),
    JSON.stringify({ baseUrl, results, qualityResults, consoleErrors }, null, 2),
    'utf8'
  );
  console.log('\nALL QA CHECKS PASSED');
} catch (error) {
  console.error('\nQA FAILED:', error);
  fs.writeFileSync(
    path.join(artifacts, 'qa-failure.json'),
    JSON.stringify({ results, consoleErrors, error: String(error.stack || error) }, null, 2),
    'utf8'
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
