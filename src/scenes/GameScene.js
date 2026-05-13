import { Board } from '../core/Board.js';
import { PieceBag } from '../core/PieceBag.js';
import { GameLoop, GameState } from '../core/GameLoop.js';
import { InputSystem } from '../systems/InputSystem.js';
import { Renderer } from '../entities/Renderer.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { FeverSystem } from '../systems/FeverSystem.js';
import { HUD } from '../ui/HUD.js';
import { getWallKicks, getRotationState } from '../core/Piece.js';
import { COLS, ROWS, CELL, FEVER_SCORE_MULTIPLIER } from '../utils/constants.js';
import { getPieceColor } from '../utils/colors.js';

export class GameScene {
  constructor(canvas, ctx, dpr, onGameOver) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.dpr = dpr;
    this.onGameOver = onGameOver;

    // Core systems
    this.board = new Board();
    this.bag = new PieceBag();
    this.renderer = new Renderer(canvas, ctx, dpr);
    this.scoreSystem = new ScoreSystem();
    this.feverSystem = new FeverSystem();
    this.hud = new HUD(ctx, dpr);

    // Active piece
    this.piece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextPieces = [];

    // Game state
    this.paused = false;
    this.isGameOver = false;
    this.isFever = false;

    // Soft drop
    this.isSoftDropping = false;
    this.softDropScore = 0;

    // Screen shake
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeDuration = 0;

    // Line clear animation
    this.clearingRows = [];
    this.clearAnimTimer = 0;
    this.CLEAR_ANIM_DURATION = 300; // ms

    // Combo popup
    this.comboText = null;
    this.comboTextTimer = 0;

