import { FEVER_CHARGE_PER_LINE, FEVER_DURATION, FEVER_COOLDOWN } from '../utils/constants.js';

// Fever gauge system
// Building consecutive line clears fills the fever gauge
// At 100% → Fever Mode activates (double points, visual effects)

export class FeverSystem {
  constructor() {
    this.progress = 0; // 0-100%
    this.isActive = false;
    this.cooldown = 0;
    this.duration = 0;
    this.onFeverStart = null;
    this.onFeverEnd = null;
  }

  reset() {
    this.progress = 0;
    this.isActive = false;
    this.cooldown = 0;
    this.duration = 0;
  }

  addCharge(linesCleared) {
    if (this.isActive) return; // no charging during fever
    const charge = linesCleared * FEVER_CHARGE_PER_LINE;
    this.progress = Math.min(100, this.progress + charge);
  }

  startFever() {
    this.isActive = true;
    this.progress = 100;
    this.duration = FEVER_DURATION;
    if (this.onFeverStart) this.onFeverStart();
  }

  update(dt) {
    if (!this.isActive) {
      // Cooldown after fever ends
      if (this.cooldown > 0) {
        this.cooldown -= dt;
      }
      return;
    }

    this.duration -= dt;
    // Progress bar depletes during fever
    this.progress = Math.max(0, (this.duration / FEVER_DURATION) * 100);

    if (this.duration <= 0) {
      this.isActive = false;
      this.progress = 0;
      this.cooldown = FEVER_COOLDOWN;
      if (this.onFeverEnd) this.onFeverEnd();
    }
  }

  // Whether fever is ready to trigger (gauge full, not in cooldown)
  get isReady() {
    return this.progress >= 100 && !this.isActive && this.cooldown <= 0;
  }
}
