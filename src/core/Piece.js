// SRS (Super Rotation System) piece definitions
// Each piece has 4 rotation states (0-3), each state is a 4x4 matrix
// SRS uses specific wall kick offset tables

// Piece shapes in rotation state 0 (spawn state)
// Stored as [row][col], 1 = filled cell
const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// SRS wall kick offset data
// Key: "fromRotation>toRotation"
// Value: array of [dx, dy] offsets to try (in piece-space coords)
// Standard SRS kick table (for J, L, S, Z, T pieces)
const WALL_KICKS = {
  '0>1': [[0, 0], [-1, 0], [-1, +1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [+1, 0], [+1, -1], [0, +2], [+1, +2]],
  '1>2': [[0, 0], [+1, 0], [+1, -1], [0, +2], [+1, +2]],
  '2>1': [[0, 0], [-1, 0], [-1, +1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [+1, 0], [+1, +1], [0, -2], [+1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, +2], [-1, +2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, +2], [-1, +2]],
  '0>3': [[0, 0], [+1, 0], [+1, +1], [0, -2], [+1, -2]],
};

// I-piece has its own kick table (different offsets)
const WALL_KICKS_I = {
  '0>1': [[0, 0], [-2, 0], [+1, 0], [-2, -1], [+1, +2]],
  '1>0': [[0, 0], [+2, 0], [-1, 0], [+2, +1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [+2, 0], [-1, +2], [+2, -1]],
  '2>1': [[0, 0], [+1, 0], [-2, 0], [+1, -2], [-2, +1]],
  '2>3': [[0, 0], [+2, 0], [-1, 0], [+2, +1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [+1, 0], [-2, -1], [+1, +2]],
  '3>0': [[0, 0], [+1, 0], [-2, 0], [+1, -2], [-2, +1]],
  '0>3': [[0, 0], [-1, 0], [+2, 0], [-1, +2], [+2, -1]],
};

// Piece type names
const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Rotate a matrix 90 degrees clockwise
export function rotateCW(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = [];
  for (let c = 0; c < cols; c++) {
    result[c] = [];
    for (let r = rows - 1; r >= 0; r--) {
      result[c][rows - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

// Rotate a matrix 90 degrees counter-clockwise
export function rotateCCW(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = [];
  for (let c = cols - 1; c >= 0; c--) {
    result[cols - 1 - c] = [];
    for (let r = 0; r < rows; r++) {
      result[cols - 1 - c][r] = matrix[r][c];
    }
  }
  return result;
}

// Get all 4 rotation states for a piece type
function generateRotationStates(type) {
  const base = SHAPES[type];
  const states = [base];
  for (let i = 0; i < 3; i++) {
    states.push(rotateCW(states[states.length - 1]));
  }
  return states;
}

// Pre-compute all rotation states
const ROTATION_STATES = {};
for (const type of PIECE_TYPES) {
  ROTATION_STATES[type] = generateRotationStates(type);
}

export function getRotationState(type, rotation) {
  return ROTATION_STATES[type][((rotation % 4) + 4) % 4];
}

export function getWallKicks(type, fromRotation, toRotation) {
  const key = `${fromRotation}>${toRotation}`;
  if (type === 'I') return WALL_KICKS_I[key] || [[0, 0]];
  if (type === 'O') return [[0, 0]]; // O piece doesn't kick
  return WALL_KICKS[key] || [[0, 0]];
}

export function getShapeSize(type) {
  return SHAPES[type].length;
}

export function getPieceTypes() {
  return PIECE_TYPES;
}

// Create a new piece instance
export function createPiece(type) {
  return {
    type,
    rotation: 0,
    x: type === 'I' ? 3 : 3, // spawn column (centered)
    y: type === 'I' ? -1 : -1, // spawn row
    shape: getRotationState(type, 0),
    size: getShapeSize(type),
  };
}

// Check if a cell in the piece's shape is filled
export function isCellFilled(shape, row, col) {
  if (row < 0 || row >= shape.length || col < 0 || col >= shape[0].length) return false;
  return shape[row][col] === 1;
}

// Get all filled cells of a piece at its current position
export function getFilledCells(piece) {
  const cells = [];
  const shape = piece.shape;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        cells.push({ x: piece.x + c, y: piece.y + r });
      }
    }
  }
  return cells;
}
