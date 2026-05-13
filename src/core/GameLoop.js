import {
  BASE_DROP_INTERVAL,
  LEVEL_SPEED_DECREASE,
  MIN_DROP_INTERVAL,
  LOCK_DELAY,
  LOCK_DELAY_MAX_MOVES,
  DAS_DELAY,
  DAS_REPEAT,
  LINES_PER_LEVEL_EARLY,
  LINES_PER_LEVEL_LATE,
  MAX_LEVEL,
} from '../utils/constants.js';

export const GameState = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameover',
};

export class GameLoop {
  constructor({ onUpdate, onRender }) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;

    this.state = GameState.IDLE;
    this.rafId = null;
    this.lastTime = 0;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.isLocking = false;
    this.lockMoves = 0;

    // Level & lines
    this.level = 1;
    this.totalLines = 0;
    this.linesThisLevel = 0;

    // Speed multiplier (for soft drop)
    this.speedMultiplier = 1;

    // DAS (auto-repeat for held directions)
    this.dasDirection = 0; // -1 left, 1 right, 0 none
    this.dasTimer = 0;
    this.dasActive = false; // true when in repeat phase

    // Callbacks
    this.onDrop = null;
    this.onLock = null;
    this.onClear = null;
    this.onGameOver = null;
  }

  get dropInterval() {
    const interval = BASE_DROP_INTERVAL - (this.level - 1) * LEVEL_SPEED_DECREASE;
    return Math.max(MIN_DROP_INTERVAL, interval) / this.speedMultiplier;
  }

  start() {
    this.state = GameState.PLAYING;
    this.lastTime = performance.now();
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.isLocking = false;
    this.lockMoves = 0;
    this.speedMultiplier = 1;
    this.dasDirection = 0;
    this.dasTimer = 0;
    this.dasActive = false;
    this._tick(this.lastTime);
  }

  pause() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.lastTime = performance.now();
    this._tick(this.lastTime);
  }

  stop() {
    this.state = GameState.IDLE;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  gameOver() {
    this.state = GameState.GAME_OVER;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.onGameOver) this.onGameOver();
  }

  addLines(count) {
    this.totalLines += count;
    this.linesThisLevel += count;
    const threshold = this.level <= 10 ? LINES_PER_LEVEL_EARLY : LINES_PER_LEVEL_LATE;
    while (this.linesThisLevel >= threshold && this.level < MAX_LEVEL) {
      this.linesThisLevel -= threshold;
      this.level++;
    }
  }

  // Input actions
  moveLeft() {
    this.dasDirection = -1;
    this.dasTimer = 0;
    this.dasActive = false;
  }

  moveRight() {
    this.dasDirection = 1;
    this.dasTimer = 0;
    this.dasActive = false;
  }

  releaseMove() {
    this.dasDirection = 0;
    this.dasTimer = 0;
    this.dasActive = false;
  }

  resetLock() {
    if (this.isLocking && this.lockMoves < LOCK_DELAY_MAX_MOVES) {
      this.lockTimer = 0;
      this.lockMoves++;
    }
  }

  startLock() {
    if (!this.isLocking) {
      this.isLocking = true;
      this.lockTimer = 0;
      this.lockMoves = 0;
    }
  }

  cancelLock() {
    this.isLocking = false;
    this.lockTimer = 0;
    this.lockMoves = 0;
  }

  _tick(now) {
    if (this.state !== GameState.PLAYING) return;

    const dt = now - this.lastTime;
    this.lastTime = now;

    // Gravity drop timer
    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer -= this.dropInterval;
      if (this.onDrop) this.onDrop();
    }

    // Lock delay timer
    if (this.isLocking) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY || this.lockMoves >= LOCK_DELAY_MAX_MOVES) {
        if (this.onLock) this.onLock();
        this.isLocking = false;
        this.lockTimer = 0;
        this.lockMoves = 0;
      }
    }

    // DAS (auto-repeat) handling
    if (this.dasDirection !== 0) {
      this.dasTimer += dt;
      if (!this.dasActive && this.dasTimer >= DAS_DELAY) {
        this.dasActive = true;
        this.dasTimer = 0;
        if (this.onUpdate) this.onUpdate(this.dasDirection > 0 ? 'moveRight' : 'moveLeft');
      } else if (this.dasActive && this.dasTimer >= DAS_REPEAT) {
        this.dasTimer -= DAS_REPEAT;
        if (this.onUpdate) this.onUpdate(this.dasDirection > 0 ? 'moveRight' : 'moveLeft');
      }
    }

    // Render every frame
    if (this.onRender) this.onRender(dt);

    this.rafId = requestAnimationFrame(t => this._tick(t));
  }
}
