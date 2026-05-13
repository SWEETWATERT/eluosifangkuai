// Particle system for visual effects
// Line clear explosions, fever mode sparkles, hard drop impact

export class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size || 3;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * (dt / 1000);
    this.y += this.vy * (dt / 1000);
    this.vy += 200 * (dt / 1000); // gravity
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }

  get dead() {
    return this.life <= 0;
  }
}

export class ParticleEmitter {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, config = {}) {
    const {
      color = '#00ffff',
      speed = 200,
      life = 600,
      size = 3,
      spread = Math.PI * 2,
      angleOffset = 0,
    } = config;

    for (let i = 0; i < count; i++) {
      const angle = angleOffset + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random());
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const lifetime = life * (0.5 + Math.random());
      this.particles.push(new Particle(x, y, vx, vy, lifetime, color, size));
    }
  }

  // Emit particles for a line clear
  emitLineClear(x, y, width, height, color) {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;
      const vx = (Math.random() - 0.5) * 400;
      const vy = -Math.random() * 300 - 100;
      this.particles.push(new Particle(px, py, vx, vy, 800, color, 2 + Math.random() * 3));
    }
  }

  // Emit sparkles for fever mode
  emitFever(x, y, width, height) {
    const count = 3; // emit a few per frame
    const colors = ['#ff4400', '#ff8800', '#ffcc00', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;
      const vx = (Math.random() - 0.5) * 100;
      const vy = -Math.random() * 150 - 50;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(px, py, vx, vy, 1200, color, 2 + Math.random() * 4));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
