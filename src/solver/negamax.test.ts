import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import {
  COLUMN_ORDER,
  analyze,
  analyzeFullWindow,
  analyzeNegamax,
  negamax,
  solve,
  solveFullWindow,
} from './negamax';
import { PairPosition } from './pairPosition';
import type { Position } from './position';
import { TranspositionTable } from './transpositionTable';

/** A small valid table size (a prime just above 2^17), so the tests stay fast. */
const TABLE_SIZE = 131_101;

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
function playableColumns(position: Position): number[] {
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
 * The same seed gives the same positions on any board (see `create`).
 */
function randomLatePositions(
  count: number,
  movesLeft: number,
  seed: number,
  create: () => Position = () => new BigIntPosition(),
): Position[] {
  const random = seededRandom(seed);
  const positions: Position[] = [];
  while (positions.length < count) {
    const position = create();
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
      expect(solveFullWindow(play(moves))).toBe(score);
    });
  }

  it('gives exactly the same scores as plain negamax near the end of the game', () => {
    const scores = new Set<number>();
    for (const position of randomLatePositions(200, 12, 3)) {
      const expected = negamax(position);
      expect(solve(position)).toBe(expected);
      expect(solveFullWindow(position)).toBe(expected);
      scores.add(expected);
    }
    // Make sure the positions were varied: wins, losses and draws of many sizes.
    expect(scores.size).toBeGreaterThan(5);
  });
});

describe('explored positions', () => {
  it('counts one position when the player to move wins right away', () => {
    // The search looks at the starting position, finds the win and stops.
    const position = play([0, 1, 0, 1, 0, 1]);
    expect(analyzeNegamax(position)).toEqual({ score: 18, explored: 1 });
    expect(analyzeFullWindow(position)).toEqual({ score: 18, explored: 1 });
    expect(analyze(position)).toEqual({ score: 18, explored: 1 });
  });

  it('counts the last empty cell and the full board after it', () => {
    // 41 moves played and the last disc does not win: the search visits this
    // position, then the full board after the only move left.
    const position = play([
      0, 1, 4, 5, 6, 6, 6, 6, 0, 3, 3, 4, 5, 1, 1, 4, 5, 1, 6, 6, 4,
      4, 2, 2, 3, 0, 4, 5, 2, 2, 1, 3, 2, 3, 3, 5, 0, 0, 0, 1, 2,
    ]);
    expect(analyzeNegamax(position)).toEqual({ score: 0, explored: 2 });
    expect(analyzeFullWindow(position)).toEqual({ score: 0, explored: 2 });
    // The narrow-window search knows from the start that the score is 0 or 1.
    // It asks one question, "is it above 0?", and the ceiling answers it at
    // the first position, before any move: a win needs at least two more discs.
    expect(analyze(position)).toEqual({ score: 0, explored: 1 });
  });

  it('starts from zero on every search', () => {
    const position = play(HAND_BUILT[3].moves);
    const first = analyze(position);
    expect(first.explored).toBeGreaterThan(2);
    expect(analyze(position)).toEqual(first);
    expect(analyzeNegamax(position)).toEqual(analyzeNegamax(position));
  });

  it('prunes: the same scores as plain negamax, never more positions', () => {
    // One search over a full window only skips positions, so it can never
    // visit more than plain negamax. (The narrow-window search asks several
    // questions, so in small positions it can visit more in total.)
    let plainTotal = 0;
    let prunedTotal = 0;
    for (const position of randomLatePositions(100, 8, 4)) {
      const plain = analyzeNegamax(position);
      const pruned = analyzeFullWindow(position);
      expect(pruned.score).toBe(plain.score);
      expect(pruned.explored).toBeLessThanOrEqual(plain.explored);
      plainTotal += plain.explored;
      prunedTotal += pruned.explored;
    }
    // Over many positions, pruning must actually save work.
    expect(prunedTotal).toBeLessThan(plainTotal);
  });
});

describe('both boards', () => {
  it('give the same scores and the same explored counts', () => {
    const references = randomLatePositions(100, 8, 7);
    const pairs = randomLatePositions(100, 8, 7, () => new PairPosition());
    for (let i = 0; i < references.length; i++) {
      // The same seed plays the same games on both boards.
      expect(pairs[i].key()).toBe(references[i].key());
      expect(analyze(pairs[i])).toEqual(analyze(references[i]));
      expect(analyzeNegamax(pairs[i])).toEqual(analyzeNegamax(references[i]));
    }
  });
});

describe('move order', () => {
  it('tries the columns from the centre outwards', () => {
    expect(COLUMN_ORDER).toEqual([3, 2, 4, 1, 5, 0, 6]);
  });
});

describe('with a transposition table', () => {
  it('gives the same scores as without one, whether fresh or reused', () => {
    const fresh = new TranspositionTable(TABLE_SIZE);
    const reused = new TranspositionTable(TABLE_SIZE);
    for (const position of randomLatePositions(300, 14, 11)) {
      const expected = solve(position);
      fresh.clear();
      expect(solve(position, fresh)).toBe(expected);
      // A table full of entries from other positions must never change a score.
      expect(solve(position, reused)).toBe(expected);
    }
  });

  it('explores fewer positions than without one', () => {
    const table = new TranspositionTable(TABLE_SIZE);
    let without = 0;
    let withTable = 0;
    for (const position of randomLatePositions(100, 14, 12)) {
      table.clear();
      without += analyze(position).explored;
      withTable += analyze(position, table).explored;
    }
    expect(withTable).toBeLessThan(without);
  });
});