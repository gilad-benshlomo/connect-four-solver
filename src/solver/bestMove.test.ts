import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { bestMove, COLUMN_ORDER, negamax } from './negamax';
import { PairPosition } from './pairPosition';
import type { Position } from './position';
import { TranspositionTable } from './transpositionTable';

/**
 * Returns a simple seeded random number generator (values in [0, 1)),
 * so that random tests run the same games every time.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

/** Builds a position by playing the given columns in order. */
function play(columns: number[]): Position {
  const position = new PairPosition();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

/**
 * The score of each playable column for the player to move, worked out with
 * plain negamax: slow, but checked against the published positions.
 */
function scoresByNegamax(position: Position): Map<number, number> {
  const scores = new Map<number, number>();
  for (let column = 0; column < COLUMNS; column++) {
    if (!position.canPlay(column)) continue;
    if (position.isWinningMove(column)) {
      // 22 minus the winner's disc number, as in negamax.
      scores.set(column, Math.floor((COLUMNS * ROWS + 1 - position.moves) / 2));
    } else {
      const next = position.clone();
      next.play(column);
      scores.set(column, 0 - negamax(next));
    }
  }
  return scores;
}

describe('bestMove', () => {
  it('wins right away when it can, even away from the centre', () => {
    // X has three in column 0 (and O three in column 1); X to move.
    expect(bestMove(play([0, 1, 0, 1, 0, 1]))).toBe(0);
  });

  it('picks the best score, and the most central among equals, near the end of the game', () => {
    const random = seededRandom(12);
    const table = new TranspositionTable(131_101);
    let checked = 0;
    let notCentral = 0; // positions where the best move is not the most central playable one

    while (checked < 150) {
      // A random game up to 12 moves before the end; skip games that end sooner.
      const position = new PairPosition();
      let ended = false;
      while (!ended && position.moves < COLUMNS * ROWS - 12) {
        const playable = COLUMN_ORDER.filter((column) => position.canPlay(column));
        const column = playable[Math.floor(random() * playable.length)];
        if (position.isWinningMove(column)) ended = true;
        else position.play(column);
      }
      if (ended) continue;

      const scores = scoresByNegamax(position);
      const top = Math.max(...scores.values());
      const expected = COLUMN_ORDER.find((column) => scores.get(column) === top);
      expect(bestMove(position, table)).toBe(expected);
      checked++;
      if (expected !== COLUMN_ORDER.find((column) => position.canPlay(column))) notCentral++;
    }

    // Make sure the best move was often not simply the most central one.
    expect(notCentral).toBeGreaterThan(50);
  });
});