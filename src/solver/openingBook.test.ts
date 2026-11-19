import { describe, expect, it } from 'vitest';
import { COLUMNS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { mirrorKey } from './openingBook';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

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

/** Builds a position on the fast board by playing the given columns in order. */
function play(columns: number[]): Position {
  const position = new PairPosition();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

/** The same moves, each in the mirrored column. */
function mirrored(columns: number[]): number[] {
  return columns.map((column) => COLUMNS - 1 - column);
}

describe('mirrorKey', () => {
  it('leaves the empty board as it is', () => {
    const key = play([]).key();
    expect(mirrorKey(key)).toBe(key);
  });

  it('leaves a position that is its own mirror image as it is', () => {
    // X in columns 2 and 4, O between them; then a column of discs in the centre.
    for (const moves of [[2, 3, 4], [3, 3, 3]]) {
      const key = play(moves).key();
      expect(mirrorKey(key)).toBe(key);
    }
  });

  it('gives the key of the game played in the mirrored columns', () => {
    expect(mirrorKey(play([0]).key())).toBe(play([6]).key());
    expect(mirrorKey(play([0, 1, 5]).key())).toBe(play([6, 5, 1]).key());
  });

  it('agrees with the mirrored game over many random games, on both boards', () => {
    const random = seededRandom(11);
    let checked = 0;
    let different = 0; // positions that are not their own mirror image

    for (let game = 0; game < 200; game++) {
      const moves: number[] = [];
      const position = new BigIntPosition();
      while (true) {
        const playable: number[] = [];
        for (let column = 0; column < COLUMNS; column++) {
          if (position.canPlay(column)) playable.push(column);
        }
        if (playable.length === 0) break; // full: only the discs' places matter here, not wins
        const column = playable[Math.floor(random() * playable.length)];
        position.play(column);
        moves.push(column);

        // The key comes from the reference board, the mirrored one from the fast board.
        const key = position.key();
        const expected = play(mirrored(moves)).key();
        expect(mirrorKey(key), moves.join('')).toBe(expected);
        expect(mirrorKey(expected)).toBe(key); // mirroring twice changes nothing
        checked++;
        if (expected !== key) different++;
      }
    }

    // Make sure the test really met many positions, nearly all of them not symmetric.
    expect(checked).toBeGreaterThan(8000);
    expect(different).toBeGreaterThan(8000);
  });
});