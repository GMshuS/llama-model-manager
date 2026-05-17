import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, 'tray-icon.svg');

// 创建一个 32x32 的 PNG，使用 SVG 中的颜色方案
// 由于 pngjs 不能直接解析 SVG，我们手动创建一个匹配的 PNG
// 基于 SVG 的颜色：背景 #1e1b4b -> #0f0d2e 渐变，节点 #818cf8 和 #c4b5fd

const png = new PNG({ width: 32, height: 32 });

// 背景渐变（简化版，从左上到右下）
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    const idx = (y * 32 + x) * 4;
    const t = (x + y) / 64; // 0 to 1 diagonal gradient
    
    // #1e1b4b (30,27,75) to #0f0d2e (15,13,46)
    const r = Math.round(30 + (15 - 30) * t);
    const g = Math.round(27 + (13 - 27) * t);
    const b = Math.round(75 + (46 - 75) * t);
    
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = 255; // alpha
  }
}

// 绘制简化的神经网络节点（匹配 SVG 布局）
const nodes = [
  { x: 8, y: 8, color: [129, 140, 248] },    // #818cf8
  { x: 8, y: 16, color: [129, 140, 248] },
  { x: 8, y: 26, color: [129, 140, 248] },
  { x: 16, y: 6, color: [129, 140, 248] },
  { x: 16, y: 16, color: [129, 140, 248] },
  { x: 16, y: 26, color: [129, 140, 248] },
  { x: 24, y: 10, color: [196, 181, 253] },  // #c4b5fd
  { x: 24, y: 22, color: [196, 181, 253] },
];

// 绘制连线（半透明 #6366f1）
const lines = [
  [8, 8, 16, 6], [8, 8, 16, 16], [8, 8, 16, 26],
  [8, 16, 16, 6], [8, 16, 16, 16], [8, 16, 16, 26],
  [8, 26, 16, 6], [8, 26, 16, 16], [8, 26, 16, 26],
  [16, 6, 24, 10], [16, 6, 24, 22],
  [16, 16, 24, 10], [16, 16, 24, 22],
  [16, 26, 24, 10], [16, 26, 24, 22],
];

for (const [x1, y1, x2, y2] of lines) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 4;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    if (x >= 0 && x < 32 && y >= 0 && y < 32) {
      const idx = (y * 32 + x) * 4;
      // 混合颜色（50% 透明度）
      png.data[idx] = Math.round(png.data[idx] * 0.5 + 99 * 0.5);     // #6366f1 R=99
      png.data[idx + 1] = Math.round(png.data[idx + 1] * 0.5 + 102 * 0.5); // G=102
      png.data[idx + 2] = Math.round(png.data[idx + 2] * 0.5 + 241 * 0.5); // B=241
    }
  }
}

// 绘制节点（半径 2.5 像素）
for (const node of nodes) {
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 2.5) {
        const px = node.x + dx;
        const py = node.y + dy;
        if (px >= 0 && px < 32 && py >= 0 && py < 32) {
          const idx = (py * 32 + px) * 4;
          png.data[idx] = node.color[0];
          png.data[idx + 1] = node.color[1];
          png.data[idx + 2] = node.color[2];
          png.data[idx + 3] = 255;
        }
      }
    }
  }
}

// 添加圆角（简化版）
const cornerRadius = 7;
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    const idx = (y * 32 + x) * 4;
    let isCorner = false;
    
    // 检查四个角
    const corners = [
      { cx: cornerRadius, cy: cornerRadius },
      { cx: 31 - cornerRadius, cy: cornerRadius },
      { cx: cornerRadius, cy: 31 - cornerRadius },
      { cx: 31 - cornerRadius, cy: 31 - cornerRadius },
    ];
    
    for (const { cx, cy } of corners) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > cornerRadius * cornerRadius) {
        if ((x < cornerRadius || x > 31 - cornerRadius) && 
            (y < cornerRadius || y > 31 - cornerRadius)) {
          isCorner = true;
        }
      }
    }
    
    if (isCorner) {
      png.data[idx + 3] = 0; // 透明
    }
  }
}

png.pack().pipe(fs.createWriteStream(path.join(__dirname, 'tray-icon.png')));
console.log('✓ Created tray-icon.png (32x32)');
