import { SCORE } from '../utils/constants.js';

// Full Tetris scoring system
// Tracks: score, combo, back-to-back, T-spin detection

export class ScoreSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.combo = 0; // consecutive line clears
    this.maxCombo = 0;
    this.backToBack = false; // consecutive "difficult" clears (Tetris or T-Spin)
    this.lastMoveWasTSpin = false;
    this.tSpinCount = 0;
    this.totalLines = 0;
  }

  addHardDrop(cells) {
    this.score += cells * SCORE.HARD_DROP;
  }

  addSoftDrop(cells) {
    this.score += cells * SCORE.SOFT_DROP;
  }

  // Call when lines are cleared. Returns points earned for this clear.
  addLineClear(lineCount, isTSpin, level) {
    let points = 0;

    if (lineCount > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      if (isTSpin) {
        this.tSpinCount++;
        switch (lineCount) {
          case 1: points = SCORE.T_SPIN_SINGLE * level; break;
          case 2: points = SCORE.T_SPIN_DOUBLE * level; break;
          case 3: points = SCORE.T_SPIN_TRIPLE * level; break;
          default: points = SCORE.TETRIS * level;
        }
        this.backToBack = true;
      } else {
        switch (lineCount) {
          case 1: points = SCORE.SINGLE * level; break;
          case 2: points = SCORE.DOUBLE * level; break;
          case 3: points = SCORE.TRIPLE * level; break;
          case 4: points = SCORE.TETRIS * level; this.backToBack = true; break;
        }
        // Reset back-to-back on non-difficult clears
        if (lineCount < 4) {
          this.backToBack = false;
        }
      }

      // Back-to-back bonus
      if (this.backToBack && (lineCount === 4 || isTSpin)) {
        points = Math.floor(points * 1.5);
      }

      // Combo bonus
      if (this.combo > 1) {
        points += SCORE.COMBO * this.combo * level;
      }
    } else {
      this.combo = 0;
    }

    this.score += points;
    this.totalLines += lineCount;
    this.lastMoveWasTSpin = isTSpin;
    return points;
  }

  resetCombo() {
    this.combo = 0;
    this.lastMoveWasTSpin = false;
  }

  // Simple T-spin detection: piece is T, last move was rotation,
  // and 3 of 4 corners around the T center are occupied
  checkTSpin(board, piece) {
    if (piece.type !== 'T') return false;

    // Check if last move was a rotation (handled by caller)
    // Check the 4 corners around the T's center
    const cx = piece.x + 1;
    const cy = piece.y + 1;
    const corners = [
      board.getCell(cy - 1, cx - 1), // top-left
      board.getCell(cy - 1, cx + 1), // top-right
      board.getCell(cy + 1, cx - 1), // bottom-left
      board.getCell(cy + 1, cx + 1), // bottom-right
    ];
    const occupied = corners.filter(c => c !== null).length;
    return occupied >= 3;
  }
}
