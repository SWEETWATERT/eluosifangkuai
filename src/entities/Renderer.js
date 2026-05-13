import { COLS, ROWS, CELL, GHOST_ALPHA } from '../utils/constants.js';
import { BG_COLOR, GRID_COLOR, GRID_LINE_COLOR, getPieceColor, roundRect } from '../utils/colors.js';

// Renders the board, pieces, ghost piece, and effects on the canvas

export class Renderer {
  constructor(canvas, ctx, dpr) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = dpr;

    // Layout calculations — computed in layout()
    this.boardX = 0;
    this.boardY = 0;
    this.cellSize = CELL;
    this.boardW = COLS * CELL;
    this.boardH = ROWS * CELL;
    this.effects = []; // visual effects to render
  }

  // Call on resize / init to recalculate layout
  layout() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Board is centered, with room for HUD on sides or top
    this.cellSize = Math.floor(Math.min(
      (w * 0.6) / COLS,
      (h * 0.85) / ROWS,
      36 // max cell size
    ));
    this.boardW = COLS * this.cellSize;
    this.boardH = ROWS * this.cellSize;
    this.boardX = Math.floor((w - this.boardW) / 2);
    this.boardY = Math.floor((h - this.boardH) / 2);
  }

  clear() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid pattern on the background
    ctx.fillStyle = GRID_COLOR;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((r + c) % 2 === 0) {
          const x = this.boardX + c * this.cellSize;
          const y = this.boardY + r * this.cellSize;
          ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
      }
    }
  }

  drawBoard(board) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Board border glow
    ctx.save();
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.boardX - 1, this.boardY - 1,
      this.boardW + 2, this.boardH + 2
    );
    ctx.restore();

    // Grid lines
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      const y = this.boardY + r * cs;
      ctx.beginPath();
      ctx.moveTo(this.boardX, y);
      ctx.lineTo(this.boardX + this.boardW, y);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      const x = this.boardX + c * cs;
      ctx.beginPath();
      ctx.moveTo(x, this.boardY);
      ctx.lineTo(x, this.boardY + this.boardH);
      ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = board.getCell(r, c);
        if (type) {
          this._drawCell(c, r, type, 1);
        }
      }
    }
  }

  drawPiece(piece, alpha = 1) {
    const shape = piece.shape;
    const size = piece.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (shape[r][c]) {
          this._drawCell(piece.x + c, piece.y + r, piece.type, alpha);
        }
      }
    }
  }

  drawGhost(piece, ghostY) {
    const shape = piece.shape;
    const size = piece.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (shape[r][c]) {
          this._drawCell(piece.x + c, ghostY + r, piece.type, GHOST_ALPHA);
        }
      }
    }
  }

  _drawCell(col, row, type, alpha) {
    if (row < 0) return; // above visible area
    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = this.boardX + col * cs;
    const y = this.boardY + row * cs;
    const pad = 1; // gap between cells
    const color = getPieceColor(type);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (alpha < 1) {
      // Ghost piece: just an outline
      ctx.strokeStyle = color.glow;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = alpha * 2;
      roundRect(ctx, x + pad + 1, y + pad + 1, cs - pad * 2 - 2, cs - pad * 2 - 2, 3);
      ctx.stroke();
    } else {
      // Solid piece with neon glow
      const gx = x + pad;
      const gy = y + pad;
      const gw = cs - pad * 2;
      const gh = cs - pad * 2;

      // Glow
      ctx.shadowColor = color.glow;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color.fill;
      roundRect(ctx, gx, gy, gw, gh, 3);
      ctx.fill();

      // Inner highlight (top-left lighter)
      ctx.shadowBlur = 0;
      const grad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      grad.addColorStop(0, 'rgba(255,255,255,0.25)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = grad;
      roundRect(ctx, gx, gy, gw, gh, 3);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      roundRect(ctx, gx, gy, gw, gh, 3);
      ctx.stroke();
    }

    ctx.restore();
  }

  getBoardBounds() {
    return {
      x: this.boardX,
      y: this.boardY,
      w: this.boardW,
      h: this.boardH,
      cellSize: this.cellSize,
    };
  }
}
