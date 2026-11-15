import { COLUMNS, ROWS } from '../game/board';
import type { BigIntPosition } from './bigintPosition';

/** Number of cells on the board: the most moves a game can last. */
const CELLS = COLUMNS * ROWS;

/**
 * Returns the exact score of a position for the player to move,
 * assuming both players play perfectly:
 * - positive: the player to move wins. The score is 22 minus the number of
 *   the winner's disc that completes the line, so a sooner win scores higher;
 * - negative: the player to move loses, on the same scale;
 * - 0: a draw.
 *
 * This is the plain version with no pruning: it visits every continuation,
 * so it is only practical close to the end of a game.
 * Must not be called on a position that is already won.
 */
export function negamax(position: BigIntPosition): number {
  if (position.moves === CELLS) {
    return 0; // the board is full and nobody won: a draw
  }

  // Winning right away is the best possible result, so look for it first.
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column) && position.isWinningMove(column)) {
      // Same as 22 minus the winner's disc number, worked out from the moves.
      return Math.floor((CELLS + 1 - position.moves) / 2);
    }
  }

  let best = -CELLS; // lower than any real score
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column)) {
      const next = position.clone();
      next.play(column);
      // The result is from the opponent's point of view: flip it for ours.
      best = Math.max(best, -negamax(next));
    }
  }
  return best;
}