import { COLS, ROWS } from '../utils/constants.js';
import { getFilledCells } from './Piece.js';

export class Board {
  constructor() {
    this.grid = [];
    this.reset();
  }

  reset() {
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = new Array(COLS).fill(null);
    }
  }

  getCell(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return this.grid[row][col];
  }

  // Check if a piece can be placed at the given position & rotation
  canPlace(piece, x, y, rotation) {
    const shape = piece.shape;
    const size = piece.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!shape[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        // Out of bounds (walls and floor)
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        // Above ceiling is ok (piece spawning)
        if (by < 0) continue;
        // Collision with locked piece
        if (this.grid[by][bx] !== null) return false;
      }
    }
    return true;
  }

  // Lock a piece onto the board, storing its color type
  lock(piece) {
    const cells = getFilledCells(piece);
    for (const { x, y } of cells) {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        this.grid[y][x] = piece.type;
      }
    }
  }

  // Find and clear full lines. Returns array of cleared row indices.
  clearLines() {
    const fullRows = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.grid[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }
    if (fullRows.length === 0) return [];

    // Remove full rows from top to bottom
    // This keeps indices correct as we splice
    for (const row of fullRows.sort((a, b) => b - a)) {
      this.grid.splice(row, 1);
      this.grid.unshift(new Array(COLS).fill(null));
    }
    return fullRows;
  }

  // Calculate ghost piece Y (hard drop destination)
  getGhostY(piece) {
    let gy = piece.y;
    while (this.canPlace(piece, piece.x, gy + 1, piece.rotation)) {
      gy++;
    }
    return gy;
  }

  // Check if a piece at its current position would overlap locked cells at spawn
  isTopOut(piece) {
    const cells = getFilledCells(piece);
    for (const { x, y } of cells) {
      if (y >= 0 && y < ROWS && this.grid[y][x] !== null) {
        return true;
      }
    }
    return false;
  }

  // Check if the board is in danger zone (top 4 rows have any locked cells)
  isDanger() {
    for (let r = 0; r < 4; r++) {
      if (this.grid[r].some(cell => cell !== null)) return true;
    }
    return false;
  }
}
