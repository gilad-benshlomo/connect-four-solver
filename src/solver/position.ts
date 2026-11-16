/**
 * What the search needs from a board: the moves played, which columns are
 * open, which moves win, a key that identifies the position, and copies.
 *
 * Two boards implement it (D16): `BigIntPosition`, the readable reference,
 * and `PairPosition`, the fast one. Only those two files know how the bits
 * are stored; everything that comes out of them is a plain number or boolean.
 */
export interface Position {
  /** Number of moves played so far. */
  readonly moves: number;

  /** Returns true if the column still has an empty cell. */
  canPlay(column: number): boolean;

  /**
   * Drops a disc for the player to move, then passes the turn.
   * Must only be called on a playable column (see `canPlay`).
   */
  play(column: number): void;

  /**
   * Returns true if the player to move would win by dropping a disc in the column.
   * Must only be called on a playable column (see `canPlay`).
   */
  isWinningMove(column: number): boolean;

  /** Returns a number that identifies the position; the same for both boards. */
  key(): number;

  /** Returns an independent copy: playing in one never changes the other. */
  clone(): Position;
}