    // Rendering layers (managed via canvas transform)
    this.cameraX = 0;
    this.cameraY = 0;
  }

  init() {
    this.renderer.layout();
    this.hud.layout(this.canvas.width, this.canvas.height, this.renderer.getBoardBounds());

    // Game loop
    this.loop = new GameLoop({
      onUpdate: (action) => this._handleAction(action),
      onRender: (dt) => this._render(dt),
    });
    this.loop.onDrop = () => this._gravityDrop();
    this.loop.onLock = () => this._lockPiece();
    this.loop.onGameOver = () => this._endGame();

    // Input
    this.input = new InputSystem(this.canvas, this.canvas.width / this.dpr);
    this._bindInput();

    // Spawn first piece
    this._startGame();
  }

  _startGame() {
    this.board.reset();
    this.bag.reset();
    this.scoreSystem.reset();
    this.feverSystem.reset();
    this.piece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.nextPieces = [];
    this.isGameOver = false;
    this.paused = false;
    this.isSoftDropping = false;
    this.softDropScore = 0;
    this.loop.level = 1;
    this.loop.totalLines = 0;
    this.loop.linesThisLevel = 0;

    this._nextPiece();
    this.loop.start();
  }

  _nextPiece() {
    if (this.nextPieces.length === 0) {
      this.nextPieces = this.bag.peek(3);
    }
    this.piece = this.nextPieces.shift();
    this.nextPieces.push(this.bag.next());

    // Check if spawn position is blocked
    if (this.board.isTopOut(this.piece)) {
      this._endGame();
    }
  }

  _bindInput() {
    this.input.on('moveLeft', () => {
      if (this._canAct()) this._move(-1, 0);
    });
    this.input.on('moveRight', () => {
      if (this._canAct()) this._move(1, 0);
    });
    this.input.on('rotateCW', () => {
      if (this._canAct()) this._rotatePiece(1);
    });
    this.input.on('rotateCCW', () => {
      if (this._canAct()) this._rotatePiece(-1);
    });
    this.input.on('softDrop', ({ active }) => {
      if (!this._canAct()) return;
      this.isSoftDropping = active;
      this.loop.speedMultiplier = active ? 20 : 1;
    });
    this.input.on('hardDrop', () => {
      if (!this._canAct()) return;
      this._hardDrop();
    });
    this.input.on('hold', () => {
      if (!this._canAct()) return;
      this._holdPiece();
    });
    this.input.on('pause', () => {
      this._togglePause();
    });

    // Keyboard support for dev testing
    this.input.enableKeyboard();
  }

  _canAct() {
    return !this.isGameOver && !this.paused && this.clearingRows.length === 0;
  }

  _handleAction(action) {
    switch (action) {
      case 'moveLeft': this._move(-1, 0); break;
      case 'moveRight': this._move(1, 0); break;
    }
  }

  _move(dx, dy) {
    if (!this.piece) return;
    if (this.board.canPlace(this.piece, this.piece.x + dx, this.piece.y + dy, this.piece.rotation)) {
      this.piece.x += dx;
      this.piece.y += dy;
      this.loop.resetLock();
    }
  }

  _rotatePiece(direction) {
    if (!this.piece || this.piece.type === 'O') return;
    const fromRot = this.piece.rotation;
    const toRot = ((fromRot + direction) % 4 + 4) % 4;

    const kicks = getWallKicks(this.piece.type, fromRot, toRot);

    for (const [dx, dy] of kicks) {
      const testX = this.piece.x + dx;
      const testY = this.piece.y - dy; // SRS kick Y is inverted (positive = up)
      if (this.board.canPlace(this.piece, testX, testY, toRot)) {
        this.piece.rotation = toRot;
        this.piece.shape = getRotationState(this.piece.type, toRot);
        this.piece.x = testX;
        this.piece.y = testY;
        this.loop.resetLock();
        return;
      }
    }
  }

  _hardDrop() {
    if (!this.piece) return;
    const ghostY = this.board.getGhostY(this.piece);
    const distance = ghostY - this.piece.y;
    this.piece.y = ghostY;
    this.scoreSystem.addHardDrop(distance);
    this._lockPiece();
    this._triggerShake(3, 50);
  }

  _gravityDrop() {
    if (!this.piece || this.clearingRows.length > 0) return;
    if (this.board.canPlace(this.piece, this.piece.x, this.piece.y + 1, this.piece.rotation)) {
      this.piece.y++;
      if (this.isSoftDropping) {
        this.scoreSystem.addSoftDrop(1);
      }
    } else {
      this.loop.startLock();
    }
  }

  _lockPiece() {
    if (!this.piece) return;
    this.board.lock(this.piece);
    this.loop.cancelLock();
    this.canHold = true;

    // Check for line clears
    const clearedRows = this.board.clearLines();
    if (clearedRows.length > 0) {
      this.clearingRows = clearedRows;
      this.clearAnimTimer = this.CLEAR_ANIM_DURATION;

      const lineCount = clearedRows.length;
      const isTSpin = this.scoreSystem.lastMoveWasTSpin;

      // Calculate score with fever multiplier
      const multiplier = this.isFever ? FEVER_SCORE_MULTIPLIER : 1;
      const points = this.scoreSystem.addLineClear(lineCount, isTSpin, this.loop.level) * multiplier;

      // Update fever gauge
      this.feverSystem.addCharge(lineCount);

      // Update game loop
      this.loop.addLines(lineCount);

      // Combo text
      this._showCombo(lineCount, points);

      if (lineCount === 4) {
        this._triggerShake(6, 200);
      } else if (lineCount >= 2) {
        this._triggerShake(3, 100);
      }
    } else {
      this.scoreSystem.resetCombo();
    }

    // Check fever mode
    if (this.feverSystem.isActive && !this.isFever) {
      this.isFever = true;
      this._showCombo(0, 0, 'FEVER!');
      this.feverSystem.startFever();
    }

    this.piece = null;
    this._nextPiece();
  }

  _holdPiece() {
    if (!this.canHold || !this.piece) return;
    this.canHold = false;
    const current = this.piece;
    if (this.holdPiece) {
      this.piece = this.holdPiece;
      this.piece.x = 3;
      this.piece.y = -1;
      this.piece.rotation = 0;
      this.piece.shape = getRotationState(this.piece.type, 0);
    } else {
      this._nextPiece();
    }
    this.holdPiece = current;
    this.loop.cancelLock();
  }

  _showCombo(lineCount, points, customText) {
    let text;
    if (customText) {
      text = customText;
    } else {
      switch (lineCount) {
        case 1: text = ''; break;
        case 2: text = 'DOUBLE'; break;
        case 3: text = 'TRIPLE'; break;
        case 4: text = 'TETRIS!'; break;
        default: text = '';
      }
    }
    if (!text) return;
    this.comboText = { text, points };
    this.comboTextTimer = 1000; // 1 second display
  }

  _triggerShake(intensity, duration) {
    this.shakeX = intensity;
    this.shakeY = intensity;
    this.shakeDuration = duration;
  }

  _togglePause() {
    if (this.isGameOver) return;
    if (this.paused) {
      this.paused = false;
      this.loop.resume();
    } else {
      this.paused = true;
      this.loop.pause();
    }
  }

  _endGame() {
    this.isGameOver = true;
    this.loop.stop();
    if (this.onGameOver) {
      this.onGameOver({
        score: this.scoreSystem.score,
        level: this.loop.level,
        lines: this.loop.totalLines,
        maxCombo: this.scoreSystem.maxCombo,
        tSpinCount: this.scoreSystem.tSpinCount,
      });
    }
  }

  _render(dt) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Update animations
    this._updateAnimations(dt);

    // Apply screen shake
    if (this.shakeDuration > 0) {
      this.cameraX = (Math.random() - 0.5) * this.shakeX * 2;
      this.cameraY = (Math.random() - 0.5) * this.shakeY * 2;
    }

    ctx.save();

    // Clear
    this.renderer.clear();

    // Board
    // If clearing, flash the rows
    if (this.clearingRows.length > 0) {
      this._drawClearAnimation();
    } else {
      this.renderer.drawBoard(this.board);
    }

    // Ghost piece
    if (this.piece && this.clearingRows.length === 0) {
      const ghostY = this.board.getGhostY(this.piece);
      if (ghostY !== this.piece.y) {
        this.renderer.drawGhost(this.piece, ghostY);
      }
    }

    // Active piece
    if (this.piece && this.clearingRows.length === 0) {
      this.renderer.drawPiece(this.piece);
    }

    // Combo text popup
    if (this.comboText && this.comboTextTimer > 0) {
      this._drawComboText();
    }

    // HUD
    this.hud.draw({
      score: this.scoreSystem.score,
      level: this.loop.level,
      lines: this.loop.totalLines,
      combo: this.scoreSystem.combo,
      feverProgress: this.feverSystem.progress,
      isFever: this.isFever,
      nextPieces: this.nextPieces.slice(0, 3),
      holdPiece: this.holdPiece,
    });

    // Pause overlay
    if (this.paused) {
      this._drawPauseOverlay();
    }

    ctx.restore();
  }

  _updateAnimations(dt) {
    // Clear animation
    if (this.clearingRows.length > 0) {
      this.clearAnimTimer -= dt;
      if (this.clearAnimTimer <= 0) {
        this.clearingRows = [];
        this.clearAnimTimer = 0;
      }
    }

    // Shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDuration = 0;
      } else {
        const decay = this.shakeDuration / (this.shakeDuration + dt);
        this.shakeX *= decay;
        this.shakeY *= decay;
      }
    }

    // Combo text
    if (this.comboTextTimer > 0) {
      this.comboTextTimer -= dt;
      if (this.comboTextTimer <= 0) {
        this.comboText = null;
      }
    }

    // Fever timer
    if (this.isFever) {
      this.feverSystem.update(dt);
      if (!this.feverSystem.isActive) {
        this.isFever = false;
      }
    }
  }

  _drawClearAnimation() {
    const ctx = this.ctx;
    const { cellSize, boardX, boardW } = this.renderer.getBoardBounds();
    const boardY = this.renderer.boardY;
    const progress = 1 - this.clearAnimTimer / this.CLEAR_ANIM_DURATION;

    // First draw the board normally except for clearing rows
    const clearingSet = new Set(this.clearingRows);
    for (let r = 0; r < ROWS; r++) {
      if (clearingSet.has(r)) continue;
      for (let c = 0; c < COLS; c++) {
        const type = this.board.getCell(r, c);
        if (type) {
          this.renderer._drawCell(c, r, type, 1);
        }
      }
    }

    // Animate clearing rows (white flash)
    const alpha = 1 - progress;
    for (const row of this.clearingRows) {
      const y = boardY + row * cellSize;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.fillRect(boardX, y, boardW, cellSize);

      // Particles along the row
      for (let c = 0; c < COLS; c++) {
        const px = boardX + c * cellSize + cellSize / 2;
        const py = y + cellSize / 2;
        ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(
          px + (Math.random() - 0.5) * cellSize * progress * 3,
          py + (Math.random() - 0.5) * cellSize * progress * 3,
          cellSize * 0.15 * (1 - progress),
          0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  _drawComboText() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.comboTextTimer / 1000;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = 48 + (1 - t) * 20;
    const alpha = Math.min(1, t * 2);
    const offsetY = (1 - t) * -40;

    // Glow
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(this.comboText.text, w / 2, h / 2 + offsetY);

    // Points below
    if (this.comboText.points > 0) {
      ctx.font = `bold 24px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.fillText(`+${this.comboText.points}`, w / 2, h / 2 + 40 + offsetY);
    }

    ctx.restore();
  }

  _drawPauseOverlay() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('暂停', w / 2, h / 2 - 30);

    ctx.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('点击屏幕继续', w / 2, h / 2 + 20);
  }

  destroy() {
    this.loop.stop();
    this.input.destroy();
  }
}
