// ═══════════════════════════════════════════════════════
// 方块大作战 — Block Battle Tetris
// WeChat Mini Game   AppID: wxbc48ae6bb824e77a
// ═══════════════════════════════════════════════════════

// ═══ Constants ═══
var COLS = 10, ROWS = 20, CELL_SIZE = 28;
var SPAWN_X = 3, SPAWN_Y = -1;
var BASE_DROP_INTERVAL = 800, LEVEL_SPEED_DECREASE = 50, MIN_DROP_INTERVAL = 50;
var LOCK_DELAY = 500, LOCK_DELAY_MAX_MOVES = 15;
var LINES_PER_LEVEL_EARLY = 10, LINES_PER_LEVEL_LATE = 15, MAX_LEVEL = 30;
var SCORE_SINGLE = 100, SCORE_DOUBLE = 300, SCORE_TRIPLE = 500, SCORE_TETRIS = 800;
var SCORE_T_SPIN_SINGLE = 800, SCORE_T_SPIN_DOUBLE = 1200, SCORE_T_SPIN_TRIPLE = 1600;
var SCORE_COMBO = 50, SCORE_SOFT_DROP = 1, SCORE_HARD_DROP = 2;
var FEVER_CHARGE_PER_LINE = 20, FEVER_DURATION = 10000, FEVER_COOLDOWN = 5000;
var FX = {
  FLASH_MS: 180,
  TRAIL_MS: 520,
  CLEAR_ANIM_MS: 560,
  POPUP_MS: 1450,
  PARTICLE_LIFE_MIN: 620,
  PARTICLE_LIFE_MAX: 1150,
  CLEAR_PARTICLES_PER_CELL: 7,
  FEVER_PARTICLE_MULTIPLIER: 2.4,
  SHAKE_SMALL: 3,
  SHAKE_COMBO_STEP: 1.4,
  MAX_PARTICLES: 760,
};
var PIECE_COLORS = {
  I: { fill: '#22dfff', glow: '#7cf6ff' }, O: { fill: '#ffe45e', glow: '#fff2a8' },
  T: { fill: '#b767ff', glow: '#e2b5ff' }, S: { fill: '#34f389', glow: '#a5ffc7' },
  Z: { fill: '#ff5b7d', glow: '#ffa3b5' }, J: { fill: '#4d7dff', glow: '#a9c0ff' },
  L: { fill: '#ffab45', glow: '#ffd39a' },
};

// ═══ Piece Shapes (SRS) ═══
var SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

var PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// SRS Wall Kicks
var WALL_KICKS = {
  '0>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], '1>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]],    '2>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],    '3>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],  '0>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

var WALL_KICKS_I = {
  '0>1':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], '1>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], '2>1':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], '3>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], '0>3':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// ═══ Piece Helpers ═══
function rotateCW(matrix) {
  var r = matrix.length, c = matrix[0].length, res = [];
  for (var i = 0; i < c; i++) { res[i] = []; for (var j = r - 1; j >= 0; j--) res[i][r - 1 - j] = matrix[j][i]; }
  return res;
}

var ROTATION_STATES = {};
PIECE_TYPES.forEach(function(type) {
  var states = [SHAPES[type]];
  for (var i = 0; i < 3; i++) states.push(rotateCW(states[states.length - 1]));
  ROTATION_STATES[type] = states;
});

function getRotationState(type, rotation) {
  return ROTATION_STATES[type][((rotation % 4) + 4) % 4];
}

function getWallKicks(type, from, to) {
  var key = from + '>' + to;
  if (type === 'I') return WALL_KICKS_I[key] || [[0, 0]];
  if (type === 'O') return [[0, 0]];
  return WALL_KICKS[key] || [[0, 0]];
}

