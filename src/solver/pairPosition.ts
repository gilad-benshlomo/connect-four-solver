import { COLUMNS, ROWS } from '../game/board';
import type { Position } from './position';

// Same layout as BigIntPosition: each column takes ROWS + 1 bits, the extra
// bit being an always-empty helper row. Cell (column, row) is bit
// `column * COLUMN_BITS + row` of the whole 49-bit board.
const COLUMN_BITS = ROWS + 1;

// JavaScript bitwise operators work on 32 bits, so the board is split in two
// halves by columns: columns 0-3 are the low half (bits 0-27) and columns 4-6
// are the high half (stored from bit 0, standing for bits 28-48). Every column
// lies wholly in one half, so dropping a disc never crosses between them, and
// neither half reaches bit 31, so every value stays a positive integer.
const LOW_COLUMNS = 4;
const LOW_BITS = LOW_COLUMNS * COLUMN_BITS;

// Copied into local constants because the functions below run millions of
// times per search, and imported values can be slower to read in some setups
// (the test runner reads them through the importing module on every use).
const TOP_ROW = ROWS - 1;
const COLUMN_MASK = (1 << ROWS) - 1; // the playable cells of column 0

/** Returns true if the column is stored in the low half. */
function isLow(column: number): boolean {
  return column < LOW_COLUMNS;
}

/** Returns the bit of the bottom cell of a column, within its own half. */
function bottomCell(column: number): number {
  const local = isLow(column) ? column : column - LOW_COLUMNS;
  return 1 << (local * COLUMN_BITS);
}

/** Returns the bit of the top playable cell of a column, within its own half. */
function topCell(column: number): number {
  return bottomCell(column) << TOP_ROW;
}

/** Returns the bits of all playable cells of a column, within its own half. */
function columnCells(column: number): number {
  return COLUMN_MASK * bottomCell(column);
}

/** Returns the bottom cells of the columns from `first` up to (not including) `end`, within their half. */
function bottomRow(first: number, end: number): number {
  let bits = 0;
  for (let column = first; column < end; column++) {
    bits |= bottomCell(column);
  }
  return bits;
}

const BOTTOM_ROW_LOW = bottomRow(0, LOW_COLUMNS);
const BOTTOM_ROW_HIGH = bottomRow(LOW_COLUMNS, COLUMNS);

/**
 * Returns true if the given discs contain four in a row along one direction,
 * where `step` is the distance in bits between neighbouring cells.
 */
function hasFourAlong(low: number, high: number, step: number): boolean {
  // Shifting the whole board right moves the bottom bits of the high half
  // into the top of the low half, so lines across the two halves are found.
  // Bits pushed past bit 27 of the low half do no harm: the result is ANDed
  // with real discs, and the low half has none there.
  const pairsLow = low & ((low >>> step) | (high << (LOW_BITS - step)));
  const pairsHigh = high & (high >>> step);
  const twoSteps = 2 * step;
  const foursLow = pairsLow & ((pairsLow >>> twoSteps) | (pairsHigh << (LOW_BITS - twoSteps)));
  const foursHigh = pairsHigh & (pairsHigh >>> twoSteps);
  return (foursLow | foursHigh) !== 0;
}

/** Returns true if the given discs contain four in a row in any direction. */
function hasFour(low: number, high: number): boolean {
  // Vertical, horizontal, diagonal going down, diagonal going up.
  // (Written out, not looped over a list, to keep the hot path simple.)
  return (
    hasFourAlong(low, high, 1) ||
    hasFourAlong(low, high, COLUMN_BITS) ||
    hasFourAlong(low, high, COLUMN_BITS - 1) ||
    hasFourAlong(low, high, COLUMN_BITS + 1)
  );
}

/**
 * A Connect Four position stored as bitboards split over two 32-bit numbers.
 *
 * This is the solver's fast board. It behaves exactly like `BigIntPosition`,
 * including the keys it returns, and the tests check that on every position.
 * Every value is a plain number, and no method creates temporary objects.
 */
export class PairPosition implements Position {
  /** All discs on the board, of both players: columns 0-3. */
  private maskLow = 0;

  /** All discs on the board, of both players: columns 4-6. */
  private maskHigh = 0;

  /** Discs of the player to move: columns 0-3. */
  private currentLow = 0;

  /** Discs of the player to move: columns 4-6. */
  private currentHigh = 0;

  /** Number of moves played so far. */
  private moveCount = 0;

  /** Number of moves played so far. */
  get moves(): number {
    return this.moveCount;
  }

  /** Returns true if the column still has an empty cell. */
  canPlay(column: number): boolean {
    const mask = isLow(column) ? this.maskLow : this.maskHigh;
    return (mask & topCell(column)) === 0;
  }

  /**
   * Drops a disc for the player to move, then passes the turn.
   * Must only be called on a playable column (see `canPlay`).
   */
  play(column: number): void {
    // The current player's discs become the opponent's view: the turn passes.
    this.currentLow ^= this.maskLow;
    this.currentHigh ^= this.maskHigh;
    // Adding the bottom bit carries up to the first empty cell of the column.
    if (isLow(column)) {
      this.maskLow |= this.maskLow + bottomCell(column);
    } else {
      this.maskHigh |= this.maskHigh + bottomCell(column);
    }
    this.moveCount++;
  }

  /**
   * Returns true if the player to move would win by dropping a disc in the column.
   * Must only be called on a playable column (see `canPlay`).
   */
  isWinningMove(column: number): boolean {
    // The carry clears the taken cells below, leaving only the new disc's bit.
    if (isLow(column)) {
      const newDisc = (this.maskLow + bottomCell(column)) & columnCells(column);
      return hasFour(this.currentLow | newDisc, this.currentHigh);
    }
    const newDisc = (this.maskHigh + bottomCell(column)) & columnCells(column);
    return hasFour(this.currentLow, this.currentHigh | newDisc);
  }

  /**
   * Returns the same key as `BigIntPosition.key` for the same position.
   * Each column's sum stays inside the column, so the halves can be summed
   * separately and joined; the result is at most 49 bits, exact in a number.
   */
  key(): number {
    const low = this.currentLow + this.maskLow + BOTTOM_ROW_LOW;
    const high = this.currentHigh + this.maskHigh + BOTTOM_ROW_HIGH;
    return low + high * 2 ** LOW_BITS;
  }

  /** Returns an independent copy: playing in one never changes the other. */
  clone(): PairPosition {
    const copy = new PairPosition();
    copy.maskLow = this.maskLow;
    copy.maskHigh = this.maskHigh;
    copy.currentLow = this.currentLow;
    copy.currentHigh = this.currentHigh;
    copy.moveCount = this.moveCount;
    return copy;
  }
}