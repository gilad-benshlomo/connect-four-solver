import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

/** Every test below runs once for each board in this list. */
const IMPLEMENTATIONS: { name: string; create: () => Position }[] = [
  { name: 'BigIntPosition', create: () => new BigIntPosition() },
  { name: 'PairPosition', create: () => new PairPosition() },
];

/** The four kinds of line, as steps in columns and rows. */
const LINE_STEPS = [
  [0, 1], // vertical
  [1, 0], // horizontal
  [1, 1], // diagonal going up
  [1, -1], // diagonal going down
];

/**
 * The rule in plain words, on a simple grid and without any bits: replay the
 * moves, then count the empty cells where the player who made the last move
 * would complete four in a row with one more disc. Slow, but easy to trust.
 */
function threatsByRule(columns: number[]): number {
  // grid[column][row] is the number of the player who owns the cell (0 or 1).
  const grid: number[][] = Array.from({ length: COLUMNS }, () => []);
  columns.forEach((column, move) => grid[column].push(move % 2));
  const player = (columns.length - 1) % 2;
  const owns = (column: number, row: number) =>
    column >= 0 && column < COLUMNS && grid[column][row] === player;

  let threats = 0;
  for (let column = 0; column < COLUMNS; column++) {
    for (let row = grid[column].length; row < ROWS; row++) {
      const completes = LINE_STEPS.some(([dc, dr]) => {
        // Count the player's discs next to the cell, both ways along the line.
        let count = 0;
        for (let i = 1; owns(column + i * dc, row + i * dr); i++) count++;
        for (let i = 1; owns(column - i * dc, row - i * dr); i++) count++;
        return count >= 3;
      });
      if (completes) threats++;
    }
  }
  return threats;
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
function play(create: () => Position, columns: number[]): Position {
  const position = create();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

for (const { name, create } of IMPLEMENTATIONS) {
  describe(`${name}.threatsAfter`, () => {
    it('finds no threats after the first disc', () => {
      expect(create().threatsAfter(3)).toBe(0);
    });

    it('counts the one open end of three in a row', () => {
      // X holds columns 0-1 on the bottom row; O sits on top of them.
      // X in column 2 makes three, open only on the right.
      expect(play(create, [0, 0, 1, 1]).threatsAfter(2)).toBe(1);
    });

    it('counts both open ends of three in a row', () => {
      // X holds columns 1-2 on the bottom row; X in column 3 makes three,
      // open on both sides.
      expect(play(create, [1, 1, 2, 2]).threatsAfter(3)).toBe(2);
    });

    it('counts a threat that cannot be played yet', () => {
      // X holds columns 0-1 on the second row; X in column 2 makes three
      // there. The cell that completes them is above an empty cell.
      expect(play(create, [0, 1, 0, 0, 1, 2]).threatsAfter(2)).toBe(1);
    });

    it('does not change the position', () => {
      const position = play(create, [1, 1, 2, 2]);
      const key = position.key();
      position.threatsAfter(3);
      expect(position.moves).toBe(4);
      expect(position.key()).toBe(key);
    });

    it('agrees with the rule over many random games', () => {
      const random = seededRandom(9);
      let checked = 0;
      let several = 0; // moves that make two threats or more

      for (let game = 0; game < 500; game++) {
        const position = create();
        const history: number[] = [];
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

          for (const column of choices) {
            const expected = threatsByRule([...history, column]);
            // The moves are shown in the report if this check fails.
            const label = `${history.join('')} + ${column}`;
            expect(position.threatsAfter(column), label).toBe(expected);
            checked++;
            if (expected >= 2) several++;
          }

          const column = choices[Math.floor(random() * choices.length)];
          position.play(column);
          history.push(column);
        }
      }

      // Make sure the test really met many positions, and many double threats.
      expect(checked).toBeGreaterThan(40000);
      expect(several).toBeGreaterThan(1000);
    });
  });
}