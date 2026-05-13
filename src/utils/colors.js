import { PIECE_COLORS } from './constants.js';

// Neon glass arcade theme
export const BG_COLOR = '#070a18';
export const GRID_COLOR = 'rgba(124,246,255,0.035)';
export const GRID_LINE_COLOR = 'rgba(124,246,255,0.12)';
export const GHOST_ALPHA = 0.15;
export const TEXT_COLOR = '#ffffff';
export const TEXT_GLOW = '#22dfff';
export const ACCENT_COLOR = '#ff6fd8';
export const FEVER_COLOR = '#ffab45';
export const FEVER_GLOW = '#ffd39a';

// Get piece color data
export function getPieceColor(type) {
  return PIECE_COLORS[type] || { fill: '#ffffff', glow: '#ffffff' };
}

// Lerp between two hex colors
export function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// Draw a rounded rect
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawBackdrop(ctx, w, h, time = 0) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#070a18');
  bg.addColorStop(0.48, '#101535');
  bg.addColorStop(1, '#060812');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cyan = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, h * 0.55);
  cyan.addColorStop(0, 'rgba(34,223,255,0.18)');
  cyan.addColorStop(1, 'rgba(34,223,255,0)');
  ctx.fillStyle = cyan;
  ctx.fillRect(0, 0, w, h);

  const magenta = ctx.createRadialGradient(w * 0.82, h * 0.76, 0, w * 0.82, h * 0.76, h * 0.5);
  magenta.addColorStop(0, 'rgba(255,69,176,0.15)');
  magenta.addColorStop(1, 'rgba(255,69,176,0)');
  ctx.fillStyle = magenta;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = 'rgba(124,246,255,0.055)';
  ctx.lineWidth = 1;
  const gap = 34;
  const offset = (time * 0.018) % gap;
  for (let x = -gap + offset; x < w + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, h * 0.08);
    ctx.lineTo(x + h * 0.28, h);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPanel(ctx, x, y, w, h, accent = 'rgba(124,246,255,0.35)', alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(17,28,61,0.92)');
  grad.addColorStop(1, 'rgba(7,11,27,0.84)');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.shadowColor = '#22dfff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.restore();
}

// Draw text with glow effect
export function drawGlowText(ctx, text, x, y, fontSize, color, glowColor, align = 'center') {
  ctx.save();
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  // Glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = fontSize * 0.5;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  // Sharp top layer
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}
