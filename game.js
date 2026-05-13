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
var PIECE_COLORS = {
  I: { fill: '#00f0f0', glow: '#00ffff' }, O: { fill: '#f0f000', glow: '#ffff00' },
  T: { fill: '#a000f0', glow: '#c840ff' }, S: { fill: '#00f000', glow: '#00ff40' },
  Z: { fill: '#f00000', glow: '#ff4040' }, J: { fill: '#0000f0', glow: '#4040ff' },
  L: { fill: '#f0a000', glow: '#ffb840' },
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

function getPieceColor(type) {
  return PIECE_COLORS[type] || { fill: '#fff', glow: '#fff' };
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
  var full = [];
  for (var r = 0; r < ROWS; r++) if (grid[r].every(function(c) { return c !== null; })) full.push(r);
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
    cellSize = Math.min(Math.floor(w * 0.6 / COLS), Math.floor(h * 0.85 / ROWS), 36);
    boardW = COLS * cellSize; boardH = ROWS * cellSize;
    boardX = Math.floor((w - boardW) / 2); boardY = Math.floor((h - boardH) / 2);
  }

  function clear() {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = '#1a1a3a';
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
      ctx.strokeStyle = color.glow; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, gw, gh);
    } else {
      ctx.shadowColor = color.glow; ctx.shadowBlur = 6; ctx.fillStyle = color.fill; ctx.fillRect(gx, gy, gw, gh);
      ctx.shadowBlur = 0;
      var grad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      grad.addColorStop(0, 'rgba(255,255,255,0.25)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.05)'); grad.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = grad; ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
    }
    ctx.restore();
  }

  function drawBoard(grid) {
    ctx.save(); ctx.strokeStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10; ctx.lineWidth = 2;
    ctx.strokeRect(boardX - 1, boardY - 1, boardW + 2, boardH + 2); ctx.restore();
    ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 0.5;
    for (var r = 0; r <= ROWS; r++) { var y = boardY + r * cellSize; ctx.beginPath(); ctx.moveTo(boardX, y); ctx.lineTo(boardX + boardW, y); ctx.stroke(); }
    for (var c = 0; c <= COLS; c++) { var x = boardX + c * cellSize; ctx.beginPath(); ctx.moveTo(x, boardY); ctx.lineTo(x, boardY + boardH); ctx.stroke(); }
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { if (grid[r][c]) drawCell(c, r, grid[r][c], 1); }
  }

  function drawPiece(piece, alpha) {
    alpha = alpha || 1;
    var shape = piece.shape, size = piece.size;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) drawCell(piece.x + c, piece.y + r, piece.type, alpha);
  }

  function drawGhost(piece, gy) {
    var shape = piece.shape, size = piece.size;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) drawCell(piece.x + c, gy + r, piece.type, 0.2);
  }

  return { layout: layout, clear: clear, drawBoard: drawBoard, drawPiece: drawPiece, drawGhost: drawGhost, drawCell: drawCell,
    getBounds: function() { return { x: boardX, y: boardY, w: boardW, h: boardH, cs: cellSize }; } };
}

