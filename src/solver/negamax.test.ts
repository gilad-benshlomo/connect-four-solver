import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { negamax, solve } from './negamax';

/** Builds a position by playing the given columns in order. */
function play(columns: number[]): BigIntPosition {
  const position = new BigIntPosition();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

/**
 * Returns a simple seeded random number generator (values in [0, 1)),
 * so that random tests use the same positions every time.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

/** Returns the columns that still have room. */
function playableColumns(position: BigIntPosition): number[] {
  const columns: number[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column)) {
      columns.push(column);
    }
  }
  return columns;
}

/**
 * Returns random positions with `movesLeft` empty cells. Games that end
 * early are thrown away, and so are positions where the player to move can
 * win right away, so that every position makes the search do real work.
 */
function randomLatePositions(count: number, movesLeft: number, seed: number): BigIntPosition[] {
  const random = seededRandom(seed);
  const positions: BigIntPosition[] = [];
  while (positions.length < count) {
    const position = new BigIntPosition();
    let ended = false;
    while (!ended && position.moves < COLUMNS * ROWS - movesLeft) {
      const choices = playableColumns(position);
      const column = choices[Math.floor(random() * choices.length)];
      if (position.isWinningMove(column)) {
        ended = true; // this game would end here: try another one
      } else {
        position.play(column);
      }
    }
    const canWinNow = playableColumns(position).some((column) => position.isWinningMove(column));
    if (!ended && !canWinNow) {
      positions.push(position);
    }
  }
  return positions;
}

/** Positions built by hand, with the score worked out by hand. */
const HAND_BUILT = [
  {
    // X has three in column 0 and wins with its 4th disc: 22 - 4.
    name: 'scores a win with the fourth disc as 18',
    moves: [0, 1, 0, 1, 0, 1],
    score: 18,
  },
  {
    // X has columns 1-3 on the bottom row, with both ends open. O can block
    // only one end, and X wins with its 4th disc: -(22 - 4).
    name: 'scores a position that cannot be saved as a loss',
    moves: [1, 1, 2, 2, 3],
    score: -18,
  },
  {
    // 41 moves played; O's 21st disc, the last cell on the board, wins: 22 - 21.
    name: 'scores a win with the last disc of the game as 1',
    moves: [
      5, 3, 2, 2, 4, 2, 1, 0, 4, 6, 0, 2, 1, 0, 6, 5, 4, 1, 1, 1, 0,
      5, 5, 5, 5, 1, 2, 3, 3, 6, 6, 3, 3, 3, 0, 4, 0, 6, 6, 2, 4,
    ],
    score: 1,
  },
  {
    // Six moves left; with perfect play the board fills up with no winner.
    name: 'scores a draw as 0',
    moves: [
      0, 1, 4, 5, 6, 6, 6, 6, 0, 3, 3, 4, 5, 1, 1, 4, 5, 1,
      6, 6, 4, 4, 2, 2, 3, 0, 4, 5, 2, 2, 1, 3, 2, 3, 3, 5,
    ],
    score: 0,
  },
  {
    // The same game one move later: five moves are left. Every level of the
    // search flips the sign, and in JavaScript -0 is a separate value from 0.
    name: 'scores a draw as exactly 0 when an odd number of moves is left',
    moves: [
      0, 1, 4, 5, 6, 6, 6, 6, 0, 3, 3, 4, 5, 1, 1, 4, 5, 1,
      6, 6, 4, 4, 2, 2, 3, 0, 4, 5, 2, 2, 1, 3, 2, 3, 3, 5, 0,
    ],
    score: 0,
  },
];

describe('negamax', () => {
  for (const { name, moves, score } of HAND_BUILT) {
    it(name, () => {
      expect(negamax(play(moves))).toBe(score);
    });
  }
});

describe('solve', () => {
  for (const { name, moves, score } of HAND_BUILT) {
    it(name, () => {
      expect(solve(play(moves))).toBe(score);
    });
  }

  it('gives exactly the same scores as plain negamax near the end of the game', () => {
    const scores = new Set<number>();
    for (const position of randomLatePositions(200, 12, 3)) {
      const expected = negamax(position);
      expect(solve(position)).toBe(expected);
      scores.add(expected);
    }
    // Make sure the positions were varied: wins, losses and draws of many sizes.
    expect(scores.size).toBeGreaterThan(5);
  });
});