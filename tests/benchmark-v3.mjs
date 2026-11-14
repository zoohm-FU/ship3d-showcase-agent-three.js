/**
 * SHIP 3D V3 / 真实渲染性能基准
 * 运行前需启动生产预览：npm run preview
 * 默认测试地址：http://127.0.0.1:4174
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const artifactDir = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifactDir, { recursive: true });
fs.mkdirSync(path.join(rootDir, 'docs'), { recursive: true });

const url = process.env.SHIP3D_URL || 'http://127.0.0.1:4174/';
const executablePath =
  process.env.SHIP3D_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb'
  ]
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

async function readEnvironment() {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : 'unavailable',
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: innerWidth, height: innerHeight },
      hardwareConcurrency: navigator.hardwareConcurrency,
      webglVersion: gl ? gl.getParameter(gl.VERSION) : null
    };
  });
}

async function sampleQuality(quality, shots = true) {
  await page.evaluate((value) => window.__SHIP3D__.setQuality(value), quality);
  await page.waitForTimeout(2600);
  const samples = [];
  for (let i = 0; i < 5; i += 1) {
    await page.waitForTimeout(760);
    samples.push(await page.evaluate(() => window.__SHIP3D__.getStats()));
  }
  const fpsSamples = samples.map((item) => item.fps);
  const latest = samples[samples.length - 1];
  const averageFps = fpsSamples.reduce((sum, value) => sum + value, 0) / fpsSamples.length;
  if (shots) {
    await page.screenshot({ path: path.join(artifactDir, `benchmark-${quality}.png`) });
  }
  return {
    fpsAverage: Number(averageFps.toFixed(1)),
    fpsMin: Number(Math.min(...fpsSamples).toFixed(1)),
    fpsSamples: fpsSamples.map((value) => Number(value.toFixed(1))),
    drawCalls: latest.drawCalls,
    triangles: latest.triangles,
    geometries: latest.geometries,
    textures: latest.textures,
    detailLevel: await page.evaluate(() => window.__SHIP3D__.getState().detailLevel),
    pixelRatio: await page.evaluate(() => window.__SHIP3D__.stage.renderer.getPixelRatio()),
    shadows: await page.evaluate(() => window.__SHIP3D__.stage.renderer.shadowMap.enabled),
    composer: await page.evaluate(() => window.__SHIP3D__.stage.getQualityState().composer)
  };
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('.app.is-ready', { timeout: 30000 });
  await page.waitForTimeout(3200);
  const environment = await readEnvironment();

  await page.evaluate(() => {
    window.__SHIP3D__.stage.camera.position.set(146, 44, 153);
    window.__SHIP3D__.director.controls.target.set(0, 9, 0);
    window.__SHIP3D__.director.controls.update();
  });

  const quality = {};
  quality.high = await sampleQuality('high');
  quality.balanced = await sampleQuality('balanced');
  quality.performance = await sampleQuality('performance');
  await page.evaluate(() => window.__SHIP3D__.performance.setMode('auto'));

  await page.evaluate(() => window.__SHIP3D__.setQuality('high'));
  const modeResults = {};
  for (const mode of ['exterior', 'structure', 'energy', 'technical']) {
    await page.click(`[data-mode="${mode}"]`);
    await page.waitForTimeout(2100);
    const samples = [];
    for (let i = 0; i < 3; i += 1) {
      await page.waitForTimeout(760);
      samples.push(await page.evaluate(() => window.__SHIP3D__.getStats()));
    }
    const latest = samples[samples.length - 1];
    modeResults[mode] = {
      fpsAverage: Number(
        (samples.reduce((sum, item) => sum + item.fps, 0) / samples.length).toFixed(1)
      ),
      drawCalls: latest.drawCalls,
      triangles: latest.triangles,
      geometries: latest.geometries,
      textures: latest.textures
    };
  }

  const report = {
    project: 'SHIP 3D V3.0 / 宁远电鲲',
    measuredAt: new Date().toISOString(),
    url,
    environment,
    quality,
    modes: modeResults,
    consoleErrors,
    notes: [
      'FPS 由 requestAnimationFrame 帧数 / 真实墙钟时间计算，每 650 ms 更新一次。',
      'Draw Calls / Triangles 取 renderer.info 在本帧的累计值，包含阴影与后处理 pass。',
      '场景包含动态水面、体积感泛光、阴影、雷达/螺旋桨/能源粒子动画。',
      'headless Edge 使用本机 WebGL 硬件；数值仅代表该测试机，不构成其他设备的性能保证。'
    ]
  };

  fs.writeFileSync(
    path.join(rootDir, 'docs', 'performance-data.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log(JSON.stringify(report, null, 2));
  console.log('\nBENCHMARK WRITTEN docs/performance-data.json');
} catch (error) {
  console.error('BENCHMARK FAILED:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
