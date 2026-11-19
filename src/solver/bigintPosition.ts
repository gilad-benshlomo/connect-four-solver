import { COLUMNS, ROWS } from '../game/board';
import type { Position } from './position';

// Each column takes ROWS + 1 bits: the extra bit is an always-empty helper row
// that stops lines from wrapping from the top of one column to the next.
const COLUMN_BITS = BigInt(ROWS + 1);

// Distance in bits between neighbouring cells along each kind of line:
// vertical, horizontal, diagonal going down, diagonal going up.
const DIRECTIONS = [1n, COLUMN_BITS, COLUMN_BITS - 1n, COLUMN_BITS + 1n];

/** Returns the bit of the bottom cell of a column. */
function bottomCell(column: number): bigint {
  return 1n << (BigInt(column) * COLUMN_BITS);
}

/** Returns the bit of the top playable cell of a column. */
function topCell(column: number): bigint {
  return 1n << (BigInt(column) * COLUMN_BITS + BigInt(ROWS - 1));
}

/** Returns the bits of all playable cells of a column. */
function columnCells(column: number): bigint {
  return ((1n << BigInt(ROWS)) - 1n) << (BigInt(column) * COLUMN_BITS);
}

/** Returns the bottom cells of all columns together. */
function bottomRow(): bigint {
  let bits = 0n;
  for (let column = 0; column < COLUMNS; column++) {
    bits |= bottomCell(column);
  }
  return bits;
}

const BOTTOM_ROW = bottomRow();

/** Returns true if the given discs contain four in a row in any direction. */
function hasFour(discs: bigint): boolean {
  for (const step of DIRECTIONS) {
    // Bit i is on when cells i and i + step are both taken.
    const pairs = discs & (discs >> step);
    // Two such pairs, two steps apart, make four in a row.
    if ((pairs & (pairs >> (2n * step))) !== 0n) {
      return true;
    }
  }
  return false;
}

/** All playable cells of the board, without the helper row. */
const BOARD_CELLS = BOTTOM_ROW * ((1n << BigInt(ROWS)) - 1n);

/**
 * Returns the empty cells where the given discs would complete four in a row.
 * Some of them may not be playable yet, because cells below are still empty.
 */
function winningCells(discs: bigint, mask: bigint): bigint {
  let cells = 0n;
  for (const step of DIRECTIONS) {
    // `discs << step` marks every cell whose neighbour one step back is a disc.
    // A cell completes a line with three discs before it, two before and one
    // after, and the same the other way round.
    const twoBefore = (discs << step) & (discs << (2n * step));
    cells |= twoBefore & (discs << (3n * step));
    cells |= twoBefore & (discs >> step);
    const twoAfter = (discs >> step) & (discs >> (2n * step));
    cells |= twoAfter & (discs >> (3n * step));
    cells |= twoAfter & (discs << step);
  }
  return cells & (BOARD_CELLS ^ mask);
}

/**
 * A Connect Four position stored as two BigInt bitboards.
 *
 * This is the solver's readable reference board: simple and easy to verify,
 * but slow. Cell (column, row) is bit `column * (ROWS + 1) + row`.
 * Only the solver uses it, so `play` changes the position in place for speed.
 */
export class BigIntPosition implements Position {
  /** All discs on the board, of both players. */
  private mask = 0n;

  /** Discs of the player to move. */
  private current = 0n;

  /** Number of moves played so far. */
  private moveCount = 0;

  /** Number of moves played so far. */
  get moves(): number {
    return this.moveCount;
  }

  /** Returns true if the column still has an empty cell. */
  canPlay(column: number): boolean {
    return (this.mask & topCell(column)) === 0n;
  }

  /**
   * Drops a disc for the player to move, then passes the turn.
   * Must only be called on a playable column (see `canPlay`).
   */
  play(column: number): void {
    // The current player's discs become the opponent's view: the turn passes.
    this.current ^= this.mask;
    // Adding the bottom bit carries up to the first empty cell of the column.
    this.mask |= this.mask + bottomCell(column);
    this.moveCount++;
  }

  /**
   * Returns true if the player to move would win by dropping a disc in the column.
   * Must only be called on a playable column (see `canPlay`).
   */
  isWinningMove(column: number): boolean {
    // The carry clears the taken cells below, leaving only the new disc's bit.
    const newDisc = (this.mask + bottomCell(column)) & columnCells(column);
    return hasFour(this.current | newDisc);
  }

  /**
   * Returns a number that identifies the position: different positions always
   * get different keys. It uses at most 49 bits, so a plain number holds it exactly.
   */
  key(): number {
    // In each column the sum leaves a 1 just above the top disc, marking the
    // column's height; the bits below it say which player owns each disc.
    return Number(this.current + this.mask + BOTTOM_ROW);
  }
  /**
   * Returns the columns where the player to move can play without losing at
   * once, that is, without leaving the opponent a win with their next disc.
   * The result is a set of columns: bit c is on when column c is safe.
   * Must only be called when the player to move cannot win right away.
   */
  nonLosingColumns(): number {
    const threats = winningCells(this.current ^ this.mask, this.mask);
    // The cell where a disc would land in each column that is not full.
    let landing = (this.mask + BOTTOM_ROW) & BOARD_CELLS;
    const forced = landing & threats;
    if (forced !== 0n) {
      if ((forced & (forced - 1n)) !== 0n) {
        return 0; // two threats at once: only one can be blocked
      }
      landing = forced; // one threat: blocking it is the only move left
    }
    // Never play just below a cell where the opponent wins.
    const safe = landing & ~(threats >> 1n);
    let columns = 0;
    for (let column = 0; column < COLUMNS; column++) {
      if ((safe & columnCells(column)) !== 0n) {
        columns |= 1 << column;
      }
    }
    return columns;
  }

  /** Returns an independent copy: playing in one never changes the other. */
  clone(): BigIntPosition {
    const copy = new BigIntPosition();
    copy.mask = this.mask;
    copy.current = this.current;
    copy.moveCount = this.moveCount;
    return copy;
  }
  
}