function getRotationKicks(type, from, to) {
  var kicks = getWallKicks(type, from, to).slice();
  var fallback = [[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[-2,-1],[2,-1],[0,1],[-1,1],[1,1],[-2,1],[2,1]];
  var seen = {};
  for (var i = 0; i < kicks.length; i++) seen[kicks[i][0] + ',' + kicks[i][1]] = true;
  for (var j = 0; j < fallback.length; j++) {
    var key = fallback[j][0] + ',' + fallback[j][1];
    if (!seen[key]) kicks.push(fallback[j]);
  }
  return kicks;
}

function getPieceColor(type) {
  return PIECE_COLORS[type] || { fill: '#fff', glow: '#fff' };
}

function isValidAdUnitId(id) {
  return typeof id === 'string' && /^adunit-[A-Za-z0-9_-]{16,}$/.test(id) && id.indexOf('xxxx') === -1;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
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

function drawCutPanel(ctx, x, y, w, h, cut) {
  cut = Math.min(cut || 14, w * 0.2, h * 0.35);
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function drawBackdrop(ctx, w, h, time, fever) {
  var speed = fever ? 0.045 : 0.018;
  var bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, fever ? '#190720' : '#070a18');
  bg.addColorStop(0.48, fever ? '#211044' : '#101535');
  bg.addColorStop(1, fever ? '#0f0618' : '#060812');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  var glow = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, h * 0.55);
  glow.addColorStop(0, fever ? 'rgba(255,91,125,0.24)' : 'rgba(34,223,255,0.18)');
  glow.addColorStop(1, 'rgba(34,223,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  var magenta = ctx.createRadialGradient(w * 0.82, h * 0.76, 0, w * 0.82, h * 0.76, h * 0.5);
  magenta.addColorStop(0, fever ? 'rgba(255,171,69,0.22)' : 'rgba(255,69,176,0.15)');
  magenta.addColorStop(1, 'rgba(255,69,176,0)');
  ctx.fillStyle = magenta;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = fever ? 'rgba(255,111,216,0.09)' : 'rgba(124,246,255,0.055)';
  ctx.lineWidth = 1;
  var gap = 34;
  var offset = ((time || 0) * speed) % gap;
  for (var x = -gap + offset; x < w + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, h * 0.08);
    ctx.lineTo(x + h * 0.28, h);
    ctx.stroke();
  }
  for (var y = h * 0.15; y < h; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + w * 0.12);
    ctx.stroke();
  }
  ctx.restore();

  var scanY = ((time || 0) * (fever ? 0.18 : 0.08)) % h;
  var scan = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
  scan.addColorStop(0, 'rgba(255,255,255,0)');
  scan.addColorStop(0.5, fever ? 'rgba(255,111,216,0.13)' : 'rgba(124,246,255,0.08)');
  scan.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = scan;
  ctx.fillRect(0, scanY - 18, w, 36);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (var i = 0; i < 24; i++) {
    var sx = (i * 73 + (time || 0) * 0.01) % w;
    var sy = (i * 47) % Math.floor(h * 0.85);
    ctx.globalAlpha = 0.18 + (i % 4) * 0.06;
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
}

function drawPanel(ctx, x, y, w, h, accent, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  var grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(17,28,61,0.92)');
  grad.addColorStop(1, 'rgba(7,11,27,0.84)');
  ctx.fillStyle = grad;
  drawCutPanel(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent || 'rgba(124,246,255,0.35)';
  ctx.lineWidth = 1;
  ctx.shadowColor = accent || '#22dfff';
  ctx.shadowBlur = 11;
  drawCutPanel(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  drawCutPanel(ctx, x + 1, y + 1, w - 2, h - 2, 10);
  ctx.stroke();
  ctx.fillStyle = accent || 'rgba(124,246,255,0.35)';
  ctx.globalAlpha *= 0.8;
  ctx.fillRect(x + 10, y + 2, Math.min(34, w * 0.22), 2);
  ctx.fillRect(x + w - Math.min(42, w * 0.25) - 10, y + h - 4, Math.min(42, w * 0.25), 2);
  ctx.restore();
}

function playImpactSound(power) {
  try {
    var AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
    if (!AC) return;
    if (!playImpactSound.ctx) playImpactSound.ctx = new AC();
    var ac = playImpactSound.ctx;
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 180 + power * 45;
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.min(0.16, 0.04 + power * 0.02), ac.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + 0.13);
  } catch(e) {}
}

function createFxSystem() {
  var particles = [];
  var pool = [];
  var popups = [];
  var trails = [];
  var shockwaves = [];
  var flash = 0;
  var feverBanner = 0;

  function obtain() { return pool.pop() || {}; }
  function recycle(p) { if (pool.length < FX.MAX_PARTICLES) pool.push(p); }
  function spawnParticle(x, y, color, power, shard) {
    if (particles.length >= FX.MAX_PARTICLES) recycle(particles.shift());
    var p = obtain();
    var a = Math.random() * Math.PI * 2;
    var s = (1.2 + Math.random() * 3.8) * power;
    p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - Math.random() * 1.2;
    p.life = FX.PARTICLE_LIFE_MIN + Math.random() * (FX.PARTICLE_LIFE_MAX - FX.PARTICLE_LIFE_MIN);
    p.maxLife = p.life; p.size = shard ? 3 + Math.random() * 5 : 1.8 + Math.random() * 3.2;
    p.color = color; p.shard = shard; p.rot = Math.random() * Math.PI; p.spin = (Math.random() - 0.5) * 0.22;
    particles.push(p);
  }
  function lineClear(rows, bounds, boardSnapshot, combo, fever) {
    var power = 1 + rows.length * 0.25 + Math.min(combo, 5) * 0.12;
    var mult = fever ? FX.FEVER_PARTICLE_MULTIPLIER : 1;
    flash = FX.FLASH_MS * (fever ? 1.45 : 1);
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      for (var c = 0; c < COLS; c++) {
        var type = boardSnapshot[row] && boardSnapshot[row][c];
        var color = getPieceColor(type || PIECE_TYPES[c % PIECE_TYPES.length]);
        var x = bounds.x + c * bounds.cs + bounds.cs / 2;
        var y = bounds.y + row * bounds.cs + bounds.cs / 2;
        trails.push({ x: bounds.x + c * bounds.cs, y: bounds.y + row * bounds.cs, size: bounds.cs, color: color.fill, life: FX.TRAIL_MS, maxLife: FX.TRAIL_MS });
        var count = Math.floor(FX.CLEAR_PARTICLES_PER_CELL * mult);
        for (var i = 0; i < count; i++) spawnParticle(x, y, Math.random() > 0.35 ? color.glow : '#ffffff', power, i % 2 === 0);
      }
      shockwaves.push({ x: bounds.x + bounds.w / 2, y: bounds.y + row * bounds.cs + bounds.cs / 2, r: 0, max: bounds.w * 0.86, life: 520, maxLife: 520, color: fever ? '#ff6fd8' : '#7cf6ff' });
      shockwaves.push({ x: bounds.x + bounds.w / 2, y: bounds.y + row * bounds.cs + bounds.cs / 2, r: 0, max: bounds.w * 0.46, life: 360, maxLife: 360, color: '#ffffff' });
    }
  }
  function popup(text, combo, fever, x, y) {
    popups.push({ text: text, combo: combo, fever: fever, x: x, y: y, life: FX.POPUP_MS, maxLife: FX.POPUP_MS });
  }
  function feverStart(w, h) {
    feverBanner = 1400;
    flash = 160;
    popups.push({ text: 'FEVER TIME!', combo: 0, fever: true, x: w / 2, y: h * 0.38, life: 1400, maxLife: 1400 });
    for (var i = 0; i < 120; i++) spawnParticle(Math.random() * w, h * (0.2 + Math.random() * 0.6), i % 2 ? '#ff6fd8' : '#ffd39a', 1.8, i % 3 === 0);
  }
  function update(dt) {
    if (flash > 0) flash -= dt;
    if (feverBanner > 0) feverBanner -= dt;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt; p.x += p.vx; p.y += p.vy; p.vy += 0.035 * dt / 16; p.rot += p.spin * dt / 16;
      if (p.life <= 0) recycle(particles.splice(i, 1)[0]);
    }
    for (var t = trails.length - 1; t >= 0; t--) { trails[t].life -= dt; if (trails[t].life <= 0) trails.splice(t, 1); }
    for (var s = shockwaves.length - 1; s >= 0; s--) { shockwaves[s].life -= dt; shockwaves[s].r += shockwaves[s].max * dt / shockwaves[s].maxLife; if (shockwaves[s].life <= 0) shockwaves.splice(s, 1); }
    for (var j = popups.length - 1; j >= 0; j--) { popups[j].life -= dt; popups[j].y -= 0.035 * dt; if (popups[j].life <= 0) popups.splice(j, 1); }
  }
  function drawBehind(ctx) {
    for (var i = 0; i < trails.length; i++) {
      var tr = trails[i], a = Math.max(0, tr.life / tr.maxLife), burn = 1 - a;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.95, 0.28 + a * 0.7);
      ctx.fillStyle = tr.color; ctx.shadowColor = tr.color; ctx.shadowBlur = 24 + burn * 16;
      roundRect(ctx, tr.x + 1, tr.y + 1, tr.size - 2, tr.size - 2, 5); ctx.fill();
      ctx.globalAlpha = a * 0.72;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, tr.x + 4 + burn * tr.size * 0.22, tr.y + 4, Math.max(3, tr.size * (0.55 - burn * 0.25)), Math.max(3, tr.size * 0.18), 3);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawFront(ctx, w, h) {
    for (var s = 0; s < shockwaves.length; s++) {
      var sw = shockwaves[s], a = Math.max(0, sw.life / sw.maxLife);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = sw.color; ctx.shadowColor = sw.color; ctx.shadowBlur = 18; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i], a = Math.max(0, p.life / p.maxLife);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = p.shard ? 12 : 16;
      if (p.shard) roundRect(ctx, -p.size / 2, -p.size / 2, p.size, p.size, 2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); }
      ctx.fill(); ctx.restore();
    }
    for (var j = 0; j < popups.length; j++) {
      var po = popups[j], t = 1 - po.life / po.maxLife;
      var scale = 0.72 + Math.sin(Math.min(1, t * 2) * Math.PI) * 0.42 + (po.fever ? 0.14 : 0);
      var alpha = Math.min(1, po.life / 220, 1 - Math.max(0, t - 0.72) / 0.28);
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(po.x, po.y); ctx.scale(scale, scale);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 38px sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = po.fever ? '#ff2d8f' : '#12152d'; ctx.strokeText(po.text, 0, 0);
      ctx.shadowColor = po.fever ? '#ff6fd8' : '#22dfff'; ctx.shadowBlur = 28; ctx.fillStyle = po.fever ? '#fff0fb' : '#ffffff'; ctx.fillText(po.text, 0, 0);
      if (po.combo > 1) { ctx.font = '900 24px sans-serif'; ctx.fillStyle = '#ffe45e'; ctx.shadowColor = '#ffe45e'; ctx.fillText('x' + po.combo, 0, 38); }
      ctx.restore();
    }
    if (feverBanner > 0) {
      var pulse = 0.55 + Math.sin(Date.now() * 0.018) * 0.25;
      ctx.save(); ctx.globalAlpha = Math.min(1, feverBanner / 280) * 0.9; ctx.strokeStyle = 'rgba(255,111,216,' + pulse + ')'; ctx.shadowColor = '#ff6fd8'; ctx.shadowBlur = 30; ctx.lineWidth = 5;
      roundRect(ctx, 8, 8, w - 16, h - 16, 22); ctx.stroke(); ctx.restore();
    }
    if (flash > 0) {
      var fa = Math.min(0.86, flash / FX.FLASH_MS);
      ctx.save(); ctx.globalAlpha = fa; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 40; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
  }
  return { update: update, lineClear: lineClear, popup: popup, feverStart: feverStart, drawBehind: drawBehind, drawFront: drawFront };
}

// ═══ Board ═══
function createBoard() {
  var grid = [];
  for (var r = 0; r < ROWS; r++) grid[r] = new Array(COLS).fill(null);
  return grid;
}

function boardCanPlace(grid, piece, x, y, rot) {
  var shape = getRotationState(piece.type, rot), size = shape.length;
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      if (!shape[r][c]) continue;
      var bx = x + c, by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by < 0) continue;
      if (grid[by][bx] !== null) return false;
    }
  }
  return true;
}

function boardLock(grid, piece) {
  var shape = piece.shape, size = piece.size;
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      if (!shape[r][c]) continue;
      var bx = piece.x + c, by = piece.y + r;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) grid[by][bx] = piece.type;
    }
  }
}

function boardClearLines(grid) {
  var full = boardFullLines(grid);
  for (var i = 0; i < full.length; i++) {
    var row = full.sort(function(a,b){return b-a;})[i]; // sort once, then process
  }
  full.sort(function(a,b){return b-a;});
  for (var i = 0; i < full.length; i++) {
    grid.splice(full[i], 1);
    grid.unshift(new Array(COLS).fill(null));
  }
  return full;
}

function boardFullLines(grid) {
  var full = [];
  for (var r = 0; r < ROWS; r++) if (grid[r].every(function(c) { return c !== null; })) full.push(r);
  return full;
}

function boardGhostY(grid, piece) {
  var gy = piece.y;
  while (boardCanPlace(grid, piece, piece.x, gy + 1, piece.rotation)) gy++;
  return gy;
}

function boardIsTopOut(grid, piece) {
  var shape = piece.shape, size = piece.size;
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      if (!shape[r][c]) continue;
      var bx = piece.x + c, by = piece.y + r;
      if (by >= 0 && by < ROWS && grid[by][bx] !== null) return true;
    }
  }
  return false;
}

// ═══ Piece Bag ═══
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function createPiece(type) {
  return {
    type: type,
    rotation: 0,
    x: 3,
    y: -1,
    shape: getRotationState(type, 0),
    size: SHAPES[type].length,
  };
}

function createPieceBag() {
  var bag = [];
  function fill() {
    var shuffled = shuffle(PIECE_TYPES);
    for (var i = 0; i < shuffled.length; i++) bag.push(shuffled[i]);
  }
  fill();
  return {
    next: function() {
      if (bag.length <= 7) fill();
      return createPiece(bag.shift());
    },
    peek: function(n) {
      while (bag.length < (n || 3)) fill();
      var res = [];
      for (var i = 0; i < (n || 3); i++) res.push(createPiece(bag[i]));
      return res;
    },
    reset: function() { bag = []; fill(); },
  };
}

