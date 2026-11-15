import { COLUMNS, ROWS } from '../game/board';
import type { BigIntPosition } from './bigintPosition';

/** Number of cells on the board: the most moves a game can last. */
const CELLS = COLUMNS * ROWS;

/** Returns the score for winning with the next disc, from the number of moves played. */
function immediateWinScore(moves: number): number {
  // Same as 22 minus the winner's disc number, worked out from the moves.
  return Math.floor((CELLS + 1 - moves) / 2);
}

/** Returns true if the player to move can win with their next disc. */
function canWinNow(position: BigIntPosition): boolean {
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column) && position.isWinningMove(column)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the exact score of a position for the player to move,
 * assuming both players play perfectly:
 * - positive: the player to move wins. The score is 22 minus the number of
 *   the winner's disc that completes the line, so a sooner win scores higher;
 * - negative: the player to move loses, on the same scale;
 * - 0: a draw.
 *
 * This is the plain version with no pruning: it visits every continuation,
 * so it is only practical close to the end of a game. It is kept as the
 * reference that `solve` is tested against.
 * Must not be called on a position that is already won.
 */
export function negamax(position: BigIntPosition): number {
  if (position.moves === CELLS) {
    return 0; // the board is full and nobody won: a draw
  }
  // Winning right away is the best possible result, so look for it first.
  if (canWinNow(position)) {
    return immediateWinScore(position.moves);
  }

  let best = -CELLS; // lower than any real score
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column)) {
      const next = position.clone();
      next.play(column);
      // The result is from the opponent's point of view: flip it for ours.
      // (0 - x, not -x: in JavaScript -0 is a separate value, and a draw must be 0.)
      best = Math.max(best, 0 - negamax(next));
    }
  }
  return best;
}

/**
 * Returns the same exact score as `negamax`, but skips the moves that cannot
 * change the result (alpha-beta pruning), so it is much faster.
 * Must not be called on a position that is already won.
 */
export function solve(position: BigIntPosition): number {
  // A window wider than any real score, so the result is always exact.
  return alphaBeta(position, -CELLS, CELLS);
}

/**
 * Negamax with alpha-beta pruning.
 * `alpha` is the score the player to move is already sure of from another
 * move; `beta` is the most the opponent will let them reach. A score inside
 * the window is exact; outside it, the result only tells which side it is on.
 */
function alphaBeta(position: BigIntPosition, alpha: number, beta: number): number {
  if (position.moves === CELLS) {
    return 0;
  }
  if (canWinNow(position)) {
    return immediateWinScore(position.moves);
  }

  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column)) {
      const next = position.clone();
      next.play(column);
      // The point of view flips, so the window flips with it.
      // (0 - x, not -x, for the same reason as in negamax.)
      const score = 0 - alphaBeta(next, 0 - beta, 0 - alpha);
      if (score >= beta) {
        return score; // the opponent will never allow this position
      }
      if (score > alpha) {
        alpha = score; // a new best guarantee
      }
    }
  }
  return alpha;
}