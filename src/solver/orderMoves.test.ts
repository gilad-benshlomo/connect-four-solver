import { describe, expect, it } from 'vitest';
import { COLUMNS } from '../game/board';
import { COLUMN_ORDER, orderMoves } from './negamax';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

/** Every column allowed, as a set of bits. */
const ALL_COLUMNS = (1 << COLUMNS) - 1;

/** A set of columns, as `orderMoves` takes it, from a list. */
function columnSet(columns: number[]): number {
  return columns.reduce((set, column) => set | (1 << column), 0);
}

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

describe('orderMoves', () => {
  it('keeps the centre order when no move makes a threat', () => {
    expect(orderMoves(play([]), ALL_COLUMNS)).toEqual(COLUMN_ORDER);
  });

  it('returns only the allowed columns', () => {
    expect(orderMoves(play([]), columnSet([0, 3, 6]))).toEqual([3, 0, 6]);
  });

  it('returns nothing when no column is allowed', () => {
    expect(orderMoves(play([]), 0)).toEqual([]);
  });

  it('tries the moves that make more threats first', () => {
    // X holds columns 1-2 on the bottom row. Column 3 makes two threats,
    // columns 4 and 0 one each (in centre order), the rest none.
    expect(orderMoves(play([1, 1, 2, 2]), ALL_COLUMNS)).toEqual([3, 4, 0, 2, 1, 5, 6]);
  });

  it('sorts by threats, then by centre order, over many random games', () => {
    const random = seededRandom(10);
    let checked = 0;
    let reordered = 0; // positions where the threats changed the centre order

    for (let game = 0; game < 500; game++) {
      const position = new PairPosition();
      while (true) {
        const playable: number[] = [];
        let canWin = false;
        for (let column = 0; column < COLUMNS; column++) {
          if (position.canPlay(column)) {
            playable.push(column);
            if (position.isWinningMove(column)) canWin = true;
          }
        }
        if (playable.length === 0 || canWin) break; // full, or about to be won

        // Allow a random part of the playable columns.
        const allowed = columnSet(playable.filter(() => random() < 0.7));
        const order = orderMoves(position, allowed);

        // The same columns, each once.
        expect(columnSet(order)).toBe(allowed);
        expect(order).toHaveLength(new Set(order).size);
        // Each move makes at least as many threats as the next one, and when
        // they make as many, it comes first in the centre order.
        for (let i = 0; i + 1 < order.length; i++) {
          const here = position.threatsAfter(order[i]);
          const next = position.threatsAfter(order[i + 1]);
          expect(here).toBeGreaterThanOrEqual(next);
          if (here === next) {
            const first = COLUMN_ORDER.indexOf(order[i]);
            expect(first).toBeLessThan(COLUMN_ORDER.indexOf(order[i + 1]));
          }
        }
        checked++;
        if (order.join() !== COLUMN_ORDER.filter((c) => (allowed & (1 << c)) !== 0).join()) {
          reordered++;
        }

        position.play(playable[Math.floor(random() * playable.length)]);
      }
    }

    // Make sure the test really met many positions, and many reorderings.
    expect(checked).toBeGreaterThan(5000);
    expect(reordered).toBeGreaterThan(1000);
  });
});