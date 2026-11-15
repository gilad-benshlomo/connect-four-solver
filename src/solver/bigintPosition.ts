import { ROWS } from '../game/board';

// Each column takes ROWS + 1 bits: the extra bit is an always-empty helper row
// that stops lines from wrapping from the top of one column to the next.
const COLUMN_BITS = BigInt(ROWS + 1);

/** Returns the bit of the bottom cell of a column. */
function bottomCell(column: number): bigint {
  return 1n << (BigInt(column) * COLUMN_BITS);
}

/** Returns the bit of the top playable cell of a column. */
function topCell(column: number): bigint {
  return 1n << (BigInt(column) * COLUMN_BITS + BigInt(ROWS - 1));
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
}