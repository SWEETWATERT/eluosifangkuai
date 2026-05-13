import { TEXT_COLOR, ACCENT_COLOR, BG_COLOR, drawGlowText, roundRect } from '../utils/colors.js';

// Game Over scene
// Shows final score, stats, revive button (ad), share button, retry button

export class GameOverScene {
  constructor(canvas, ctx, dpr) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = dpr;

    this.stats = null;
    this.animProgress = 0; // entrance animation
    this.buttons = [];

    this.callbacks = {
      onRevive: null,   // watch ad to revive
      onDouble: null,   // watch ad to double score
      onRetry: null,    // play again
      onMenu: null,     // back to menu
      onShare: null,    // share to friend
    };
  }

  show(stats) {
    this.stats = stats;
    this.animProgress = 0;
    this._buildButtons();
  }

  _buildButtons() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;

    const btnW = w * 0.5;
    const btnH = 50;
    const startY = h * 0.55;

    this.buttons = [
      {
        id: 'revive',
        label: '看视频复活',
        x: centerX - btnW / 2,
        y: startY,
        w: btnW,
        h: btnH,
        color: '#ff4400',
        glow: '#ff8844',
        prominent: true,
      },
      {
        id: 'double',
        label: '看视频双倍积分',
        x: centerX - btnW / 2,
        y: startY + btnH + 10,
        w: btnW,
        h: btnH,
        color: '#ffaa00',
        glow: '#ffcc44',
        prominent: false,
      },
      {
        id: 'retry',
        label: '再来一局',
        x: centerX - btnW / 2,
        y: startY + btnH * 2 + 14,
        w: btnW,
        h: btnH,
        color: '#00ffff',
        glow: '#00ffff',
        prominent: true,
      },
      {
        id: 'share',
        label: '分享给好友',
        x: centerX - btnW * 0.7 / 2,
        y: startY + btnH * 3 + 18,
        w: btnW * 0.7,
        h: btnH * 0.8,
        color: '#888',
        glow: '#444',
        prominent: false,
      },
      {
        id: 'menu',
        label: '返回主菜单',
        x: centerX - btnW * 0.6 / 2,
        y: startY + btnH * 4 + 16,
        w: btnW * 0.6,
        h: btnH * 0.7,
        color: '#666',
        glow: '#333',
        prominent: false,
      },
    ];
  }

  update(dt) {
    if (this.animProgress < 1) {
      this.animProgress = Math.min(1, this.animProgress + dt / 400);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const p = this.animProgress;

    // Overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * p})`;
    ctx.fillRect(0, 0, w, h);

    // Title
    const titleY = h * 0.12 + (1 - p) * -30;
    ctx.save();
    ctx.globalAlpha = p;
    drawGlowText(ctx, '游戏结束', w / 2, titleY, 36, '#ff4444', '#ff4444');
    ctx.restore();

    if (!this.stats) return;

    // Stats panel
    const panelW = w * 0.7;
    const panelH = 140;
    const panelX = (w - panelW) / 2;
    const panelY = h * 0.2;

    ctx.save();
    ctx.globalAlpha = p;

    // Panel background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // Stats
    const stats = [
      { label: '最终得分', value: this.stats.score.toLocaleString(), color: '#ffffff' },
      { label: '等级', value: this.stats.level, color: '#00ffff' },
      { label: '消除行数', value: this.stats.lines, color: '#00ff88' },
      { label: '最大连击', value: `x${this.stats.maxCombo}`, color: '#ff00ff' },
    ];

    let sy = panelY + 20;
    for (const stat of stats) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#888';
      ctx.font = `14px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillText(stat.label, panelX + 24, sy);

      ctx.textAlign = 'right';
      ctx.fillStyle = stat.color;
      ctx.font = `bold 18px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.shadowColor = stat.color;
      ctx.shadowBlur = 4;
      ctx.fillText(String(stat.value), panelX + panelW - 24, sy);
      ctx.shadowBlur = 0;

      sy += 28;
    }

    ctx.restore();

    // Buttons
    for (const btn of this.buttons) {
      this._drawButton(btn, p);
    }
  }

  _drawButton(btn, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow for prominent buttons
    if (btn.prominent) {
      ctx.shadowColor = btn.glow;
      ctx.shadowBlur = 10;
    }

    // Background
    ctx.fillStyle = 'rgba(10, 20, 40, 0.95)';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = btn.color;
    ctx.lineWidth = btn.prominent ? 2 : 1;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = btn.color;
    const size = btn.prominent ? 20 : 16;
    ctx.font = `bold ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);

    ctx.restore();
  }

  handleTouch(x, y) {
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        const cb = this.callbacks[btn.id === 'revive' ? 'onRevive' :
          btn.id === 'double' ? 'onDouble' :
          btn.id === 'retry' ? 'onRetry' :
          btn.id === 'share' ? 'onShare' :
          btn.id === 'menu' ? 'onMenu' : ''];
        if (cb) cb();
        return btn.id;
      }
    }
    return null;
  }

  destroy() {}
}
