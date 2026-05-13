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

function drawBackdrop(ctx, w, h, time) {
  var bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#070a18');
  bg.addColorStop(0.48, '#101535');
  bg.addColorStop(1, '#060812');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  var glow = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, h * 0.55);
  glow.addColorStop(0, 'rgba(34,223,255,0.18)');
  glow.addColorStop(1, 'rgba(34,223,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  var magenta = ctx.createRadialGradient(w * 0.82, h * 0.76, 0, w * 0.82, h * 0.76, h * 0.5);
  magenta.addColorStop(0, 'rgba(255,69,176,0.15)');
  magenta.addColorStop(1, 'rgba(255,69,176,0)');
  ctx.fillStyle = magenta;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = 'rgba(124,246,255,0.055)';
  ctx.lineWidth = 1;
  var gap = 34;
  var offset = ((time || 0) * 0.018) % gap;
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
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent || 'rgba(124,246,255,0.35)';
  ctx.lineWidth = 1;
  ctx.shadowColor = accent || '#22dfff';
  ctx.shadowBlur = 8;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 11);
  ctx.stroke();
  ctx.restore();
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
    cellSize = Math.min(Math.floor(w * 0.58 / COLS), Math.floor((h - 250) / ROWS), 28);
    cellSize = Math.max(16, cellSize);
    boardW = COLS * cellSize; boardH = ROWS * cellSize;
    boardX = Math.floor((w - boardW) / 2);
    boardY = Math.floor(Math.max(150, Math.min(h * 0.25, h - boardH - 98)));
  }

  function clear() {
    var w = canvas.width / dpr, h = canvas.height / dpr;
    drawBackdrop(ctx, w, h, Date.now());
    drawPanel(ctx, boardX - 8, boardY - 8, boardW + 16, boardH + 16, 'rgba(124,246,255,0.42)', 0.92);
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
      ctx.shadowColor = color.glow; ctx.shadowBlur = 10; ctx.fillStyle = color.fill;
      roundRect(ctx, gx, gy, gw, gh, 5); ctx.fill();
      ctx.shadowBlur = 0;
      var grad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      grad.addColorStop(0, 'rgba(255,255,255,0.46)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.08)'); grad.addColorStop(1, 'rgba(0,0,0,0.30)');
      ctx.fillStyle = grad; roundRect(ctx, gx, gy, gw, gh, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      roundRect(ctx, gx + 4, gy + 4, Math.max(4, gw - 8), Math.max(3, gh * 0.18), 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.34)'; ctx.lineWidth = 1;
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
  var ch = ctx.canvas.height / dpr;
  var leftW = Math.max(60, boardBounds.x - 16);
  var rightX = boardBounds.x + boardBounds.w + 8;
  var rightW = Math.max(58, cw - rightX - 10);

  function drawMini(shape, type, x, y, boxW, boxH) {
    var size = shape.length, mc = Math.min(boxW, boxH) / 4;
    var ox = x + (boxW - size * mc) / 2, oy = y + (boxH - size * mc) / 2;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (shape[r][c]) {
      var co = getPieceColor(type);
      ctx.save();
      ctx.fillStyle = co.fill; ctx.shadowColor = co.glow; ctx.shadowBlur = 5;
      roundRect(ctx, ox + c * mc + 1, oy + r * mc + 1, mc - 2, mc - 2, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      roundRect(ctx, ox + c * mc + 3, oy + r * mc + 3, Math.max(3, mc - 6), Math.max(2, mc * 0.18), 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStat(x, y, w, label, value, color) {
    ctx.textAlign = 'center';
    drawPanel(ctx, x, y, w, 50, 'rgba(124,246,255,0.24)', 0.74);
    ctx.fillStyle = '#8ea4c7'; ctx.font = '11px sans-serif'; ctx.fillText(label, x + w / 2, y + 15);
    ctx.fillStyle = color || '#fff'; ctx.font = 'bold 19px sans-serif'; ctx.shadowColor = color || '#7cf6ff'; ctx.shadowBlur = 5;
    var text = typeof value === 'number' ? value.toLocaleString() : String(value);
    ctx.fillText(text, x + w / 2, y + 38); ctx.shadowBlur = 0;
  }

  // Hold piece on the left, like the concept art.
  var lx = 8, ly = boardBounds.y + 12;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b8c7e8'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('暂存', lx + leftW / 2, ly);
  var hs = Math.min(74, Math.max(52, leftW));
  var holdX = lx + (leftW - hs) / 2;
  drawPanel(ctx, holdX, ly + 12, hs, hs, state.holdPiece ? 'rgba(124,246,255,0.45)' : 'rgba(255,255,255,0.14)', 0.78);
  if (state.holdPiece) {
    drawMini(getRotationState(state.holdPiece.type, 0), state.holdPiece.type, holdX + 6, ly + 18, hs - 12, hs - 12);
  } else {
    ctx.fillStyle = 'rgba(184,199,232,0.35)';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('?', holdX + hs / 2, ly + 12 + hs / 2 + 7);
  }

  // Fever gauge
  var fy = ly + hs + 48;
  drawPanel(ctx, lx, fy, leftW, 126, 'rgba(255,111,216,0.38)', 0.76);
  ctx.fillStyle = '#ff8ee2'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(state.combo > 1 ? '连击' : '狂热', lx + leftW / 2, fy + 22);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff6fd8'; ctx.shadowBlur = 10;
  ctx.font = state.combo > 1 ? 'bold 24px sans-serif' : 'bold 17px sans-serif';
  ctx.fillText(state.combo > 1 ? 'x' + state.combo : 'FEVER', lx + leftW / 2, fy + 50);
  ctx.shadowBlur = 0;
  var bw = leftW - 16, bh = 12, bx = lx + 8, by = fy + 90;
  drawPanel(ctx, bx, by, bw, bh, 'rgba(255,111,216,0.24)', 0.58);
  if (state.feverGauge > 0) {
    var fw = (state.feverGauge / 100) * (bw - 4);
    var fg = ctx.createLinearGradient(bx, by, bx + fw, by);
    fg.addColorStop(0, state.isFever ? '#ffab45' : '#22dfff');
    fg.addColorStop(1, state.isFever ? '#ff5b7d' : '#34f389');
    ctx.fillStyle = fg; ctx.shadowColor = state.isFever ? '#ffab45' : '#22dfff'; ctx.shadowBlur = state.isFever ? 12 : 7;
    roundRect(ctx, bx + 2, by + 2, Math.max(8, fw), bh - 4, 5); ctx.fill(); ctx.shadowBlur = 0;
  }

  // Compact right column.
  var ry = boardBounds.y + 12;
  drawStat(rightX, ry, rightW, '等级', state.level, '#7cf6ff');
  drawStat(rightX, ry + 58, rightW, '行数', state.lines, '#34f389');

  // Next pieces
  ry += 128;
  ctx.fillStyle = '#b8c7e8'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('下一个', rightX + rightW / 2, ry); ry += 12;
  var pieces = state.nextPieces || [];
  for (var i = 0; i < Math.min(pieces.length, 3); i++) {
    var p = pieces[i], ns = Math.min(58, Math.max(42, rightW - 6));
    var nx = rightX + (rightW - ns) / 2;
    drawPanel(ctx, nx, ry, ns, ns * 0.76, 'rgba(124,246,255,0.14)', 0.55);
    drawMini(p.shape, p.type, nx + 4, ry + 2, ns - 8, ns * 0.76 - 4);
    ry += ns * 0.76 + 8;
  }

  // Target score card at the upper right, mirroring the concept without adding gameplay dependency.
  var targetY = 18;
  drawPanel(ctx, cw - rightW - 10, targetY, rightW, 46, 'rgba(124,246,255,0.24)', 0.62);
  ctx.fillStyle = '#8ea4c7'; ctx.font = '10px sans-serif'; ctx.fillText('目标', cw - rightW / 2 - 10, targetY + 14);
  ctx.fillStyle = '#7cf6ff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('15,000', cw - rightW / 2 - 10, targetY + 34);
}

function drawGameTopBar(ctx, w, state) {
  var panelW = Math.min(w * 0.60, 260);
  var x = (w - panelW) / 2;
  var y = 58;
  drawPanel(ctx, x, y, panelW, 82, 'rgba(124,246,255,0.52)', 0.84);
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

function drawTouchControls(ctx, w, h) {
  var y = h - 72;
  var size = 52;
  var gap = 10;
  var controls = [
    { text: '‹', x: w / 2 - size * 2 - gap * 1.5, color: '#7cf6ff' },
    { text: '›', x: w / 2 - size - gap / 2, color: '#7cf6ff' },
    { text: '↻', x: w / 2 + gap / 2, color: '#ffffff' },
    { text: '↓', x: w / 2 + size + gap * 1.5, color: '#ffd39a' },
  ];
  for (var i = 0; i < controls.length; i++) {
    var c = controls[i];
    drawPanel(ctx, c.x, y, size, size, i === 3 ? 'rgba(255,211,154,0.64)' : 'rgba(124,246,255,0.34)', 0.7);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.color;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(c.text, c.x + size / 2, y + size / 2 + 1);
    ctx.shadowBlur = 0;
  }
  ctx.textBaseline = 'alphabetic';
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
          if (self._handleControlTap(ts.x, ts.y)) return;
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
    var size = 52, gap = 10, y = this.screenH - 72, cx = this.screenW / 2;
    return [
      { id: 'left', x: cx - size * 2 - gap * 1.5, y: y, w: size, h: size },
      { id: 'right', x: cx - size - gap / 2, y: y, w: size, h: size },
      { id: 'rotate', x: cx + gap / 2, y: y, w: size, h: size },
      { id: 'drop', x: cx + size + gap * 1.5, y: y, w: size, h: size },
    ];
  },

  _handleControlTap: function(x, y) {
    var buttons = this._getControlButtons();
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) continue;
      if (b.id === 'left') this._move(-1, 0);
      if (b.id === 'right') this._move(1, 0);
      if (b.id === 'rotate') this._rotate(1);
      if (b.id === 'drop') this._hardDrop();
      return true;
    }
    return false;
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
    this.retryBtn = { x: cw / 2 - Math.min(220, cw * 0.62) / 2, y: ch * 0.50, w: Math.min(220, cw * 0.62), h: 52 };
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

    drawBackdrop(ctx, cw, ch, this.animTime);

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
      ctx.shadowColor = btn.color; ctx.shadowBlur = btn.hot ? 18 : 10;
      var g = ctx.createLinearGradient(x, y, x + btn.w, y + btn.h);
      g.addColorStop(0, 'rgba(22,36,78,0.96)');
      g.addColorStop(1, 'rgba(6,11,30,0.92)');
      ctx.fillStyle = g; roundRect(ctx, x, y, btn.w, btn.h, 14); ctx.fill();
      ctx.strokeStyle = btn.color; ctx.lineWidth = btn.hot ? 2 : 1.2; roundRect(ctx, x, y, btn.w, btn.h, 14); ctx.stroke();
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

    this.renderer.clear();
    drawGameTopBar(ctx, cw, { score: this.score });

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
    drawTouchControls(ctx, cw, ch);

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
    ctx.font = 'bold 40px sans-serif'; ctx.fillStyle = '#ff5b7d'; ctx.shadowColor = '#ff5b7d'; ctx.shadowBlur = 18;
    ctx.fillText('游戏结束', cw / 2, ch * 0.12);
    ctx.shadowBlur = 0;

    if (this.lastStats) {
      var panelW = Math.min(cw * 0.78, 310);
      var panelX = (cw - panelW) / 2;
      drawPanel(ctx, panelX, ch * 0.18, panelW, 154, 'rgba(255,111,216,0.38)', 0.96);
      ctx.fillStyle = '#8ea4c7'; ctx.font = '13px sans-serif';
      ctx.fillText('最终得分', cw / 2, ch * 0.18 + 28);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 38px sans-serif'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 12;
      ctx.fillText(this.lastStats.score.toLocaleString(), cw / 2, ch * 0.18 + 70);
      ctx.shadowBlur = 0;
      var statY = ch * 0.18 + 118;
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

    // Retry button
    if (this.retryBtn) {
      var b = this.retryBtn;
      drawPanel(ctx, b.x, b.y, b.w, b.h, 'rgba(124,246,255,0.64)', 0.98);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#22dfff'; ctx.shadowBlur = 10; ctx.font = 'bold 20px sans-serif'; ctx.fillText('再来一局', b.x + b.w / 2, b.y + b.h / 2);
      ctx.shadowBlur = 0;
    }

    // Share button
    var sbx = cw / 2 - 70, sby = this.retryBtn ? this.retryBtn.y + 60 : ch * 0.58;
    drawPanel(ctx, sbx, sby, 140, 40, 'rgba(255,255,255,0.16)', 0.78);
    ctx.fillStyle = '#8ea4c7'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('分享给好友', cw / 2, sby + 20);

    // Score doubling hint
    ctx.fillStyle = '#60708f'; ctx.font = '12px sans-serif';
    ctx.fillText('分享后可看视频双倍积分', cw / 2, ch * 0.75);

    // Back to menu
    ctx.fillStyle = '#60708f'; ctx.font = '14px sans-serif';
    ctx.fillText('点击上方按钮继续', cw / 2, ch - 40);
  },
};

// ═══ Boot ═══
game.init();
