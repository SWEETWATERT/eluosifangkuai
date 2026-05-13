import { PIECE_COLORS } from './constants.js';

// Neon theme
export const BG_COLOR = '#0a0a1a';
export const GRID_COLOR = '#1a1a3a';
export const GRID_LINE_COLOR = '#2a2a4a';
export const GHOST_ALPHA = 0.15;
export const TEXT_COLOR = '#ffffff';
export const TEXT_GLOW = '#00ffff';
export const ACCENT_COLOR = '#ff00ff';
export const FEVER_COLOR = '#ff4400';
export const FEVER_GLOW = '#ff8844';

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