// ═══ HUD ═══
function drawHUD(ctx, dpr, boardBounds, state) {
  var cw = ctx.canvas.width / dpr;
  var hx = boardBounds.x + boardBounds.w + 10, hy = boardBounds.y, hw = cw - boardBounds.x - boardBounds.w - 20;
  var y = hy;

  function drawStat(label, value, color) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888'; ctx.font = '12px sans-serif'; ctx.fillText(label, hx + hw / 2, y); y += 16;
    ctx.fillStyle = color || '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 4;
    var text = typeof value === 'number' ? value.toLocaleString() : String(value);
    ctx.fillText(text, hx + hw / 2, y); ctx.shadowBlur = 0; y += 30;
  }

  // Hold piece
  ctx.fillStyle = '#555'; ctx.font = '12px sans-serif'; ctx.fillText('暂存', hx + hw / 2, y); y += 18;
  var hs = CELL_SIZE * 2.5;
  ctx.strokeStyle = state.holdPiece ? '#00ffff' : '#333'; ctx.lineWidth = 1;
  ctx.strokeRect(hx + (hw - hs) / 2, y, hs, hs);
  if (state.holdPiece) {
    var shape = getRotationState(state.holdPiece.type, 0), size = shape.length, mc = hs / 4;
    var ox = hx + (hw - hs) / 2 + (hs - size * mc) / 2, oy = y + (hs - size * mc) / 2;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) {
      var co = getPieceColor(state.holdPiece.type);
      ctx.fillStyle = co.fill; ctx.shadowColor = co.glow; ctx.shadowBlur = 3;
      ctx.fillRect(ox + c * mc + 1, oy + r * mc + 1, mc - 2, mc - 2); ctx.shadowBlur = 0;
    }
  }
  y += hs + 8;

  // Score
  y += 8; drawStat('分数', state.score); y += 4;
  drawStat('等级', state.level, '#0ff'); y += 4;
  drawStat('行数', state.lines, '#0f0');
  if (state.combo > 1) { ctx.fillStyle = '#f0f'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('连击 x' + state.combo, hx + hw / 2, y); y += 24; }

  // Fever gauge
  y += 8;
  ctx.fillStyle = '#888'; ctx.font = '12px sans-serif'; ctx.fillText(state.isFever ? '狂热!' : '狂热槽', hx + hw / 2, y); y += 16;
  var bw = hw - 4, bh = 10, bx = hx + 2;
  ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.fillRect(bx, y, bw, bh); ctx.strokeRect(bx, y, bw, bh);
  if (state.feverGauge > 0) {
    var fw = (state.feverGauge / 100) * (bw - 2);
    ctx.fillStyle = state.isFever ? '#ff4400' : '#00ffff'; ctx.shadowColor = state.isFever ? '#ff8844' : '#00ffff'; ctx.shadowBlur = state.isFever ? 12 : 6;
    ctx.fillRect(bx + 1, y + 1, Math.max(bh, fw), bh - 2); ctx.shadowBlur = 0;
  }
  y += bh + 8;

  // Next pieces
  y += 8;
  ctx.fillStyle = '#555'; ctx.font = '12px sans-serif'; ctx.fillText('下一个', hx + hw / 2, y); y += 18;
  var pieces = state.nextPieces || [];
  for (var i = 0; i < Math.min(pieces.length, 3); i++) {
    var p = pieces[i], ns = CELL_SIZE * 2;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.strokeRect(hx + (hw - ns) / 2, y, ns, ns * 0.8);
    var shape = p.shape, size = p.size, mc = ns / 4;
    var ox = hx + (hw - ns) / 2 + (ns - size * mc) / 2, oy = y + (ns * 0.8 - size * mc) / 2;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) {
      var co = getPieceColor(p.type);
      ctx.fillStyle = co.fill; ctx.shadowColor = co.glow; ctx.shadowBlur = 2;
      ctx.fillRect(ox + c * mc + 1, oy + r * mc + 1, mc - 2, mc - 2); ctx.shadowBlur = 0;
    }
    y += ns * 0.8 + 8;
  }
}

