import { ROWS } from '../game/board';

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

/**
 * A Connect Four position stored as two BigInt bitboards.
 *
 * This is the solver's readable reference board: simple and easy to verify,
 * but slow. Cell (column, row) is bit `column * (ROWS + 1) + row`.
 * Only the solver uses it, so `play` changes the position in place for speed.
 */
export class BigIntPosition {
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
}