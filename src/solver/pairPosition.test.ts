import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { PairPosition } from './pairPosition';

// PairPosition also runs every test in bigintPosition.test.ts. This file
// checks that the two boards agree on everything, position by position.

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

describe('PairPosition against BigIntPosition', () => {
  it('agrees on moves, legal moves, winning moves and keys over many random games', () => {
    const random = seededRandom(5);
    let positionsChecked = 0;
    let winsFound = 0;

    for (let game = 0; game < 500; game++) {
      const reference = new BigIntPosition();
      const pair = new PairPosition();

      while (true) {
        expect(pair.moves).toBe(reference.moves);
        expect(pair.key()).toBe(reference.key());
        const choices: number[] = [];
        for (let column = 0; column < COLUMNS; column++) {
          expect(pair.canPlay(column)).toBe(reference.canPlay(column));
          if (reference.canPlay(column)) {
            choices.push(column);
            const wins = reference.isWinningMove(column);
            expect(pair.isWinningMove(column)).toBe(wins);
            if (wins) winsFound++;
          }
        }
        positionsChecked++;

        if (choices.length === 0) break; // the board is full
        const column = choices[Math.floor(random() * choices.length)];
        const won = reference.isWinningMove(column);
        reference.play(column);
        pair.play(column);
        if (won) break; // the game is over
      }
    }

    // Make sure the test really covered a lot of positions and wins.
    expect(positionsChecked).toBeGreaterThan(5000);
    expect(winsFound).toBeGreaterThan(1000);
  });

  it('agrees on keys for full boards', () => {
    // The largest keys: every column full, so the halves are at their biggest.
    const random = seededRandom(6);
    for (let game = 0; game < 100; game++) {
      const reference = new BigIntPosition();
      const pair = new PairPosition();
      while (reference.moves < COLUMNS * ROWS) {
        const choices: number[] = [];
        for (let column = 0; column < COLUMNS; column++) {
          if (reference.canPlay(column)) choices.push(column);
        }
        const column = choices[Math.floor(random() * choices.length)];
        reference.play(column);
        pair.play(column);
      }
      expect(pair.key()).toBe(reference.key());
    }
  });
});