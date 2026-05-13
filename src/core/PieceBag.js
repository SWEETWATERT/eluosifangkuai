import { getPieceTypes, createPiece } from './Piece.js';

// 7-bag randomizer: shuffle all 7 piece types, deal them out.
// When the bag is empty, generate a new shuffled bag.
// This prevents long droughts of any single piece type.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class PieceBag {
  constructor() {
    this.bag = [];
    this.pieceTypes = getPieceTypes();
    this.fillBag();
  }

  fillBag() {
    const shuffled = shuffle(this.pieceTypes);
    this.bag.push(...shuffled);
  }

  next() {
    if (this.bag.length <= 7) {
      this.fillBag();
    }
    const type = this.bag.shift();
    return createPiece(type);
  }

  peek(count = 3) {
    // Ensure enough pieces in bag for peeking
    while (this.bag.length < count) {
      this.fillBag();
    }
    return this.bag.slice(0, count).map(type => createPiece(type));
  }

  reset() {
    this.bag = [];
    this.fillBag();
  }
}
