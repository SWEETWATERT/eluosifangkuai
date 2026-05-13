import { CELL, PIECE_COLORS, FEVER_COLOR, FEVER_GLOW } from '../utils/constants.js';
import { TEXT_COLOR, TEXT_GLOW, ACCENT_COLOR, getPieceColor, drawGlowText, roundRect } from '../utils/colors.js';
import { getRotationState } from '../core/Piece.js';

// Heads-Up Display: score, level, lines, next pieces, hold piece, fever gauge
// Rendered on the right side of the board (portrait layout)

export class HUD {
  constructor(ctx, dpr) {
    this.ctx = ctx;
    this.dpr = dpr;
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.boardBounds = null;
  }

  layout(canvasW, canvasH, boardBounds) {
    this.boardBounds = boardBounds;

    // HUD is on the right side
    this.x = boardBounds.x + boardBounds.w + 10;
    this.y = boardBounds.y;
    this.w = canvasW - (boardBounds.x + boardBounds.w + 20);
    this.h = boardBounds.h;
  }

  draw(state) {
    const ctx = this.ctx;
    let yPos = this.y;

    // Hold piece
    yPos = this._drawHoldPiece(yPos, state.holdPiece);

    yPos += 16;

    // Score
    yPos = this._drawStat(yPos, '分数', state.score);
    yPos += 8;

    // Level
    yPos = this._drawStat(yPos, '等级', state.level);
    yPos += 8;

    // Lines
    yPos = this._drawStat(yPos, '行数', state.lines);
    yPos += 8;

    // Combo
    if (state.combo > 1) {
      yPos = this._drawStat(yPos, '连击', `x${state.combo}`, ACCENT_COLOR);
      yPos += 8;
    }

    // Fever gauge
    yPos += 8;
    yPos = this._drawFeverGauge(yPos, state.feverProgress, state.isFever);

    // Next pieces
    yPos += 16;
    yPos = this._drawNextPieces(yPos, state.nextPieces);
  }

  _drawHoldPiece(y, piece) {
    const ctx = this.ctx;
    const labelH = 18;
    const boxSize = CELL * 2.5;

    ctx.fillStyle = '#555';
    ctx.font = `bold 12px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('暂存', this.x + this.w / 2, y);
    y += labelH;

    // Box
    const bx = this.x + (this.w - boxSize) / 2;
    ctx.strokeStyle = piece ? '#00ffff' : '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, y, boxSize, boxSize);

    if (piece) {
      const shape = getRotationState(piece.type, 0);
      const size = shape.length;
      const miniCell = boxSize / 4;
      const offsetX = bx + (boxSize - size * miniCell) / 2;
      const offsetY = y + (boxSize - size * miniCell) / 2;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (shape[r][c]) {
            const color = getPieceColor(piece.type);
            ctx.fillStyle = color.fill;
            ctx.shadowColor = color.glow;
            ctx.shadowBlur = 3;
            roundRect(ctx,
              offsetX + c * miniCell + 1,
              offsetY + r * miniCell + 1,
              miniCell - 2, miniCell - 2, 2
            );
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    return y + boxSize;
  }

  _drawNextPieces(y, pieces) {
    const ctx = this.ctx;
    const labelH = 18;
    const boxSize = CELL * 2;

    ctx.fillStyle = '#555';
    ctx.font = `bold 12px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('下一个', this.x + this.w / 2, y);
    y += labelH;

    for (const piece of pieces) {
      const bx = this.x + (this.w - boxSize) / 2;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, y, boxSize, boxSize * 0.8);

      const shape = piece.shape;
      const size = piece.size;
      const miniCell = boxSize / 4;
      const offsetX = bx + (boxSize - size * miniCell) / 2;
      const offsetY = y + (boxSize * 0.8 - size * miniCell) / 2;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (shape[r][c]) {
            const color = getPieceColor(piece.type);
            ctx.fillStyle = color.fill;
            ctx.shadowColor = color.glow;
            ctx.shadowBlur = 2;
            roundRect(ctx,
              offsetX + c * miniCell + 1,
              offsetY + r * miniCell + 1,
              miniCell - 2, miniCell - 2, 2
            );
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      y += boxSize * 0.8 + 8;
    }

    return y;
  }

  _drawStat(y, label, value, colorOverride) {
    const ctx = this.ctx;
    const labelColor = '#888';
    const valueColor = colorOverride || TEXT_COLOR;

    ctx.textAlign = 'center';

    // Label
    ctx.fillStyle = labelColor;
    ctx.font = `12px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(label, this.x + this.w / 2, y);
    y += 16;

    // Value
    ctx.fillStyle = valueColor;
    ctx.font = `bold 22px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.shadowColor = TEXT_GLOW;
    ctx.shadowBlur = 4;
    const text = typeof value === 'number' ? value.toLocaleString() : String(value);
    ctx.fillText(text, this.x + this.w / 2, y);
    ctx.shadowBlur = 0;
    y += 26;

    return y;
  }

  _drawFeverGauge(y, progress, isFever) {
    const ctx = this.ctx;
    const barW = this.w - 4;
    const barH = 10;
    const barX = this.x + 2;

    // Label
    ctx.fillStyle = '#888';
    ctx.font = `bold 12px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isFever ? '狂热!' : '狂热槽', this.x + this.w / 2, y);
    y += 16;

    // Background
    ctx.fillStyle = '#1a1a3a';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    roundRect(ctx, barX, y, barW, barH, barH / 2);
    ctx.fill();
    ctx.stroke();

    // Fill
    if (progress > 0) {
      const fillW = (progress / 100) * (barW - 2);
      const fillColor = isFever ? FEVER_COLOR : '#00ffff';
      const glowColor = isFever ? FEVER_GLOW : '#00ffff';

      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isFever ? 12 : 6;
      const grad = ctx.createLinearGradient(barX, y, barX + fillW, y);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, isFever ? '#ff8800' : '#00ff88');
      ctx.fillStyle = grad;
      roundRect(ctx, barX + 1, y + 1, Math.max(barH, fillW), barH - 2, barH / 2);
      ctx.fill();
      ctx.restore();
    }

    return y + barH;
  }
}