// ═══ Main Game ═══
var game = {
  canvas: null, ctx: null, dpr: 2,
  screenW: 375, screenH: 667,
  renderer: null,
  board: null, bag: null,
  piece: null, holdPiece: null, canHold: true, nextPieces: [],
  score: 0, level: 1, lines: 0, combo: 0, maxCombo: 0,
  feverGauge: 0, isFever: false, feverTimer: 0,
  gameOver: false, paused: false,
  dropTimer: 0, lockTimer: 0, isLocking: false, lockMoves: 0,
  clearingRows: [], clearTimer: 0,
  comboText: null, comboTextTimer: 0,
  shakeX: 0, shakeY: 0, shakeDur: 0,
  lastTime: 0,
  scene: 'menu', // 'menu' | 'game' | 'gameover'
  menuButtons: [],
  gameoverButtons: [],
  lastStats: null,
  retryBtn: null,
  animTime: 0,
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

    // Show share menu
    showShareMenu();

    // Init game state
    this.board = createBoard();
    this.bag = createPieceBag();

    // Bind input
    this._bindInput();

    // Menu buttons
    this._buildMenuButtons();

    // Start loop
    this.lastTime = Date.now();
    this._loop(this.lastTime);
  },

  _buildMenuButtons: function() {
    var cw = this.screenW, ch = this.screenH;
    var btnW = cw * 0.5, btnH = 56, cx = cw / 2;
    this.menuButtons = [
      { id: 'play', label: '开始游戏', x: cx - btnW / 2, y: ch * 0.45, w: btnW, h: btnH, color: '#00ffff' },
      { id: 'daily', label: '每日挑战', x: cx - btnW / 2, y: ch * 0.45 + btnH + 16, w: btnW, h: btnH * 0.8, color: '#ff00ff' },
      { id: 'leaderboard', label: '排行榜', x: cx - btnW * 0.35, y: ch * 0.45 + btnH * 2 + 24, w: btnW * 0.7, h: btnH * 0.7, color: '#888' },
    ];
  },

  _bindInput: function() {
    var self = this;
    var ts = null, tc = null, active = false, longTimer = null, isLong = false, swiped = false;
    var SW = 30, LT = 200, TT = 10;

    function handleStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      var t = e.touches[0];
      ts = { x: t.clientX || t.x || 0, y: t.clientY || t.y || 0, time: Date.now() };
      tc = { x: ts.x, y: ts.y };
      active = true; isLong = false; swiped = false;
      longTimer = setTimeout(function() { isLong = true; if (self.scene === 'game') self._onSoftDrop(true); }, LT);
    }

    function handleMove(e) {
      if (!active || !e.touches || e.touches.length === 0) return;
      var t = e.touches[0];
      tc = { x: t.clientX || t.x || 0, y: t.clientY || t.y || 0 };
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
      if (isLong) { isLong = false; if (self.scene === 'game') self._onSoftDrop(false); return; }
      if (!tc || !ts) return;
      var dx = Math.abs(tc.x - ts.x), dy = Math.abs(tc.y - ts.y), dt = Date.now() - ts.time;
      if (self.scene === 'game') {
        if (dx < TT && dy < TT && dt < 300) {
          var midX = self.screenW / 2;
          self._rotate(ts.x < midX ? -1 : 1);
        } else if (dy < -SW && !swiped) { self._hold(); }
      } else if (self.scene === 'menu' || self.scene === 'gameover') {
        if (dx < TT && dy < TT && dt < 300) {
          self._handleSceneTap(ts.x, ts.y);
        }
      }
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
    }
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
    this.clearingRows = []; this.clearTimer = 0;
    this.comboText = null; this.comboTextTimer = 0;
    this.shakeX = 0; this.shakeY = 0; this.shakeDur = 0;
    this._nextPiece();
    // Show banner ad during gameplay
    if (typeof wx !== 'undefined' && wx.createBannerAd) {
      try {
        this.bannerAd = wx.createBannerAd({ adUnitId: 'adunit-xxxxxxxxxxxxx4', adIntervals: 30,
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
      vibrateShort();
    }
  },

  _rotate: function(dir) {
    if (!this.piece || !this._canAct() || this.piece.type === 'O') return;
    var from = this.piece.rotation, to = ((from + dir) % 4 + 4) % 4;
    var kicks = getWallKicks(this.piece.type, from, to);
    for (var i = 0; i < kicks.length; i++) {
      var dx = kicks[i][0], dy = kicks[i][1];
      var tx = this.piece.x + dx, ty = this.piece.y - dy;
      if (boardCanPlace(this.board, this.piece, tx, ty, to)) {
        this.piece.rotation = to; this.piece.shape = getRotationState(this.piece.type, to);
        this.piece.x = tx; this.piece.y = ty;
        this.lockMoves = 0; this.lockTimer = 0;
        vibrateShort();
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
    this._lock();
    this.shakeX = 3; this.shakeDur = 50;
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
    boardLock(this.board, this.piece);
    this.isLocking = false; this.lockTimer = 0; this.lockMoves = 0; this.canHold = true;

    var cleared = boardClearLines(this.board);
    if (cleared.length > 0) {
      this.clearingRows = cleared; this.clearTimer = 300;
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
      if (this.feverGauge >= 100 && !this.isFever) { this.isFever = true; this.feverTimer = FEVER_DURATION; this.feverGauge = 100; }

      var txt = ''; switch(n) { case 2: txt = 'DOUBLE'; break; case 3: txt = 'TRIPLE'; break; case 4: txt = 'TETRIS!'; break; }
      if (txt) { this.comboText = { text: txt, pts: pts }; this.comboTextTimer = 1000; }
      if (n === 4) { this.shakeX = 6; this.shakeDur = 200; }
      vibrateLong();
    } else {
      this.combo = 0;
    }
    this.piece = null;
    if (!this.gameOver) this._nextPiece();
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
    this.retryBtn = { x: cw / 2 - 80, y: ch * 0.5, w: 160, h: 50 };
  },

  _loop: function(now) {
    var dt = now - this.lastTime; this.lastTime = now;
    this.animTime += dt;

    if (this.scene === 'game' && !this.gameOver && !this.paused) {
      // Clear animation
      if (this.clearingRows.length > 0) { this.clearTimer -= dt; if (this.clearTimer <= 0) this.clearingRows = []; }

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
    }

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

    // BG
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, cw, ch);

    // Animated grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)'; ctx.lineWidth = 1;
    var offset = (this.animTime * 0.02) % 30;
    for (var x = -30 + offset; x < cw + 30; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + ch * 0.3, ch); ctx.stroke();
    }

    // Title
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 42px sans-serif';
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff'; ctx.fillText('方块大作战', cw / 2, ch * 0.15);
    ctx.shadowBlur = 0;
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#666'; ctx.fillText('BLOCK BATTLE', cw / 2, ch * 0.15 + 36);
    ctx.restore();

    // Buttons
    for (var i = 0; i < this.menuButtons.length; i++) {
      var btn = this.menuButtons[i];
      ctx.save();
      ctx.shadowColor = btn.color; ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(0, 20, 40, 0.9)'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeStyle = btn.color; ctx.lineWidth = btn.id === 'play' ? 2 : 1; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = btn.color; ctx.font = 'bold 20px sans-serif'; ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }

    // Footer
    ctx.fillStyle = '#888'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('v1.0 — Block Battle Tetris', cw / 2, ch - 40);
  },

  _renderGame: function() {
    var ctx = this.ctx, cw = this.screenW;

    this.renderer.clear();

    // Clearing animation
    if (this.clearingRows.length > 0) {
      var clearingSet = {};
      for (var i = 0; i < this.clearingRows.length; i++) clearingSet[this.clearingRows[i]] = true;
      var bounds = this.renderer.getBounds();
      for (var r = 0; r < ROWS; r++) { if (clearingSet[r]) continue; for (var c = 0; c < COLS; c++) if (this.board[r][c]) this.renderer.drawCell(c, r, this.board[r][c], 1); }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (var i = 0; i < this.clearingRows.length; i++) {
        ctx.fillRect(bounds.x, bounds.y + this.clearingRows[i] * bounds.cs, bounds.w, bounds.cs);
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
    if (this.piece && this.clearingRows.length === 0) this.renderer.drawPiece(this.piece);

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

    // Pause
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, this.screenW, this.screenH);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('暂停', this.screenW / 2, this.screenH / 2 - 30);
      ctx.fillStyle = '#888'; ctx.font = '18px sans-serif'; ctx.fillText('点击屏幕继续', this.screenW / 2, this.screenH / 2 + 20);
    }
  },

  _renderGameOver: function() {
    var ctx = this.ctx, cw = this.screenW, ch = this.screenH;

    // First render the game board in background
    this._renderGame();

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 40px sans-serif'; ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15;
    ctx.fillText('游戏结束', cw / 2, ch * 0.12);
    ctx.shadowBlur = 0;

    if (this.lastStats) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 32px sans-serif';
      ctx.fillText(this.lastStats.score.toLocaleString(), cw / 2, ch * 0.22);
      ctx.fillStyle = '#888'; ctx.font = '14px sans-serif';
      var statsStr = '等级 ' + this.lastStats.level + '  ·  行数 ' + this.lastStats.lines + '  ·  连击 x' + this.lastStats.maxCombo;
      if (this.lastStats.maxCombo) statsStr += '  ·  最高连击 x' + this.lastStats.maxCombo;
      ctx.fillText(statsStr, cw / 2, ch * 0.30);
    }

    // Retry button
    if (this.retryBtn) {
      var b = this.retryBtn;
      ctx.fillStyle = 'rgba(0,40,60,0.9)'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#00ffff'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('再来一局', b.x + b.w / 2, b.y + b.h / 2);
    }

    // Share button
    var sbx = cw / 2 - 70, sby = this.retryBtn ? this.retryBtn.y + 60 : ch * 0.58;
    ctx.fillStyle = 'rgba(0,20,30,0.9)'; ctx.fillRect(sbx, sby, 140, 40);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.strokeRect(sbx, sby, 140, 40);
    ctx.fillStyle = '#888'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('分享给好友', cw / 2, sby + 20);

    // Score doubling hint
    ctx.fillStyle = '#555'; ctx.font = '12px sans-serif';
    ctx.fillText('分享后可看视频双倍积分', cw / 2, ch * 0.75);

    // Back to menu
    ctx.fillStyle = '#666'; ctx.font = '14px sans-serif';
    ctx.fillText('点击上方按钮继续', cw / 2, ch - 40);
  },
};

// ═══ Boot ═══
game.init();
