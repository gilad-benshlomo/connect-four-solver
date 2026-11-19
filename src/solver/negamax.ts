import { COLUMNS, ROWS } from '../game/board';
import type { Position } from './position';
import type { TranspositionTable } from './transpositionTable';

/** Number of cells on the board: the most moves a game can last. */
const CELLS = COLUMNS * ROWS;

/**
 * The order in which alpha-beta tries the columns: from the centre outwards
 * (3, 2, 4, 1, 5, 0, 6). Central columns take part in more lines, so good
 * moves tend to come first, and then more of the other moves can be skipped.
 */
export const COLUMN_ORDER = Array.from({ length: COLUMNS }, (_, i) => {
  const centre = Math.floor(COLUMNS / 2);
  return i % 2 === 1 ? centre - (i + 1) / 2 : centre + i / 2;
});

/** What a search found, and how much work it took. */
export type SearchResult = {
  /** The exact score, on the same scale as `negamax` and `solve`. */
  score: number;
  /** How many positions the search visited, counting the one it started from. */
  explored: number;
};

/**
 * State shared by every level of one search. A new one is made for each
 * search; only the table, which belongs to the caller, can carry over.
 */
type SearchContext = {
  explored: number;
  table: TranspositionTable | undefined;
};

/** Returns the score for winning with the next disc, from the number of moves played. */
function immediateWinScore(moves: number): number {
  // Same as 22 minus the winner's disc number, worked out from the moves.
  return Math.floor((CELLS + 1 - moves) / 2);
}

/**
 * Turns a score into a value the table can store: scores run from -CELLS to
 * CELLS at the very most, and the table needs values from 1 up (0 is empty).
 */
function toStored(score: number): number {
  return score + CELLS + 1;
}

/** Turns a value read from the table back into a score (see `toStored`). */
function fromStored(value: number): number {
  return value - CELLS - 1;
}

/** Returns true if the player to move can win with their next disc. */
function canWinNow(position: Position): boolean {
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
export function negamax(position: Position): number {
  return analyzeNegamax(position).score;
}

/**
 * Same search as `negamax`, but also reports how many positions it visited.
 * Used by tests and measurements.
 */
export function analyzeNegamax(position: Position): SearchResult {
  const context: SearchContext = { explored: 0, table: undefined };
  const score = plainSearch(position, context);
  return { score, explored: context.explored };
}

/** The recursive part of `negamax`. */
function plainSearch(position: Position, context: SearchContext): number {
  context.explored++;
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
      best = Math.max(best, 0 - plainSearch(next, context));
    }
  }
  return best;
}

/**
 * Returns the same exact score as `negamax`, but skips the moves that cannot
 * change the result (alpha-beta pruning), so it is much faster.
 * With a table, it also reuses what it worked out about positions it has seen
 * before, in this search or in earlier ones that used the same table.
 * Must not be called on a position that is already won.
 */
export function solve(position: Position, table?: TranspositionTable): number {
  return analyze(position, table).score;
}

/**
 * Same search as `solve`, but also reports how many positions it visited.
 * Used by tests and measurements.
 */
export function analyze(position: Position, table?: TranspositionTable): SearchResult {
  const context: SearchContext = { explored: 0, table };
  // A window wider than any real score, so the result is always exact.
  const score = alphaBeta(position, -CELLS, CELLS, context);
  return { score, explored: context.explored };
}

/**
 * Negamax with alpha-beta pruning.
 * `alpha` is the score the player to move is already sure of from another
 * move; `beta` is the most the opponent will let them reach. A score inside
 * the window is exact; outside it, the result only tells which side it is on.
 */
function alphaBeta(
  position: Position,
  alpha: number,
  beta: number,
  context: SearchContext,
): number {
  context.explored++;
  if (position.moves === CELLS) {
    return 0;
  }
  if (canWinNow(position)) {
    return immediateWinScore(position.moves);
  }

  // There is no win with the next disc, so the best possible result is a win
  // with the disc after it. Asking for more than that is pointless: lower beta.
  let bestPossible = immediateWinScore(position.moves + 2);
  const table = context.table;
  const key = table === undefined ? 0 : position.key();
  if (table !== undefined) {
    const stored = table.get(key);
    if (stored !== 0) {
      // An earlier visit found that this position scores at most this much.
      bestPossible = Math.min(bestPossible, fromStored(stored));
    }
  }
  if (beta > bestPossible) {
    beta = bestPossible;
    if (alpha >= beta) {
      return beta; // the window is empty: nothing here can beat alpha
    }
  }

  for (const column of COLUMN_ORDER) {
    if (position.canPlay(column)) {
      const next = position.clone();
      next.play(column);
      // The point of view flips, so the window flips with it.
      // (0 - x, not -x, for the same reason as in negamax.)
      const score = 0 - alphaBeta(next, 0 - beta, 0 - alpha, context);
      if (score >= beta) {
        return score; // the opponent will never allow this position
      }
      if (score > alpha) {
        alpha = score; // a new best guarantee
      }
    }
  }
  // No move reached beta, so this position scores at most alpha: remember it.
  table?.put(key, toStored(alpha));
  return alpha;
}