import { describe, expect, it } from 'vitest';
import { COLUMNS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

/** The type of the boards under test. */
type TestPosition = Position;

/** Every test below runs once for each board in this list. */
const IMPLEMENTATIONS: { name: string; create: () => TestPosition }[] = [
  { name: 'BigIntPosition', create: () => new BigIntPosition() },
  { name: 'PairPosition', create: () => new PairPosition() },
];

/** A set of columns, as `nonLosingColumns` returns it, from a list. */
function columnSet(columns: number[]): number {
  return columns.reduce((set, column) => set | (1 << column), 0);
}

/**
 * The rule in plain words, built only from operations tested elsewhere: a
 * column is safe if, after playing it, the opponent has no winning move.
 * Slow, but easy to trust; the boards must give exactly the same answer.
 */
function nonLosingColumnsByRule(position: TestPosition): number {
  let safe = 0;
  for (let column = 0; column < COLUMNS; column++) {
    if (!position.canPlay(column)) continue;
    const next = position.clone();
    next.play(column);
    let opponentWins = false;
    for (let reply = 0; reply < COLUMNS; reply++) {
      if (next.canPlay(reply) && next.isWinningMove(reply)) opponentWins = true;
    }
    if (!opponentWins) safe |= 1 << column;
  }
  return safe;
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
function play(create: () => TestPosition, columns: number[]): TestPosition {
  const position = create();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

for (const { name, create } of IMPLEMENTATIONS) {
  describe(`${name}.nonLosingColumns`, () => {
    it('allows every column when the opponent has no threats', () => {
      expect(create().nonLosingColumns()).toBe(columnSet([0, 1, 2, 3, 4, 5, 6]));
    });

    it('allows only the block when the opponent has one threat', () => {
      // X has three in column 0; O must play on top of them.
      expect(play(create, [0, 1, 0, 1, 0]).nonLosingColumns()).toBe(columnSet([0]));
    });

    it('allows nothing when the opponent has two threats', () => {
      // X has columns 1-3 on the bottom row, open at both ends.
      expect(play(create, [1, 1, 2, 2, 3]).nonLosingColumns()).toBe(0);
    });

    it('never plays just below a cell where the opponent wins', () => {
      // X holds columns 0-2 on the second row; column 3 is empty, so a disc
      // there would let X complete the row on top of it.
      const position = play(create, [0, 1, 0, 0, 1, 2, 2]);
      expect(position.nonLosingColumns()).toBe(columnSet([0, 1, 2, 4, 5, 6]));
    });

    it('agrees with the rule over many random games', () => {
      const random = seededRandom(8);
      let checked = 0;
      let restricted = 0; // positions where some playable column is not safe
      let lost = 0; // positions where no column is safe

      for (let game = 0; game < 500; game++) {
        const position = create();
        while (true) {
          const choices: number[] = [];
          let canWin = false;
          for (let column = 0; column < COLUMNS; column++) {
            if (position.canPlay(column)) {
              choices.push(column);
              if (position.isWinningMove(column)) canWin = true;
            }
          }
          if (choices.length === 0 || canWin) break; // full, or about to be won

          const expected = nonLosingColumnsByRule(position);
          expect(position.nonLosingColumns()).toBe(expected);
          checked++;
          if (expected !== columnSet(choices)) restricted++;
          if (expected === 0) lost++;

          position.play(choices[Math.floor(random() * choices.length)]);
        }
      }

      // Make sure the test really met every case many times.
      expect(checked).toBeGreaterThan(5000);
      expect(restricted).toBeGreaterThan(500);
      expect(lost).toBeGreaterThan(20);
    });
  });
}