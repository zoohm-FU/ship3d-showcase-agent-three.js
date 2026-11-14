/**
 * 材质与程序化贴图
 * ------------------------------------------------------------------
 * 本项目不依赖外部贴图；船名、NBOSCO、箱式电池标识、甲板与光伏
 * 纹理均由 Canvas 在本地生成。这样保证离线可用、尺寸可控。
 */
import * as THREE from 'three';

function canvasTexture(width, height, draw, { repeat = null, colorSpace = THREE.SRGBColorSpace } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.needsUpdate = true;
  return texture;
}

/* -------------------------------------------------------------------------- */
/* 程序化纹理                                                                   */
/* -------------------------------------------------------------------------- */
function makePaintNoise() {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#8c8c8c';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2800; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const alpha = 0.018 + Math.random() * 0.045;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 14);
      }
      ctx.globalAlpha = 0.09;
      for (let x = 0; x < w; x += 32) {
        ctx.fillStyle = '#262626';
        ctx.fillRect(x, 0, 1, h);
      }
      ctx.globalAlpha = 1;
    },
    { repeat: [6, 2], colorSpace: THREE.NoColorSpace }
  );
}

function makeDeckTexture() {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#57615e';
      ctx.fillRect(0, 0, w, h);

      // 防滑颗粒
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 2600; i += 1) {
        const value = 30 + Math.floor(Math.random() * 60);
        ctx.fillStyle = `rgb(${value},${value + 4},${value + 2})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // 甲板拼缝
      ctx.strokeStyle = 'rgba(18, 27, 26, 0.55)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 256) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(182, 204, 194, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 3; x <= w; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    },
    { colorSpace: THREE.SRGBColorSpace }
  );
}

function makeContainerTexture() {
  return canvasTexture(
    1024,
    512,
    (ctx, w, h) => {
      const base = ctx.createLinearGradient(0, 0, w, 0);
      base.addColorStop(0, '#1d4f7c');
      base.addColorStop(0.5, '#275e8c');
      base.addColorStop(1, '#153f68');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // 瓦楞
      for (let x = 10; x < w; x += 24) {
        ctx.fillStyle = 'rgba(5, 20, 34, 0.28)';
        ctx.fillRect(x, 0, 4, h);
        ctx.fillStyle = 'rgba(188, 219, 228, 0.1)';
        ctx.fillRect(x + 4, 0, 2, h);
      }

      // 顶部/底部框梁
      ctx.fillStyle = 'rgba(5, 17, 28, 0.48)';
      ctx.fillRect(0, 0, w, 24);
      ctx.fillRect(0, h - 24, w, 24);
      ctx.fillStyle = 'rgba(153, 194, 203, 0.24)';
      ctx.fillRect(0, 24, w, 3);
      ctx.fillRect(0, h - 27, w, 3);

      // 门框与编号
      ctx.strokeStyle = 'rgba(198, 225, 228, 0.24)';
      ctx.lineWidth = 2;
      ctx.strokeRect(34, 44, 262, h - 88);
      ctx.fillStyle = 'rgba(226, 241, 241, 0.68)';
      ctx.font = '500 28px Consolas, monospace';
      ctx.fillText('NBOSCO', 56, 88);
      ctx.font = '400 14px Consolas, monospace';
      ctx.fillStyle = 'rgba(208, 230, 232, 0.46)';
      ctx.fillText('740TEU · CARGO / DEMO LOAD', 56, 112);

      ctx.font = '400 12px Consolas, monospace';
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = 'rgba(171, 208, 217, 0.36)';
        ctx.fillText(`S-${String(120 + i).padStart(3, '0')}  22G1`, 58, 166 + i * 52);
      }

      // 通风槽
      ctx.fillStyle = 'rgba(5, 16, 26, 0.38)';
      for (let x = 340; x < w - 30; x += 74) {
        ctx.fillRect(x, 52, 7, h - 112);
      }

      // 轻微锈迹/使用痕迹
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 160; i += 1) {
        ctx.fillStyle = Math.random() > 0.5 ? '#b18d6f' : '#05111e';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 12, 1);
      }
      ctx.globalAlpha = 1;
    },
    { colorSpace: THREE.SRGBColorSpace }
  );
}

function makeSolarTexture() {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#061c2b';
      ctx.fillRect(0, 0, w, h);
      const cols = 10;
      const rows = 6;
      const cellW = w / cols;
      const cellH = h / rows;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const g = ctx.createLinearGradient(x * cellW, y * cellH, (x + 1) * cellW, (y + 1) * cellH);
          g.addColorStop(0, '#0b3147');
          g.addColorStop(0.45, '#0e4663');
          g.addColorStop(1, '#09283a');
          ctx.fillStyle = g;
          ctx.fillRect(x * cellW + 3, y * cellH + 3, cellW - 6, cellH - 6);
        }
      }
      ctx.strokeStyle = 'rgba(126, 221, 236, 0.27)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += cellW) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += cellH) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(180, 244, 255, 0.34)';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    },
    { colorSpace: THREE.SRGBColorSpace }
  );
}

function makeDeckhouseTexture() {
  return canvasTexture(
    1024,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#d4dcd5';
      ctx.fillRect(0, 0, w, h);

      // 舷窗 / 舱窗条带
      const rows = [
        { y: 66, h: 92, count: 10 },
        { y: 218, h: 88, count: 9 },
        { y: 360, h: 82, count: 8 }
      ];
      rows.forEach((row, rowIndex) => {
        const gap = 18;
        const margin = 48;
        const cell = (w - margin * 2 - gap * (row.count - 1)) / row.count;
        for (let i = 0; i < row.count; i += 1) {
          const x = margin + i * (cell + gap);
          const g = ctx.createLinearGradient(x, row.y, x, row.y + row.h);
          g.addColorStop(0, rowIndex === 0 ? '#102c33' : '#0b242b');
          g.addColorStop(0.55, rowIndex === 1 ? '#173d42' : '#0c252a');
          g.addColorStop(1, '#07161a');
          ctx.fillStyle = g;
          ctx.fillRect(x, row.y, cell, row.h);
          ctx.strokeStyle = 'rgba(224, 239, 234, 0.7)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, row.y, cell, row.h);
          if (i % 3 === 1) {
            ctx.fillStyle = 'rgba(167, 239, 221, 0.12)';
            ctx.fillRect(x + 4, row.y + 4, cell - 8, 5);
          }
        }
      });

      // 局部门
      ctx.fillStyle = '#24413f';
      ctx.fillRect(w - 140, 250, 62, 212);
      ctx.strokeStyle = 'rgba(232, 243, 237, 0.72)';
      ctx.lineWidth = 3;
      ctx.strokeRect(w - 140, 250, 62, 212);
      ctx.fillStyle = '#b7d7cd';
      ctx.fillRect(w - 118, 300, 18, 3);

      // 水渍与轻微风化
      ctx.globalAlpha = 0.09;
      for (let i = 0; i < 120; i += 1) {
        ctx.fillStyle = '#405a53';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 3 + Math.random() * 40);
      }
      ctx.globalAlpha = 1;
    },
    { colorSpace: THREE.SRGBColorSpace }
  );
}

function makeBatteryTexture() {
  return canvasTexture(
    1024,
    512,
    (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#0e3c31');
      gradient.addColorStop(0.55, '#155845');
      gradient.addColorStop(1, '#092c26');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // 箱体外框
      ctx.strokeStyle = 'rgba(128, 228, 186, 0.3)';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      // 深色功能面板，避免在泛光下发白过曝
      ctx.fillStyle = 'rgba(4, 24, 20, 0.84)';
      ctx.fillRect(54, 72, w - 108, 104);
      ctx.strokeStyle = 'rgba(128, 228, 186, 0.36)';
      ctx.lineWidth = 2;
      ctx.strokeRect(54, 72, w - 108, 104);
      ctx.fillStyle = 'rgba(206, 238, 223, 0.92)';
      ctx.font = '600 34px Consolas, monospace';
      ctx.fillText('NBOSCO · BESS', 78, 120);
      ctx.font = '400 18px Consolas, monospace';
      ctx.fillStyle = 'rgba(128, 195, 170, 0.82)';
      ctx.fillText('CONTAINERIZED BATTERY ENERGY STORAGE / CONCEPT', 78, 150);

      // 电容器/模块纹样
      const cellY = 216;
      const cellW = 62;
      for (let i = 0; i < 10; i += 1) {
        const x = 72 + i * (cellW + 18);
        ctx.fillStyle = 'rgba(4, 22, 19, 0.54)';
        ctx.fillRect(x, cellY, cellW, 158);
        ctx.strokeStyle = 'rgba(113, 211, 169, 0.24)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, cellY, cellW, 158);
        for (let j = 0; j < 4; j += 1) {
          ctx.fillStyle = 'rgba(77, 219, 164, 0.22)';
          ctx.fillRect(x + 8, cellY + 18 + j * 32, cellW - 16, 5);
        }
      }

      // 警示标识
      ctx.strokeStyle = 'rgba(230, 198, 127, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w - 92, h - 88);
      ctx.lineTo(w - 60, h - 22);
      ctx.lineTo(w - 124, h - 22);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(230, 198, 127, 0.88)';
      ctx.font = '600 30px Consolas, monospace';
      ctx.fillText('⚡', w - 102, h - 37);

      ctx.fillStyle = 'rgba(195, 228, 214, 0.66)';
      ctx.font = '400 16px Consolas, monospace';
      ctx.fillText('BATTERY SYSTEM / HIGH VOLTAGE / CONCEPT LAYOUT', 54, h - 42);
    },
    { colorSpace: THREE.SRGBColorSpace }
  );
}

/** 艏部及舷侧船名贴图 */
function makeNameTexture() {
  return canvasTexture(2048, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(244, 249, 243, 0.96)';
    ctx.font = '500 208px "Microsoft YaHei UI", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('宁远电鲲', 54, 206);
    ctx.font = '400 46px Consolas, monospace';
    ctx.fillStyle = 'rgba(244, 249, 243, 0.9)';
    ctx.fillText('NING YUAN DIAN KUN', 62, 346);
    ctx.fillStyle = 'rgba(244, 249, 243, 0.62)';
    ctx.fillRect(62, 392, 650, 4);
    ctx.font = '400 25px Consolas, monospace';
    ctx.fillStyle = 'rgba(236, 247, 240, 0.56)';
    ctx.fillText('ZERO EMISSION · BATTERY POWER', 64, 434);
  });
}

/** NBOSCO 舷侧大字标 */
function makeHullBrandTexture() {
  return canvasTexture(2048, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(243, 248, 242, 0.92)';
    ctx.font = '400 212px "Bahnschrift", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '36px';
    ctx.fillText('NBOSCO', w / 2, 136);
    ctx.letterSpacing = '6px';
    ctx.font = '400 25px Consolas, monospace';
    ctx.fillStyle = 'rgba(238, 247, 240, 0.62)';
    ctx.fillText('NINGBO OCEAN SHIPPING CO., LTD.', w / 2, 284);
  });
}

function makeSternMarkTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(238, 248, 240, 0.9)';
    ctx.font = '400 75px "Bahnschrift", "Segoe UI", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('Battery Power', 34, 150);
    ctx.fillStyle = 'rgba(238, 248, 240, 0.72)';
    ctx.font = '400 47px Consolas, monospace';
    ctx.letterSpacing = '7px';
    ctx.fillText('Zero Emission', 38, 228);
    ctx.fillStyle = 'rgba(238, 248, 240, 0.42)';
    ctx.fillRect(38, 274, 430, 3);
    ctx.font = '400 24px Consolas, monospace';
    ctx.fillStyle = 'rgba(230, 243, 236, 0.48)';
    ctx.letterSpacing = '3px';
    ctx.fillText('NINGYUAN DIANKUN / 2026', 38, 320);
  });
}

/** 吃水标尺；数字采用海事涂装样式 */
function makeDraftMarkTexture() {
  return canvasTexture(384, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(236, 245, 239, 0.88)';
    ctx.strokeStyle = 'rgba(236, 245, 239, 0.55)';
    ctx.font = '500 46px Consolas, monospace';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 10; i += 1) {
      const y = 56 + i * 100;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(236,245,239,.72)' : 'rgba(236,245,239,.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(i % 2 === 0 ? 116 : 82, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(236, 245, 239, 0.75)';
      ctx.fillText(`${(10 - i).toFixed(0)}M`, 134, y + 2);
    }
  });
}

function makeBootStripeTexture() {
  return canvasTexture(
    512,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#d5dfd8';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(30, 52, 47, 0.22)';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, h - 2, w, 2);
    },
    { repeat: [32, 1] }
  );
}

function makeVentTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#425552';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#091110';
    for (let y = 32; y < h - 32; y += 26) {
      for (let x = 36; x < w - 36; x += 26) {
        ctx.beginPath();
        ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(210, 225, 216, 0.35)';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  });
}

/* -------------------------------------------------------------------------- */
/* 材质库                                                                       */
/* -------------------------------------------------------------------------- */
export function createMaterialLibrary() {
  const paintNoise = makePaintNoise();
  const deckTexture = makeDeckTexture();
  const containerTexture = makeContainerTexture();
  const solarTexture = makeSolarTexture();
  const deckhouseTexture = makeDeckhouseTexture();
  const batteryTexture = makeBatteryTexture();
  const nameTexture = makeNameTexture();
  const brandTexture = makeHullBrandTexture();
  const sternMarkTexture = makeSternMarkTexture();
  const draftMarkTexture = makeDraftMarkTexture();
  const bootStripeTexture = makeBootStripeTexture();
  const ventTexture = makeVentTexture();

  const materials = {
    hullGreen: new THREE.MeshPhysicalMaterial({
      color: 0x10ab43,
      metalness: 0.22,
      roughness: 0.4,
      clearcoat: 0.32,
      clearcoatRoughness: 0.28,
      roughnessMap: paintNoise,
      envMapIntensity: 0.72
    }),
    hullRed: new THREE.MeshStandardMaterial({
      color: 0x5f2421,
      metalness: 0.16,
      roughness: 0.52,
      roughnessMap: paintNoise,
      envMapIntensity: 0.55
    }),
    bootStripe: new THREE.MeshStandardMaterial({
      map: bootStripeTexture,
      color: 0xd3ddd5,
      roughness: 0.45,
      metalness: 0.15,
      envMapIntensity: 0.6
    }),
    deck: new THREE.MeshStandardMaterial({
      map: deckTexture,
      color: 0x8b9991,
      metalness: 0.22,
      roughness: 0.7,
      envMapIntensity: 0.62
    }),
    deckDark: new THREE.MeshStandardMaterial({
      color: 0x1f2c2a,
      roughness: 0.66,
      metalness: 0.28,
      emissive: 0x07110e,
      emissiveIntensity: 0.25
    }),
    superstructure: new THREE.MeshPhysicalMaterial({
      map: deckhouseTexture,
      color: 0xffffff,
      metalness: 0.16,
      roughness: 0.36,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.9
    }),
    superstructurePlain: new THREE.MeshPhysicalMaterial({
      color: 0xbfcbc3,
      metalness: 0.12,
      roughness: 0.42,
      clearcoat: 0.24,
      clearcoatRoughness: 0.36,
      envMapIntensity: 0.68
    }),
    greenHouse: new THREE.MeshPhysicalMaterial({
      color: 0x11a540,
      metalness: 0.3,
      roughness: 0.37,
      clearcoat: 0.4,
      clearcoatRoughness: 0.26,
      roughnessMap: paintNoise,
      envMapIntensity: 0.9
    }),
    whiteTrim: new THREE.MeshStandardMaterial({
      color: 0xc7d2ca,
      metalness: 0.18,
      roughness: 0.4,
      envMapIntensity: 0.62
    }),
    deckWhite: new THREE.MeshStandardMaterial({
      color: 0xa7b6ae,
      metalness: 0.18,
      roughness: 0.54
    }),
    railWhite: new THREE.MeshStandardMaterial({
      color: 0xc5cfc8,
      metalness: 0.34,
      roughness: 0.34
    }),
    railGreen: new THREE.MeshStandardMaterial({
      color: 0x0e8d3b,
      metalness: 0.26,
      roughness: 0.4
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x172628,
      metalness: 0.62,
      roughness: 0.32
    }),
    interiorDark: new THREE.MeshStandardMaterial({
      color: 0x071210,
      metalness: 0.36,
      roughness: 0.62
    }),
    cargoHoldWall: new THREE.MeshStandardMaterial({
      color: 0x1a3831,
      metalness: 0.36,
      roughness: 0.56,
      emissive: 0x061713,
      emissiveIntensity: 0.38,
      side: THREE.DoubleSide
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x020d12,
      metalness: 0.58,
      roughness: 0.07,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: 0x031618,
      emissiveIntensity: 0.2,
      envMapIntensity: 1.25
    }),
    glassLit: new THREE.MeshStandardMaterial({
      color: 0x2f5a5b,
      metalness: 0.45,
      roughness: 0.18,
      emissive: 0x69cbbb,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.9
    }),
    windowLight: new THREE.MeshBasicMaterial({
      color: 0x8be5cf,
      transparent: true,
      opacity: 0.08,
      toneMapped: false
    }),
    bridgeLight: new THREE.MeshBasicMaterial({
      color: 0xc8fff0,
      transparent: true,
      opacity: 0.34,
      toneMapped: false
    }),
    yellow: new THREE.MeshStandardMaterial({
      color: 0xd4a339,
      metalness: 0.35,
      roughness: 0.42
    }),
    safetyOrange: new THREE.MeshStandardMaterial({
      color: 0xd76f3e,
      metalness: 0.15,
      roughness: 0.5
    }),
    redSafety: new THREE.MeshStandardMaterial({
      color: 0xa93c32,
      metalness: 0.2,
      roughness: 0.42
    }),
    greenBattery: new THREE.MeshPhysicalMaterial({
      map: batteryTexture,
      color: 0xffffff,
      metalness: 0.38,
      roughness: 0.38,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1
    }),
    batteryBase: new THREE.MeshStandardMaterial({
      color: 0x0b2621,
      metalness: 0.55,
      roughness: 0.4
    }),
    batteryGlow: new THREE.MeshBasicMaterial({
      color: 0x42ffb1,
      transparent: true,
      opacity: 0.45,
      toneMapped: false,
      depthWrite: false
    }),
    electricBlue: new THREE.MeshBasicMaterial({
      color: 0x44dfff,
      transparent: true,
      opacity: 0.62,
      toneMapped: false,
      depthWrite: false
    }),
    electricCyan: new THREE.MeshBasicMaterial({
      color: 0x8cf8ff,
      transparent: true,
      opacity: 0.3,
      toneMapped: false,
      depthWrite: false
    }),
    motorMetal: new THREE.MeshStandardMaterial({
      color: 0x49636a,
      metalness: 0.82,
      roughness: 0.26
    }),
    motorCopper: new THREE.MeshStandardMaterial({
      color: 0xa97046,
      metalness: 0.9,
      roughness: 0.25
    }),
    shaft: new THREE.MeshStandardMaterial({
      color: 0x839395,
      metalness: 0.94,
      roughness: 0.2
    }),
    propeller: new THREE.MeshStandardMaterial({
      color: 0xb58b52,
      metalness: 0.92,
      roughness: 0.26
    }),
    pv: new THREE.MeshPhysicalMaterial({
      map: solarTexture,
      color: 0xffffff,
      metalness: 0.55,
      roughness: 0.24,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.1
    }),
    pvFrame: new THREE.MeshStandardMaterial({
      color: 0x9ca9a3,
      metalness: 0.7,
      roughness: 0.28
    }),
    vent: new THREE.MeshStandardMaterial({
      map: ventTexture,
      color: 0xffffff,
      metalness: 0.42,
      roughness: 0.45
    }),
    nameDecal: new THREE.MeshStandardMaterial({
      map: nameTexture,
      transparent: true,
      roughness: 0.4,
      metalness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide
    }),
    brandDecal: new THREE.MeshStandardMaterial({
      map: brandTexture,
      transparent: true,
      roughness: 0.42,
      metalness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide
    }),
    sternDecal: new THREE.MeshStandardMaterial({
      map: sternMarkTexture,
      transparent: true,
      roughness: 0.42,
      metalness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide
    }),
    draftDecal: new THREE.MeshStandardMaterial({
      map: draftMarkTexture,
      transparent: true,
      roughness: 0.5,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      side: THREE.DoubleSide
    }),
    container: new THREE.MeshStandardMaterial({
      map: containerTexture,
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.46,
      envMapIntensity: 0.9
    }),
    containerTeal: new THREE.MeshStandardMaterial({
      map: containerTexture,
      color: 0x8ad4c2,
      metalness: 0.3,
      roughness: 0.48
    }),
    lineStructure: new THREE.LineBasicMaterial({
      color: 0x6af4c4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }),
    lineHighlight: new THREE.LineBasicMaterial({
      color: 0x7df4ff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      toneMapped: false
    }),
    dimension: new THREE.LineBasicMaterial({
      color: 0x75e8ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: false,
      toneMapped: false
    }),
    energyBattery: new THREE.LineBasicMaterial({
      color: 0x4eef9c,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }),
    energyPower: new THREE.LineDashedMaterial({
      color: 0x5ee7ff,
      transparent: true,
      opacity: 0.68,
      dashSize: 1.4,
      gapSize: 1.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }),
    energyProp: new THREE.LineDashedMaterial({
      color: 0xffc56f,
      transparent: true,
      opacity: 0.65,
      dashSize: 1,
      gapSize: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }),
    hologramFill: new THREE.MeshBasicMaterial({
      color: 0x4ae4b4,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }),
    hologramEdge: new THREE.LineBasicMaterial({
      color: 0x6bffd2,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  };

  const textures = {
    paintNoise,
    deckTexture,
    containerTexture,
    solarTexture,
    deckhouseTexture,
    batteryTexture,
    nameTexture,
    brandTexture,
    sternMarkTexture,
    draftMarkTexture,
    bootStripeTexture,
    ventTexture
  };

  return { materials, textures };
}

/** 创建单面船名/标识投影平面，便于在外壳表面实现无深度穿模的贴花 */
export function createDecalPlane(width, height, material, position, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.y = rotationY;
  mesh.renderOrder = 8;
  return mesh;
}
