import { TEXT_COLOR, TEXT_GLOW, ACCENT_COLOR, BG_COLOR, drawGlowText } from '../utils/colors.js';

// Main menu scene
// Shows logo, play button, daily challenge, leaderboard, settings

export class MenuScene {
  constructor(canvas, ctx, dpr) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = dpr;

    this.buttons = [];
    this.animTime = 0;

    this.callbacks = {
      onPlay: null,
      onDaily: null,
      onLeaderboard: null,
    };
  }

  init() {
    this._buildButtons();
  }

  _buildButtons() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const btnW = w * 0.5;
    const btnH = 56;
    const centerX = w / 2;

    this.buttons = [
      {
        id: 'play',
        label: '开始游戏',
        x: centerX - btnW / 2,
        y: h * 0.45,
        w: btnW,
        h: btnH,
        color: '#00ffff',
        glow: '#00ffff',
      },
      {
        id: 'daily',
        label: '每日挑战',
        x: centerX - btnW / 2,
        y: h * 0.45 + btnH + 16,
        w: btnW,
        h: btnH * 0.8,
        color: '#ff00ff',
        glow: '#ff00ff',
      },
      {
        id: 'leaderboard',
        label: '排行榜',
        x: centerX - btnW * 0.35,
        y: h * 0.45 + btnH * 2 + 24,
        w: btnW * 0.7,
        h: btnH * 0.7,
        color: '#888888',
        glow: '#444444',
      },
    ];
  }

  update(dt) {
    this.animTime += dt;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Animated grid background
    this._drawAnimatedGrid();

    // Title
    this._drawTitle();

    // Buttons
    for (const btn of this.buttons) {
      this._drawButton(btn);
    }

    // High score (small text at bottom)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('v1.0 — 方块大作战', w / 2, h - 40);
  }

  _drawAnimatedGrid() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gridSize = 30;

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    const offset = (this.animTime * 0.02) % gridSize;

    for (let x = -gridSize + offset; x < w + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h * 0.3, h);
      ctx.stroke();
    }
  }

  _drawTitle() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Main title with glow
    ctx.save();
    drawGlowText(ctx, '方块大作战', w / 2, h * 0.15, 42, '#ffffff', '#00ffff');

    // Subtitle
    ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.fillText('BLOCK BATTLE', w / 2, h * 0.15 + 36);

    // Decorative pieces falling in background
    const pieces = [
      { type: 'T', x: w * 0.2, y: h * 0.22, rot: this.animTime * 0.001 },
      { type: 'S', x: w * 0.7, y: h * 0.18, rot: -this.animTime * 0.0008 },
      { type: 'L', x: w * 0.5, y: h * 0.26, rot: this.animTime * 0.0012 },
    ];

    ctx.restore();
  }

  _drawButton(btn) {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.animTime * 0.003) * 0.03;

    ctx.save();

    // Glow
    ctx.shadowColor = btn.glow;
    ctx.shadowBlur = 12;

    // Background
    const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y);
    grad.addColorStop(0, 'rgba(0, 20, 40, 0.9)');
    grad.addColorStop(0.5, 'rgba(0, 40, 60, 0.9)');
    grad.addColorStop(1, 'rgba(0, 20, 40, 0.9)');
    ctx.fillStyle = grad;
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = btn.color;
    ctx.lineWidth = 2;
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = btn.color;
    ctx.font = `bold ${20 * pulse}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
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

  handleTouch(x, y) {
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        switch (btn.id) {
          case 'play':
            if (this.callbacks.onPlay) this.callbacks.onPlay();
            return;
          case 'daily':
            if (this.callbacks.onDaily) this.callbacks.onDaily();
            return;
          case 'leaderboard':
            if (this.callbacks.onLeaderboard) this.callbacks.onLeaderboard();
            return;
        }
      }
    }
  }

  destroy() {}
}