// ═══ WeChat API Wrappers ═══
function vibrateShort() { if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'light' }); }
function vibrateLong() { if (typeof wx !== 'undefined' && wx.vibrateLong) wx.vibrateLong(); }
function getStorageSync(key) {
  if (typeof wx !== 'undefined') { try { return wx.getStorageSync(key) || null; } catch(e) { return null; } }
  return null;
}
function setStorageSync(key, val) {
  if (typeof wx !== 'undefined') { try { wx.setStorageSync(key, val); } catch(e) {} }
}
function shareAppMessage(title) {
  if (typeof wx !== 'undefined' && wx.shareAppMessage) {
    wx.shareAppMessage({ title: title || '方块大作战', imageUrl: '', query: '' });
  }
}
function showShareMenu() {
  if (typeof wx !== 'undefined' && wx.showShareMenu) {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
  }
}

// ═══ Renderer ═══
function createRenderer(canvas, ctx, dpr) {
  var boardX = 0, boardY = 0, cellSize = CELL_SIZE, boardW = 0, boardH = 0;

  function layout() {
    var w = canvas.width / dpr, h = canvas.height / dpr;
    var bottomSafe = h > 780 ? 118 : 92;
    cellSize = Math.min(Math.floor(w * 0.58 / COLS), Math.floor((h - 188) / ROWS), 29);
    cellSize = Math.max(16, cellSize);
    boardW = COLS * cellSize; boardH = ROWS * cellSize;
    boardX = Math.floor((w - boardW) / 2);
    boardY = Math.floor(Math.max(154, Math.min(h * 0.18, h - boardH - bottomSafe)));
  }

  function clear(fever, time) {
    var w = canvas.width / dpr, h = canvas.height / dpr;
    drawBackdrop(ctx, w, h, time || Date.now(), fever);
    var border = fever ? 'rgba(255,111,216,0.72)' : 'rgba(124,246,255,0.42)';
    drawPanel(ctx, boardX - 10, boardY - 10, boardW + 20, boardH + 20, border, 0.94);
    ctx.save();
    ctx.strokeStyle = fever ? 'rgba(255,111,216,0.9)' : 'rgba(34,223,255,0.95)';
    ctx.shadowColor = fever ? '#ff6fd8' : '#22dfff';
    ctx.shadowBlur = fever ? 28 : 22;
    ctx.lineWidth = 3;
    roundRect(ctx, boardX - 7, boardY - 7, boardW + 14, boardH + 14, 8);
    ctx.stroke();
    ctx.restore();
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = 'rgba(124,246,255,0.035)';
          ctx.fillRect(boardX + c * cellSize, boardY + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  function drawCell(col, row, type, alpha) {
    if (row < 0) return;
    var x = boardX + col * cellSize, y = boardY + row * cellSize, pad = 1;
    var color = getPieceColor(type), gx = x + pad, gy = y + pad, gw = cellSize - pad * 2, gh = cellSize - pad * 2;
    ctx.save(); ctx.globalAlpha = alpha;
    if (alpha < 0.5) {
      ctx.strokeStyle = color.glow; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      roundRect(ctx, gx + 1, gy + 1, gw - 2, gh - 2, 5);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.shadowColor = color.glow; ctx.shadowBlur = 14; ctx.fillStyle = color.fill;
      roundRect(ctx, gx, gy, gw, gh, 5); ctx.fill();
      ctx.shadowBlur = 0;
      var grad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      grad.addColorStop(0, 'rgba(255,255,255,0.68)'); grad.addColorStop(0.28, 'rgba(255,255,255,0.14)'); grad.addColorStop(0.72, 'rgba(0,0,0,0.10)'); grad.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = grad; roundRect(ctx, gx, gy, gw, gh, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      roundRect(ctx, gx + 4, gy + 4, Math.max(4, gw - 8), Math.max(3, gh * 0.22), 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + 3, gy + 3);
      ctx.lineTo(gx + gw / 2, gy + gh * 0.42);
      ctx.lineTo(gx + gw - 3, gy + 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + 3, gy + gh - 3);
      ctx.lineTo(gx + gw / 2, gy + gh * 0.58);
      ctx.lineTo(gx + gw - 3, gy + gh - 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.48)'; ctx.lineWidth = 1;
      roundRect(ctx, gx + 0.5, gy + 0.5, gw - 1, gh - 1, 5); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoard(grid) {
    ctx.save(); ctx.strokeStyle = '#7cf6ff'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 18; ctx.lineWidth = 2;
    roundRect(ctx, boardX - 4, boardY - 4, boardW + 8, boardH + 8, 10); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(124,246,255,0.12)'; ctx.lineWidth = 0.5;
    for (var r = 0; r <= ROWS; r++) { var y = boardY + r * cellSize; ctx.beginPath(); ctx.moveTo(boardX, y); ctx.lineTo(boardX + boardW, y); ctx.stroke(); }
    for (var c = 0; c <= COLS; c++) { var x = boardX + c * cellSize; ctx.beginPath(); ctx.moveTo(x, boardY); ctx.lineTo(x, boardY + boardH); ctx.stroke(); }
    var sweepY = boardY + ((Date.now() * 0.035) % boardH);
    var sweep = ctx.createLinearGradient(boardX, sweepY - 12, boardX, sweepY + 12);
    sweep.addColorStop(0, 'rgba(255,255,255,0)');
    sweep.addColorStop(0.5, 'rgba(124,246,255,0.09)');
    sweep.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(boardX, sweepY - 12, boardW, 24);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { if (grid[r][c]) drawCell(c, r, grid[r][c], 1); }
  }

  function drawPiece(piece, alpha) {
    alpha = alpha || 1;
    var shape = piece.shape, size = piece.size;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) drawCell(piece.x + c, piece.y + r, piece.type, alpha);
  }

  function drawPieceTrail(piece, fever) {
    if (!piece) return;
    var shape = piece.shape, size = piece.size;
    var color = getPieceColor(piece.type);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) {
      var bx = piece.x + c, by = piece.y + r;
      if (by < 0) continue;
      var x = boardX + bx * cellSize, y = boardY + by * cellSize + cellSize;
      var len = fever ? cellSize * 6.2 : cellSize * 4.6;
      var g = ctx.createLinearGradient(x, y, x, y + len);
      g.addColorStop(0, color.glow);
      g.addColorStop(0.35, 'rgba(180,70,255,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = fever ? 0.34 : 0.22;
      ctx.fillStyle = g;
      roundRect(ctx, x + 2, y - 2, cellSize - 4, len, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGhost(piece, gy) {
    var shape = piece.shape, size = piece.size;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) drawCell(piece.x + c, gy + r, piece.type, 0.2);
  }

  return { layout: layout, clear: clear, drawBoard: drawBoard, drawPiece: drawPiece, drawPieceTrail: drawPieceTrail, drawGhost: drawGhost, drawCell: drawCell,
    getBounds: function() { return { x: boardX, y: boardY, w: boardW, h: boardH, cs: cellSize }; } };
}

// ═══ HUD ═══
function drawHUD(ctx, dpr, boardBounds, state) {
  var cw = ctx.canvas.width / dpr;
  var ch = ctx.canvas.height / dpr;
  var leftW = Math.max(64, boardBounds.x - 18);
  var rightX = boardBounds.x + boardBounds.w + 8;
  var rightW = Math.max(64, cw - rightX - 10);

  function drawMini(shape, type, x, y, boxW, boxH) {
    var size = shape.length, mc = Math.min(boxW, boxH) / 4;
    var ox = x + (boxW - size * mc) / 2, oy = y + (boxH - size * mc) / 2;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) {
      var co = getPieceColor(type);
      ctx.save();
      ctx.fillStyle = co.fill; ctx.shadowColor = co.glow; ctx.shadowBlur = 8;
      roundRect(ctx, ox + c * mc + 1, oy + r * mc + 1, mc - 2, mc - 2, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      roundRect(ctx, ox + c * mc + 3, oy + r * mc + 3, Math.max(3, mc - 6), Math.max(2, mc * 0.18), 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Hold piece on the left, like the concept art.
  var lx = 8, ly = boardBounds.y + 62;
  ctx.textAlign = 'center';
  drawPanel(ctx, lx, ly, leftW, 112, 'rgba(124,246,255,0.42)', 0.72);
  ctx.fillStyle = '#e8f2ff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('保留', lx + leftW / 2, ly + 24);
  ctx.strokeStyle = 'rgba(124,246,255,0.24)'; ctx.lineWidth = 1;
  roundRect(ctx, lx + 7, ly + 36, leftW - 14, 64, 8); ctx.stroke();
  var hs = Math.min(62, Math.max(48, leftW - 14));
  var holdX = lx + (leftW - hs) / 2;
  if (state.holdPiece) {
    drawMini(getRotationState(state.holdPiece.type, 0), state.holdPiece.type, holdX + 3, ly + 42, hs - 6, hs - 6);
  } else {
    ctx.fillStyle = 'rgba(184,199,232,0.35)';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('?', holdX + hs / 2, ly + 72);
  }

  // Fever gauge
  var fy = ly + 134;
  drawPanel(ctx, lx, fy, leftW, 178, 'rgba(255,111,216,0.45)', 0.72);
  ctx.fillStyle = '#ffd7fb'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('连击', lx + leftW / 2, fy + 27);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff6fd8'; ctx.shadowBlur = 15;
  ctx.font = '900 34px sans-serif';
  ctx.fillText(state.combo > 1 ? String(state.combo) : '0', lx + leftW / 2, fy + 66);
  ctx.font = '900 13px sans-serif';
  ctx.fillText('COMBO', lx + leftW / 2, fy + 91);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff8ee2'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('狂热模式', lx + leftW / 2, fy + 123);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ff6fd8'; ctx.shadowBlur = 8; ctx.font = 'bold 14px sans-serif'; ctx.fillText('FEVER', lx + leftW / 2, fy + 143);
  ctx.shadowBlur = 0;
  var bw = leftW - 18, bh = 12, bx = lx + 9, by = fy + 156;
  drawPanel(ctx, bx, by, bw, bh, 'rgba(255,111,216,0.24)', 0.58);
  if (state.feverGauge > 0) {
    var fw = (state.feverGauge / 100) * (bw - 4);
    var fg = ctx.createLinearGradient(bx, by, bx + fw, by);
    fg.addColorStop(0, state.isFever ? '#ffab45' : '#22dfff');
    fg.addColorStop(1, state.isFever ? '#ff5b7d' : '#34f389');
    ctx.fillStyle = fg; ctx.shadowColor = state.isFever ? '#ffab45' : '#22dfff'; ctx.shadowBlur = state.isFever ? 12 : 7;
    roundRect(ctx, bx + 2, by + 2, Math.max(8, fw), bh - 4, 5); ctx.fill(); ctx.shadowBlur = 0;
  }

  // Next pieces, styled as a tall right-side tower like the concept.
  var ry = boardBounds.y + 62;
  drawPanel(ctx, rightX, ry, rightW, Math.min(290, boardBounds.h * 0.55), 'rgba(124,246,255,0.34)', 0.72);
  ctx.fillStyle = '#e8f2ff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('下一个', rightX + rightW / 2, ry + 26);
  ry += 44;
  var pieces = state.nextPieces || [];
  for (var i = 0; i < Math.min(pieces.length, 5); i++) {
    var p = pieces[i], ns = Math.min(56, Math.max(40, rightW - 10));
    var nx = rightX + (rightW - ns) / 2;
    drawMini(p.shape, p.type, nx + 3, ry, ns - 6, ns * 0.62);
    ry += ns * 0.66 + 9;
  }

  var linesY = boardBounds.y + boardBounds.h - 86;
  drawPanel(ctx, rightX, linesY, rightW, 78, 'rgba(124,246,255,0.34)', 0.72);
  ctx.fillStyle = '#b8c7e8'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('消除行数', rightX + rightW / 2, linesY + 22);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#7cf6ff'; ctx.shadowBlur = 10; ctx.font = 'bold 28px sans-serif'; ctx.fillText(String(state.lines), rightX + rightW / 2, linesY + 52);
  ctx.shadowBlur = 0; ctx.fillStyle = '#7cf6ff'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('LINES', rightX + rightW / 2, linesY + 68);
}

function drawGameTopBar(ctx, w, state) {
  var panelW = Math.min(w * 0.58, 258);
  var x = (w - panelW) / 2;
  var y = 70;
  drawPanel(ctx, x, y, panelW, 82, 'rgba(124,246,255,0.58)', 0.84);
  ctx.save();
  ctx.strokeStyle = 'rgba(34,223,255,0.95)';
  ctx.shadowColor = '#22dfff';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 32, y - 2); ctx.lineTo(x + panelW - 32, y - 2);
  ctx.moveTo(x + 18, y + 12); ctx.lineTo(x + 2, y + 28);
  ctx.moveTo(x + panelW - 18, y + 12); ctx.lineTo(x + panelW - 2, y + 28);
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b8c7e8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('得分', w / 2, y + 20);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#22dfff';
  ctx.shadowBlur = 16;
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(state.score.toLocaleString(), w / 2, y + 58);
  ctx.fillStyle = '#ffe45e';
  ctx.shadowColor = '#ffe45e';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('最高 ' + Math.max(state.score, 88888).toLocaleString(), w / 2, y + 76);
  ctx.shadowBlur = 0;
}

function drawGameChrome(ctx, w, h, state) {
  ctx.save();
  ctx.textBaseline = 'middle';
  drawPanel(ctx, 12, 16, 42, 42, 'rgba(34,156,255,0.78)', 0.66);
  ctx.strokeStyle = '#d7e8ff'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(40, 26); ctx.lineTo(27, 37); ctx.lineTo(40, 48); ctx.stroke();

  var avatarX = 78, avatarY = 37;
  var head = ctx.createRadialGradient(avatarX - 6, avatarY - 8, 2, avatarX, avatarY, 24);
  head.addColorStop(0, '#ffffff'); head.addColorStop(1, '#8ea4c7');
  ctx.fillStyle = head; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(avatarX, avatarY, 24, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#10172d'; roundRect(ctx, avatarX - 15, avatarY - 8, 30, 18, 8); ctx.fill();
  ctx.fillStyle = '#22dfff'; ctx.beginPath(); ctx.arc(avatarX - 7, avatarY, 3.5, 0, Math.PI * 2); ctx.arc(avatarX + 7, avatarY, 3.5, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 12; ctx.font = '900 22px sans-serif'; ctx.fillText('方块大作战', 112, 29);
  ctx.shadowBlur = 0; ctx.fillStyle = '#8ea4ff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('BLOCK BATTLE', 112, 52);

  drawPanel(ctx, w - 104, 18, 92, 36, 'rgba(255,255,255,0.18)', 0.38);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('•••', w - 74, 36);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.moveTo(w - 49, 25); ctx.lineTo(w - 49, 47); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w - 28, 36, 9, 0, Math.PI * 2); ctx.stroke();

  var cardW = 72;
  drawPanel(ctx, 16, 78, cardW, 70, 'rgba(124,246,255,0.40)', 0.64);
  ctx.fillStyle = '#b8c7e8'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('等级', 16 + cardW / 2, 100);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#7cf6ff'; ctx.shadowBlur = 12; ctx.font = '900 29px sans-serif'; ctx.fillText(String(state.level), 16 + cardW / 2, 129); ctx.shadowBlur = 0;
  ctx.fillStyle = '#22dfff'; roundRect(ctx, 28, 138, 48, 5, 2); ctx.fill();

  drawPanel(ctx, w - 88, 78, 72, 70, 'rgba(124,246,255,0.40)', 0.64);
  ctx.fillStyle = '#b8c7e8'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('目标得分', w - 52, 100);
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#7cf6ff'; ctx.shadowBlur = 10; ctx.font = 'bold 19px sans-serif'; ctx.fillText('15,000', w - 52, 125); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(10,18,45,0.9)'; roundRect(ctx, w - 79, 137, 54, 7, 4); ctx.fill();
  ctx.fillStyle = '#22dfff'; roundRect(ctx, w - 78, 138, Math.max(8, Math.min(52, state.score / 15000 * 52)), 5, 3); ctx.fill();
  ctx.restore();
}

function drawTouchControls(ctx, w, h) {
  var y = h - 74;
  var size = 52;
  var gap = 8;
  var center = w / 2;
  var controls = [
    { text: '‹', x: center - 142, color: '#d7e8ff', kind: 'square' },
    { text: '›', x: center - 82, color: '#d7e8ff', kind: 'square' },
    { text: '↻', x: center - 22, color: '#ffffff', kind: 'round' },
    { text: '↓', x: center + 58, color: '#d7e8ff', kind: 'square' },
  ];
  for (var i = 0; i < controls.length; i++) {
    var c = controls[i];
    var pulse = 1 + Math.sin(Date.now() * 0.005 + i) * 0.035;
    ctx.save();
    ctx.translate(c.x + size / 2, y + size / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-size / 2, -size / 2);
    if (c.kind === 'round') {
      ctx.fillStyle = 'rgba(21,68,137,0.78)';
      ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(124,246,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      drawPanel(ctx, 0, 0, size, size, 'rgba(124,246,255,0.42)', 0.74);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.color;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(c.text, size / 2, size / 2 + 1);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  var big = Math.min(74, Math.max(64, w * 0.18));
  var bx = w - big - 12, by = h - big - 34;
  var pulse = 1 + Math.sin(Date.now() * 0.005) * 0.045;
  ctx.save();
  ctx.translate(bx + big / 2, by + big / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-big / 2, -big / 2);
  var rg = ctx.createRadialGradient(big * 0.45, big * 0.25, 2, big / 2, big / 2, big * 0.62);
  rg.addColorStop(0, '#62d9ff'); rg.addColorStop(0.65, '#1a65c8'); rg.addColorStop(1, '#0a1745');
  ctx.fillStyle = rg; ctx.shadowColor = '#ffd45e'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(big / 2, big / 2, big / 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 38px sans-serif'; ctx.fillText('↓', big / 2, big / 2 - 5);
  ctx.font = 'bold 10px sans-serif'; ctx.fillText('快速下落', big / 2, big / 2 + 24);
  ctx.restore();
  drawPanel(ctx, 12, h - 48, 36, 36, 'rgba(124,246,255,0.32)', 0.58);
  ctx.fillStyle = '#d7e8ff'; ctx.fillRect(24, h - 38, 5, 18); ctx.fillRect(34, h - 38, 5, 18);
  ctx.textBaseline = 'alphabetic';
}

function drawMenuDemo(ctx, w, h, time) {
  var bx = w * 0.31, by = h * 0.22, cs = 13;
  ctx.save();
  ctx.globalAlpha = 0.34;
  drawPanel(ctx, bx, by, cs * 10, cs * 12, 'rgba(124,246,255,0.26)', 0.42);
  ctx.strokeStyle = 'rgba(124,246,255,0.16)';
  ctx.lineWidth = 0.6;
  for (var r = 0; r <= 12; r++) { ctx.beginPath(); ctx.moveTo(bx, by + r * cs); ctx.lineTo(bx + cs * 10, by + r * cs); ctx.stroke(); }
  for (var c = 0; c <= 10; c++) { ctx.beginPath(); ctx.moveTo(bx + c * cs, by); ctx.lineTo(bx + c * cs, by + cs * 12); ctx.stroke(); }
  var stack = [
    ['I',0,10],['I',1,10],['S',2,10],['S',3,10],['O',6,10],['O',7,10],['Z',8,10],['Z',9,10],
    ['J',0,11],['J',1,11],['T',2,11],['T',3,11],['L',4,11],['L',5,11],['O',6,11],['O',7,11],['Z',8,11],['Z',9,11]
  ];
  for (var i = 0; i < stack.length; i++) {
    var s = stack[i], co = getPieceColor(s[0]);
    ctx.fillStyle = co.fill; ctx.shadowColor = co.glow; ctx.shadowBlur = 6;
    roundRect(ctx, bx + s[1] * cs + 1, by + s[2] * cs + 1, cs - 2, cs - 2, 3); ctx.fill();
  }
  var activeY = by + ((time * 0.035) % (cs * 8));
  var co2 = getPieceColor('T');
  ctx.fillStyle = co2.fill; ctx.shadowColor = co2.glow; ctx.shadowBlur = 10;
  var shape = [[1,1,1],[0,1,0]];
  for (var rr = 0; rr < shape.length; rr++) for (var cc = 0; cc < shape[rr].length; cc++) if (shape[rr][cc]) {
    roundRect(ctx, bx + (4 + cc) * cs + 1, activeY + rr * cs + 1, cs - 2, cs - 2, 3); ctx.fill();
  }
  ctx.restore();
}

// ═══ Main Game ═══
var game = {
  canvas: null, ctx: null, dpr: 2,
  screenW: 375, screenH: 667,
  renderer: null,
  fx: null,
  board: null, bag: null,
  piece: null, holdPiece: null, canHold: true, nextPieces: [],
  score: 0, level: 1, lines: 0, combo: 0, maxCombo: 0,
  feverGauge: 0, isFever: false, feverTimer: 0,
  gameOver: false, paused: false,
  dropTimer: 0, lockTimer: 0, isLocking: false, lockMoves: 0,
  clearingRows: [], clearTimer: 0,
  clearSnapshot: null,
  comboText: null, comboTextTimer: 0,
  shakeX: 0, shakeY: 0, shakeDur: 0,
  lastLockFx: null,
  lastTime: 0,
  scene: 'menu', // 'menu' | 'game' | 'gameover'
  menuButtons: [],
  gameoverButtons: [],
  lastStats: null,
  retryBtn: null,
  animTime: 0,
  rotateFxTimer: 0,
  rotateFxDir: 1,
  lastRotateAt: 0,
  bannerAd: null, rewardedAd: null,

  init: function() {
    var self = this;
    // Get canvas
    this.canvas = (typeof canvas !== 'undefined') ? canvas : (typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : null);
    if (!this.canvas) { console.error('No canvas'); return; }
    this.ctx = this.canvas.getContext('2d');

    // Get system info for screen size
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      var info = wx.getSystemInfoSync();
      this.screenW = info.screenWidth || info.windowWidth || 375;
      this.screenH = info.screenHeight || info.windowHeight || 667;
      this.dpr = info.pixelRatio || 2;
    }
    this.canvas.width = this.screenW * this.dpr;
    this.canvas.height = this.screenH * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.renderer = createRenderer(this.canvas, this.ctx, this.dpr);
    this.renderer.layout();
    this.fx = createFxSystem();

    // Show share menu
    showShareMenu();

    // Init game state
    this.board = createBoard();
    this.bag = createPieceBag();

    // Bind input
    this._bindInput();
    this._bindCanvasMouseFallback();

    // Menu buttons
    this._buildMenuButtons();

    // Start loop
    this.lastTime = Date.now();
    this._loop(this.lastTime);
  },

  _buildMenuButtons: function() {
    var cw = this.screenW, ch = this.screenH;
    var btnW = Math.min(cw * 0.72, 280), btnH = 56, cx = cw / 2;
    this.menuButtons = [
      { id: 'play', label: '开始游戏', x: cx - btnW / 2, y: ch * 0.48, w: btnW, h: btnH, color: '#22dfff', hot: true },
      { id: 'daily', label: '每日挑战', x: cx - btnW / 2, y: ch * 0.48 + btnH + 14, w: btnW, h: btnH * 0.86, color: '#ff6fd8' },
      { id: 'leaderboard', label: '排行榜', x: cx - btnW * 0.78 / 2, y: ch * 0.48 + btnH * 2 + 22, w: btnW * 0.78, h: btnH * 0.76, color: '#34f389' },
    ];
  },

  _bindInput: function() {
    var self = this;
    var ts = null, tc = null, active = false, longTimer = null, isLong = false, swiped = false, startControl = null;
    var SW = 30, LT = 200, TT = 10;

    function handleStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      var t = e.touches[0];
      ts = { x: t.clientX || t.x || 0, y: t.clientY || t.y || 0, time: Date.now() };
      tc = { x: ts.x, y: ts.y };
      startControl = self.scene === 'game' ? self._findControlButton(ts.x, ts.y) : null;
      active = true; isLong = false; swiped = false;
      if (!(startControl && startControl.id === 'rotate')) {
        longTimer = setTimeout(function() {
          isLong = true;
          if (self.scene === 'game') self._onSoftDrop(true);
        }, LT);
      }
    }

    function handleMove(e) {
      if (!active || !e.touches || e.touches.length === 0) return;
      var t = e.touches[0];
      tc = { x: t.clientX || t.x || 0, y: t.clientY || t.y || 0 };
      if (startControl && startControl.id === 'rotate') return;
      var dx = tc.x - ts.x, dy = tc.y - ts.y;
      if (Math.abs(dx) > TT || Math.abs(dy) > TT) { if (longTimer) { clearTimeout(longTimer); longTimer = null; } }
      if (self.scene === 'game') {
        if (Math.abs(dx) > SW && !swiped) { swiped = true; self._move(dx > 0 ? 1 : -1, 0); }
        if (dy > SW * 2 && !swiped) { swiped = true; self._hardDrop(); }
      }
    }

    function handleEnd(e) {
      if (!active) return; active = false;
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
      if (isLong) {
        isLong = false;
        if (self.scene === 'game') self._onSoftDrop(false);
        startControl = null;
        return;
      }
      if (!tc || !ts) return;
      var dx = Math.abs(tc.x - ts.x), dy = Math.abs(tc.y - ts.y), dt = Date.now() - ts.time;
      if (self.scene === 'game') {
        if (startControl) {
          if (startControl.id === 'rotate') self._rotate90Button();
          else if (startControl.id === 'left') self._move(-1, 0);
          else if (startControl.id === 'right') self._move(1, 0);
          else if (startControl.id === 'drop') self._hardDrop();
          startControl = null;
          return;
        }
        if (dx < TT && dy < TT && dt < 300) {
          if (self._handleControlTap(ts.x, ts.y)) return;
          var midX = self.screenW / 2;
          self._rotate(ts.x < midX ? -1 : 1);
        } else if (dy < -SW && !swiped) { self._hold(); }
      } else if (self.scene === 'menu' || self.scene === 'gameover') {
        if (dx < TT && dy < TT && dt < 300) {
          self._handleSceneTap(ts.x, ts.y);
        }
      }
      startControl = null;
    }

    if (typeof wx !== 'undefined') {
      wx.onTouchStart(handleStart); wx.onTouchMove(handleMove); wx.onTouchEnd(handleEnd);
      if (wx.onKeyDown) {
        wx.onKeyDown(function(e) {
          if (self.scene !== 'game') return;
          switch(e.key || e.keyCode) {
            case 'ArrowLeft': case 37: self._move(-1,0); break;
            case 'ArrowRight': case 39: self._move(1,0); break;
            case 'ArrowDown': case 40: self._onSoftDrop(true); break;
            case 'ArrowUp': case 38: self._rotate(1); break;
            case 'z': case 90: self._rotate(-1); break;
            case ' ': case 32: self._hardDrop(); break;
            case 'c': case 67: self._hold(); break;
            case 'Escape': case 27: case 'p': case 80: self._togglePause(); break;
          }
          if ((e.key === 'ArrowDown' || e.keyCode === 40) && wx.onKeyUp) {
            // handled by release
          }
        });
        if (wx.onKeyUp) {
          wx.onKeyUp(function(e) {
            if (e.key === 'ArrowDown' || e.keyCode === 40 || e.key === 's' || e.keyCode === 83) self._onSoftDrop(false);
          });
        }
      }
    }
  },

  _bindCanvasMouseFallback: function() {
    var self = this;
    if (!this.canvas || !this.canvas.addEventListener) return;
    this.canvas.addEventListener('click', function(e) {
      var rect = self.canvas.getBoundingClientRect ? self.canvas.getBoundingClientRect() : { left: 0, top: 0, width: self.screenW, height: self.screenH };
      var x = (e.clientX - rect.left) * self.screenW / rect.width;
      var y = (e.clientY - rect.top) * self.screenH / rect.height;
      if (self.scene === 'game') {
        if (!self._handleControlTap(x, y)) self._rotate(x < self.screenW / 2 ? -1 : 1);
      } else {
        self._handleSceneTap(x, y);
      }
    });
  },

  _handleSceneTap: function(x, y) {
    if (this.scene === 'menu') {
      for (var i = 0; i < this.menuButtons.length; i++) {
        var btn = this.menuButtons[i];
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          if (btn.id === 'play') this._startGame();
          return;
        }
      }
    } else if (this.scene === 'gameover') {
      if (this.retryBtn && x >= this.retryBtn.x && x <= this.retryBtn.x + this.retryBtn.w && y >= this.retryBtn.y && y <= this.retryBtn.y + this.retryBtn.h) {
        this._startGame();
        return;
      }
    } else if (this.scene === 'game') {
      if (this._handleControlTap(x, y)) return;
    }
  },

  _getControlButtons: function() {
    var size = 52, y = this.screenH - 74, cx = this.screenW / 2;
    var big = Math.min(74, Math.max(64, this.screenW * 0.18));
    return [
      { id: 'left', x: cx - 142, y: y, w: size, h: size },
      { id: 'right', x: cx - 82, y: y, w: size, h: size },
      { id: 'rotate', x: cx - 22, y: y, w: size, h: size },
      { id: 'drop', x: cx + 58, y: y, w: size, h: size },
      { id: 'drop', x: this.screenW - big - 12, y: this.screenH - big - 34, w: big, h: big },
    ];
  },

  _findControlButton: function(x, y) {
    var buttons = this._getControlButtons();
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  },

  _handleControlTap: function(x, y) {
    var b = this._findControlButton(x, y);
    if (!b) return false;
    if (b.id === 'left') this._move(-1, 0);
    if (b.id === 'right') this._move(1, 0);
    if (b.id === 'rotate') this._rotate90Button();
    if (b.id === 'drop') this._hardDrop();
    return true;
  },

  _rotate90Button: function() {
    var now = Date.now();
    if (now - this.lastRotateAt < 120) return;
    this.lastRotateAt = now;
    this._rotate(1);
  },

  _startGame: function() {
    this.scene = 'game';
    this.board = createBoard();
    this.bag = createPieceBag();
    this.piece = null; this.holdPiece = null; this.canHold = true; this.nextPieces = [];
    this.score = 0; this.level = 1; this.lines = 0; this.combo = 0; this.maxCombo = 0;
    this.feverGauge = 0; this.isFever = false; this.feverTimer = 0;
    this.gameOver = false; this.paused = false;
    this.dropTimer = 0; this.lockTimer = 0; this.isLocking = false; this.lockMoves = 0;
    this.clearingRows = []; this.clearTimer = 0; this.clearSnapshot = null;
    this.comboText = null; this.comboTextTimer = 0;
    this.shakeX = 0; this.shakeY = 0; this.shakeDur = 0;
    this.lastLockFx = null;
    this._nextPiece();
    // Show banner ad during gameplay
    var bannerAdUnitId = 'adunit-xxxxxxxxxxxxx4';
    if (typeof wx !== 'undefined' && wx.createBannerAd && isValidAdUnitId(bannerAdUnitId)) {
      try {
        this.bannerAd = wx.createBannerAd({ adUnitId: bannerAdUnitId, adIntervals: 30,
          style: { left: 0, top: this.screenH - 50, width: this.screenW } });
        this.bannerAd.show();
      } catch(e) {}
    }
  },

  _nextPiece: function() {
    if (this.nextPieces.length === 0) this.nextPieces = this.bag.peek(3);
    this.piece = this.nextPieces.shift();
    this.nextPieces.push(this.bag.next());
    if (boardIsTopOut(this.board, this.piece)) this._endGame();
  },

  get dropInterval() { return Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL - (this.level - 1) * LEVEL_SPEED_DECREASE); },

  _canAct: function() { return !this.gameOver && !this.paused && this.clearingRows.length === 0; },

  _move: function(dx, dy) {
    if (!this.piece || !this._canAct()) return;
    if (boardCanPlace(this.board, this.piece, this.piece.x + dx, this.piece.y + dy, this.piece.rotation)) {
      this.piece.x += dx; this.piece.y += dy;
      this.lockMoves = 0; this.lockTimer = 0;
    }
  },

  _rotate: function(dir) {
    if (!this.piece || !this._canAct() || this.piece.type === 'O') return;
    var from = this.piece.rotation, to = ((from + dir) % 4 + 4) % 4;
    var kicks = getRotationKicks(this.piece.type, from, to);
    for (var i = 0; i < kicks.length; i++) {
      var dx = kicks[i][0], dy = kicks[i][1];
      var tx = this.piece.x + dx, ty = this.piece.y - dy;
      if (boardCanPlace(this.board, this.piece, tx, ty, to)) {
        this.piece.rotation = to; this.piece.shape = getRotationState(this.piece.type, to);
        this.piece.x = tx; this.piece.y = ty;
        this.lockMoves = 0; this.lockTimer = 0;
        this.rotateFxTimer = dir === 2 ? 420 : 260;
        this.rotateFxDir = dir >= 0 ? 1 : -1;
        return;
      }
    }
  },

  _hardDrop: function() {
    if (!this.piece || !this._canAct()) return;
    var gy = boardGhostY(this.board, this.piece);
    var dist = gy - this.piece.y;
    this.piece.y = gy;
    this.score += dist * SCORE_HARD_DROP;
    this.lastLockFx = { type: this.piece.type, x: this.piece.x, y: this.piece.y };
    this._lock();
    this.shakeX = FX.SHAKE_SMALL; this.shakeDur = 70;
    vibrateLong();
  },

  _hold: function() {
    if (!this.canHold || !this.piece || !this._canAct()) return;
    this.canHold = false;
    var cur = this.piece;
    if (this.holdPiece) {
      this.piece = this.holdPiece;
      this.piece.x = 3; this.piece.y = -1; this.piece.rotation = 0;
      this.piece.shape = getRotationState(this.piece.type, 0);
    } else {
      this._nextPiece();
    }
    this.holdPiece = cur;
    this.lockTimer = 0; this.isLocking = false; this.lockMoves = 0;
  },

  _onSoftDrop: function(active) {
    this.isSoftDropping = active;
  },

  _togglePause: function() {
    if (this.gameOver) return;
    this.paused = !this.paused;
  },

  _lock: function() {
    if (!this.piece) return;
    this.lastLockFx = this.lastLockFx || { type: this.piece.type, x: this.piece.x, y: this.piece.y };
    boardLock(this.board, this.piece);
    this.isLocking = false; this.lockTimer = 0; this.lockMoves = 0; this.canHold = true;

    var boardSnapshot = [];
    for (var sr = 0; sr < ROWS; sr++) boardSnapshot[sr] = this.board[sr].slice();
    var cleared = boardFullLines(this.board);
    if (cleared.length > 0) {
      var boundsForFx = this.renderer.getBounds();
      if (this.fx) this.fx.lineClear(cleared, boundsForFx, boardSnapshot, this.combo + 1, this.isFever);
      boardClearLines(this.board);
      this.clearSnapshot = boardSnapshot;
      this.clearingRows = cleared; this.clearTimer = FX.CLEAR_ANIM_MS;
      var n = cleared.length; this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      var pts = 0;
      switch(n) { case 1: pts = SCORE_SINGLE; break; case 2: pts = SCORE_DOUBLE; break; case 3: pts = SCORE_TRIPLE; break; case 4: pts = SCORE_TETRIS; break; }
      pts *= this.level;
      if (this.combo > 1) pts += SCORE_COMBO * this.combo * this.level;
      if (this.isFever) pts *= 2;
      this.score += pts; this.lines += n;
      var threshold = this.level <= 10 ? LINES_PER_LEVEL_EARLY : LINES_PER_LEVEL_LATE;
      var linesForLevel = this.level * threshold;
      if (this.lines >= linesForLevel && this.level < MAX_LEVEL) this.level++;

      this.feverGauge = Math.min(100, this.feverGauge + n * FEVER_CHARGE_PER_LINE);
      if (this.feverGauge >= 100 && !this.isFever) {
        this.isFever = true; this.feverTimer = FEVER_DURATION; this.feverGauge = 100;
        if (this.fx) this.fx.feverStart(this.screenW, this.screenH);
      }

      var txt = this._comboLabel(n, this.combo);
      this.comboText = { text: txt, pts: pts, combo: this.combo };
      this.comboTextTimer = 1000;
      if (this.fx) this.fx.popup(txt, this.combo, this.isFever, this.screenW / 2, this.screenH * 0.44);
      this.shakeX = FX.SHAKE_SMALL + cleared.length + Math.min(this.combo, 5) * FX.SHAKE_COMBO_STEP;
      this.shakeDur = 90 + cleared.length * 35 + Math.min(this.combo, 5) * 18;
      playImpactSound(cleared.length + this.combo + (this.isFever ? 4 : 0));
      if (n === 4) { this.shakeX += 3; this.shakeDur += 90; }
      vibrateLong();
    } else {
      if (this.lastLockFx) {
        var b = this.renderer.getBounds();
        var co = getPieceColor(this.lastLockFx.type);
        if (this.fx) {
          this.fx.popup('', 0, false, -999, -999);
          for (var lp = 0; lp < 8; lp++) {
            // Small landing sparkle through the same line-clear particle API would be too heavy.
          }
        }
      }
      this.combo = 0;
    }
    this.lastLockFx = null;
    this.piece = null;
    if (!this.gameOver) this._nextPiece();
  },

  _comboLabel: function(lines, combo) {
    if (lines >= 4) return 'TETRIS';
    if (combo >= 5) return 'PERFECT';
    if (combo >= 4) return 'AWESOME';
    if (combo >= 3) return 'GREAT';
    if (combo >= 2) return 'NICE';
    if (lines === 3) return 'GREAT';
    if (lines === 2) return 'NICE';
    return 'NICE';
  },

  _endGame: function() {
    this.gameOver = true; this.scene = 'gameover';
    this.lastStats = { score: this.score, level: this.level, lines: this.lines, maxCombo: this.maxCombo };

    // Save high score
    var prev = getStorageSync('tt_high_score') || 0;
    if (this.score > prev) setStorageSync('tt_high_score', this.score);

    // Save total lines
    var prevLines = getStorageSync('tt_total_lines') || 0;
    setStorageSync('tt_total_lines', prevLines + this.lines);

    // Hide banner ad
    if (this.bannerAd) { try { this.bannerAd.hide(); } catch(e) {} this.bannerAd = null; }

    // Retry button position
    var cw = this.screenW, ch = this.screenH;
    this.retryBtn = { x: cw / 2 - Math.min(250, cw * 0.72) / 2, y: ch * 0.58, w: Math.min(250, cw * 0.72), h: 58 };
  },

  _loop: function(now) {
    var dt = now - this.lastTime; this.lastTime = now;
    this.animTime += dt;

    if (this.scene === 'game' && !this.gameOver && !this.paused) {
      // Clear animation
      if (this.clearingRows.length > 0) {
        this.clearTimer -= dt;
        if (this.clearTimer <= 0) {
          this.clearingRows = [];
          this.clearSnapshot = null;
        }
      }

      // Gravity
      if (this.piece && this.clearingRows.length === 0) {
        var interval = this.dropInterval;
        if (this.isSoftDropping) interval /= 20;
        this.dropTimer += dt;
        if (this.dropTimer >= interval) {
          this.dropTimer = 0;
          if (boardCanPlace(this.board, this.piece, this.piece.x, this.piece.y + 1, this.piece.rotation)) {
            this.piece.y++;
            if (this.isSoftDropping) this.score += SCORE_SOFT_DROP;
          } else {
            this.isLocking = true; this.lockTimer = 0; this.lockMoves = 0;
          }
        }
      }

      // Lock delay
      if (this.isLocking && this.piece && this.clearingRows.length === 0) {
        this.lockTimer += dt;
        if (this.lockTimer >= LOCK_DELAY || this.lockMoves >= LOCK_DELAY_MAX_MOVES) this._lock();
      }

      // Fever
      if (this.isFever) { this.feverTimer -= dt; this.feverGauge = Math.max(0, (this.feverTimer / FEVER_DURATION) * 100); if (this.feverTimer <= 0) { this.isFever = false; this.feverGauge = 0; } }

      // Shake
      if (this.shakeDur > 0) { this.shakeDur -= dt; if (this.shakeDur <= 0) { this.shakeX = 0; this.shakeY = 0; this.shakeDur = 0; } }

      // Combo text
      if (this.comboTextTimer > 0) { this.comboTextTimer -= dt; if (this.comboTextTimer <= 0) this.comboText = null; }
      if (this.rotateFxTimer > 0) this.rotateFxTimer = Math.max(0, this.rotateFxTimer - dt);
    }
    if (this.fx) this.fx.update(dt);

    this._render(dt);
    requestAnimationFrame(function(t) { game._loop(t); });
  },

  _render: function(dt) {
    var ctx = this.ctx, cw = this.screenW, ch = this.screenH;
    this.renderer.layout();
    var bounds = this.renderer.getBounds();

    if (this.scene === 'menu') {
      this._renderMenu();
    } else if (this.scene === 'game') {
      this._renderGame();
    } else if (this.scene === 'gameover') {
      this._renderGameOver();
    }
  },

  _renderMenu: function() {
    var ctx = this.ctx, cw = this.screenW, ch = this.screenH;

    drawBackdrop(ctx, cw, ch, this.animTime, false);
    drawMenuDemo(ctx, cw, ch, this.animTime);

    // Floating tetromino accents
    var accents = [
      { type: 'T', x: cw * 0.18, y: ch * 0.25, s: 14 },
      { type: 'L', x: cw * 0.74, y: ch * 0.22, s: 13 },
      { type: 'I', x: cw * 0.62, y: ch * 0.36, s: 11 },
    ];
    for (var a = 0; a < accents.length; a++) {
      var ac = accents[a], shape = getRotationState(ac.type, a % 4), co = getPieceColor(ac.type);
      ctx.save();
      ctx.translate(ac.x, ac.y);
      ctx.rotate(Math.sin(this.animTime * 0.001 + a) * 0.18);
      ctx.globalAlpha = 0.5;
      for (var r = 0; r < shape.length; r++) for (var c = 0; c < shape.length; c++) if (shape[r][c]) {
        ctx.fillStyle = co.fill; ctx.shadowColor = co.glow; ctx.shadowBlur = 10;
        roundRect(ctx, (c - 1.5) * ac.s, (r - 1.5) * ac.s, ac.s - 2, ac.s - 2, 4); ctx.fill();
      }
      ctx.restore();
    }

    // Title
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 46px sans-serif';
    ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; ctx.fillText('方块大作战', cw / 2, ch * 0.16);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#7cf6ff'; ctx.fillText('BLOCK BATTLE', cw / 2, ch * 0.16 + 38);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#8ea4c7'; ctx.fillText('霓虹连击 · 极速消除', cw / 2, ch * 0.16 + 62);
    ctx.restore();

    // Buttons
    for (var i = 0; i < this.menuButtons.length; i++) {
      var btn = this.menuButtons[i];
      var pulse = btn.hot ? 1 + Math.sin(this.animTime * 0.004) * 0.025 : 1;
      ctx.save();
      ctx.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.scale(pulse, pulse);
      var x = -btn.w / 2, y = -btn.h / 2;
      ctx.shadowColor = btn.color; ctx.shadowBlur = btn.hot ? 26 : 12;
      var g = ctx.createLinearGradient(x, y, x + btn.w, y + btn.h);
      g.addColorStop(0, btn.hot ? 'rgba(38,77,122,0.98)' : 'rgba(30,40,86,0.96)');
      g.addColorStop(1, 'rgba(10,12,34,0.94)');
      ctx.fillStyle = g; drawCutPanel(ctx, x, y, btn.w, btn.h, 14); ctx.fill();
      var ripple = (this.animTime * 0.16) % btn.w;
      var rg = ctx.createLinearGradient(x + ripple - 45, y, x + ripple + 45, y);
      rg.addColorStop(0, 'rgba(255,255,255,0)');
      rg.addColorStop(0.5, 'rgba(255,255,255,0.24)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; drawCutPanel(ctx, x, y, btn.w, btn.h, 14); ctx.fill();
      ctx.strokeStyle = btn.color; ctx.lineWidth = btn.hot ? 2.4 : 1.4; drawCutPanel(ctx, x, y, btn.w, btn.h, 14); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = btn.hot ? '#ffffff' : btn.color; ctx.font = 'bold ' + (btn.hot ? 21 : 18) + 'px sans-serif'; ctx.fillText(btn.label, 0, 1);
      ctx.restore();
    }

    // Footer
    ctx.fillStyle = '#60708f'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('滑动移动 · 点击旋转 · 上滑暂存', cw / 2, ch - 40);
  },

  _renderGame: function() {
    var ctx = this.ctx, cw = this.screenW, ch = this.screenH;

    this.renderer.clear(this.isFever, this.animTime);
    drawGameTopBar(ctx, cw, { score: this.score });
    drawGameChrome(ctx, cw, ch, { score: this.score, level: this.level });

    if (this.fx) this.fx.drawBehind(ctx);

    // Clearing animation
    if (this.clearingRows.length > 0) {
      var clearingSet = {};
      for (var i = 0; i < this.clearingRows.length; i++) clearingSet[this.clearingRows[i]] = true;
      var bounds = this.renderer.getBounds();
      var snapshot = this.clearSnapshot || this.board;
      var clearProgress = 1 - Math.max(0, this.clearTimer) / FX.CLEAR_ANIM_MS;
      for (var r = 0; r < ROWS; r++) {
        if (clearingSet[r]) continue;
        for (var c = 0; c < COLS; c++) if (snapshot[r][c]) this.renderer.drawCell(c, r, snapshot[r][c], 1);
      }
      for (var cr = 0; cr < this.clearingRows.length; cr++) {
        var row = this.clearingRows[cr];
        var y = bounds.y + row * bounds.cs;
        var beamW = bounds.w * Math.min(1, clearProgress * 1.35);
        var beamX = bounds.x + (bounds.w - beamW) / 2;
        for (var cc = 0; cc < COLS; cc++) {
          if (snapshot[row] && snapshot[row][cc]) this.renderer.drawCell(cc, row, snapshot[row][cc], Math.max(0.28, 1 - clearProgress * 0.65));
        }
        var g = ctx.createLinearGradient(bounds.x, y, bounds.x + bounds.w, y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.18, this.isFever ? 'rgba(255,111,216,0.62)' : 'rgba(124,246,255,0.58)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.92)');
        g.addColorStop(0.82, this.isFever ? 'rgba(255,111,216,0.62)' : 'rgba(124,246,255,0.58)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0.18, 1 - clearProgress * 0.18);
        ctx.fillStyle = g;
        ctx.shadowColor = this.isFever ? '#ff6fd8' : '#7cf6ff';
        ctx.shadowBlur = 22;
        roundRect(ctx, beamX, y + 1, beamW, bounds.cs - 2, 8);
        ctx.fill();
        ctx.restore();
      }
    } else {
      this.renderer.drawBoard(this.board);
    }

    // Ghost
    if (this.piece && this.clearingRows.length === 0) {
      var gy = boardGhostY(this.board, this.piece);
      if (gy !== this.piece.y) this.renderer.drawGhost(this.piece, gy);
    }

    // Active piece
    if (this.piece && this.clearingRows.length === 0) {
      this.renderer.drawPieceTrail(this.piece, this.isFever);
      this.renderer.drawPiece(this.piece);
      if (this.rotateFxTimer > 0) {
        var rb = this.renderer.getBounds();
        var px = rb.x + (this.piece.x + this.piece.size / 2) * rb.cs;
        var py = rb.y + (this.piece.y + this.piece.size / 2) * rb.cs;
        var ra = Math.min(1, this.rotateFxTimer / 260);
        ctx.save();
        ctx.globalAlpha = Math.min(0.9, ra);
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#22dfff';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, rb.cs * 1.55, -Math.PI * 0.2, Math.PI * 1.25);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.rotateFxTimer > 300 ? '180' : '90', px, py - rb.cs * 2.1);
        ctx.restore();
      }
    }

    // Combo text
    if (this.comboText && this.comboTextTimer > 0) {
      var t = this.comboTextTimer / 1000;
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, t * 2) + ')';
      ctx.font = 'bold ' + (48 + (1 - t) * 20) + 'px sans-serif';
      ctx.fillText(this.comboText.text, cw / 2, this.screenH / 2 + (1 - t) * -40);
      ctx.shadowBlur = 0; ctx.restore();
    }

    // HUD
    var bounds = this.renderer.getBounds();
    drawHUD(ctx, this.dpr, bounds, {
      score: this.score, level: this.level, lines: this.lines, combo: this.combo,
      feverGauge: this.feverGauge, isFever: this.isFever,
      nextPieces: this.nextPieces, holdPiece: this.holdPiece,
    });
    drawTouchControls(ctx, cw, ch);
    if (this.fx) this.fx.drawFront(ctx, cw, ch);

    // Pause
    if (this.paused) {
      ctx.fillStyle = 'rgba(2,5,16,0.78)'; ctx.fillRect(0, 0, this.screenW, this.screenH);
      drawPanel(ctx, this.screenW * 0.16, this.screenH / 2 - 78, this.screenW * 0.68, 134, 'rgba(124,246,255,0.38)', 0.95);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 16; ctx.font = 'bold 36px sans-serif'; ctx.fillText('暂停', this.screenW / 2, this.screenH / 2 - 28);
      ctx.shadowBlur = 0; ctx.fillStyle = '#8ea4c7'; ctx.font = '16px sans-serif'; ctx.fillText('点击屏幕继续', this.screenW / 2, this.screenH / 2 + 20);
    }
  },

  _renderGameOver: function() {
    var ctx = this.ctx, cw = this.screenW, ch = this.screenH;

    // First render the game board in background
    this._renderGame();

    // Overlay
    ctx.fillStyle = 'rgba(2,5,16,0.86)'; ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 40px sans-serif'; ctx.fillStyle = '#ff5b7d'; ctx.shadowColor = '#ff5b7d'; ctx.shadowBlur = 22;
    ctx.fillText('游戏结束', cw / 2, ch * 0.12);
    ctx.shadowBlur = 0;

    if (this.lastStats) {
      var panelW = Math.min(cw * 0.78, 310);
      var panelX = (cw - panelW) / 2;
      drawPanel(ctx, panelX, ch * 0.18, panelW, 176, 'rgba(255,111,216,0.48)', 0.96);
      ctx.fillStyle = '#8ea4c7'; ctx.font = '13px sans-serif';
      ctx.fillText('最终得分', cw / 2, ch * 0.18 + 28);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 38px sans-serif'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 12;
      ctx.fillText(this.lastStats.score.toLocaleString(), cw / 2, ch * 0.18 + 70);
      ctx.shadowBlur = 0;
      var beatRate = Math.min(96, 38 + Math.floor(Math.sqrt(Math.max(0, this.lastStats.score)) * 0.42 + this.lastStats.level * 2));
      var targetGap = Math.max(0, 15000 - this.lastStats.score);
      ctx.fillStyle = '#ffe45e'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('你击败了 ' + beatRate + '% 玩家', cw / 2, ch * 0.18 + 98);
      ctx.fillStyle = '#b8c7e8'; ctx.font = '12px sans-serif'; ctx.fillText(targetGap > 0 ? '距离目标只差 ' + targetGap.toLocaleString() + ' 分' : '已突破今日目标', cw / 2, ch * 0.18 + 120);
      var statY = ch * 0.18 + 150;
      var stats = [
        ['等级', this.lastStats.level, '#7cf6ff'],
        ['行数', this.lastStats.lines, '#34f389'],
        ['连击', 'x' + this.lastStats.maxCombo, '#ff6fd8']
      ];
      for (var si = 0; si < stats.length; si++) {
        var sx = panelX + panelW * (0.18 + si * 0.32);
        ctx.fillStyle = '#8ea4c7'; ctx.font = '11px sans-serif'; ctx.fillText(stats[si][0], sx, statY);
        ctx.fillStyle = stats[si][2]; ctx.font = 'bold 18px sans-serif'; ctx.fillText(stats[si][1], sx, statY + 24);
      }
    }

    // Revive button
    var reviveW = Math.min(270, cw * 0.78), reviveX = (cw - reviveW) / 2, reviveY = ch * 0.49;
    drawPanel(ctx, reviveX, reviveY, reviveW, 50, 'rgba(255,228,94,0.72)', 0.98);
    ctx.fillStyle = '#fff7bf'; ctx.shadowColor = '#ffe45e'; ctx.shadowBlur = 18; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('观看视频立即复活', cw / 2, reviveY + 26);
    ctx.shadowBlur = 0;

    // Retry button
    if (this.retryBtn) {
      var b = this.retryBtn;
      var pulse = 1 + Math.sin(this.animTime * 0.006) * 0.035;
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(pulse, pulse); ctx.translate(-b.w / 2, -b.h / 2);
      drawPanel(ctx, 0, 0, b.w, b.h, 'rgba(124,246,255,0.78)', 0.98);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 18; ctx.font = 'bold 22px sans-serif'; ctx.fillText('再来一局', b.w / 2, b.h / 2);
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // Double reward button
    var dbx = cw / 2 - 96, dby = this.retryBtn ? this.retryBtn.y + 68 : ch * 0.68;
    drawPanel(ctx, dbx, dby, 192, 44, 'rgba(255,111,216,0.52)', 0.88);
    ctx.fillStyle = '#ffb8ed'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('领取双倍积分', cw / 2, dby + 23);

    ctx.fillStyle = '#8ea4c7'; ctx.font = '12px sans-serif';
    ctx.fillText('再消 1 行即可升级', cw / 2, dby + 62);

    // Back to menu
    ctx.fillStyle = '#60708f'; ctx.font = '14px sans-serif';
    ctx.fillText('点击上方按钮继续', cw / 2, ch - 40);
  },
};

// ═══ Boot ═══
game.init();
