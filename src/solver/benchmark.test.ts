import { describe, expect, it } from 'vitest';
import { BigIntPosition } from './bigintPosition';
import { negamax, solve } from './negamax';
import { PairPosition } from './pairPosition';
import type { Position } from './position';
import { TranspositionTable } from './transpositionTable';

// Benchmark positions and scores published by Pascal Pons with his tutorial
// "Solving Connect 4: how to build a perfect AI" (blog.gamesolver.org).
// The files are kept out of the repository (docs/JOURNEY.md, D18).
// import.meta.glob returns an empty object when no file matches, so the
// file-based test is skipped instead of failing on a fresh clone or in CI.
// (The pattern needs a wildcard: Vite rejects a plain file name here.)
const files = import.meta.glob<string>('../../benchmarks/Test_*', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const endEasy = files['../../benchmarks/Test_L3_R1'];
const middleEasy = files['../../benchmarks/Test_L2_R1'];

/** One benchmark line: the original text, the moves, and the published score. */
type BenchmarkCase = { line: string; moves: number[]; score: number };

/**
 * Turns the published notation into our columns: "4453" means columns
 * 4, 4, 5, 3 counted from 1, which are 3, 3, 4, 2 counted from 0.
 */
function fromNotation(sequence: string): number[] {
  return [...sequence].map((digit) => Number(digit) - 1);
}

/** Parses a benchmark file: one "moves score" pair per line. */
function parseBenchmark(text: string): BenchmarkCase[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const [sequence, score] = line.split(' ');
      return { line, moves: fromNotation(sequence), score: Number(score) };
    });
}

/** Plays the given columns in order, on a new BigIntPosition unless another board is given. */
function play(columns: number[], position: Position = new BigIntPosition()): Position {
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

describe('published scores', () => {
  it('matches the losing example from the tutorial', () => {
    // Whatever the player to move plays, the opponent wins with their 7th disc.
    const position = play(fromNotation('44455554221'));
    expect(negamax(position)).toBe(-15);
    expect(solve(position)).toBe(-15);
  });

  const boards = [
    { name: 'BigIntPosition', create: () => new BigIntPosition() },
    { name: 'PairPosition', create: () => new PairPosition() },
  ];
  for (const { name, create } of boards) {
    it.skipIf(endEasy === undefined)(
      `solve on ${name} matches all 1000 End-Easy positions (Test_L3_R1)`,
      () => {
        const cases = parseBenchmark(endEasy ?? '');
        expect(cases).toHaveLength(1000);
        for (const { line, moves, score } of cases) {
          // The line is shown in the report if this position fails.
          expect(solve(play(moves, create())), line).toBe(score);
        }
      },
      60_000, // generous: the whole file takes well under a second with pruning
    );
  }

  it.skipIf(endEasy === undefined)(
    'solve with one table reused for all 1000 End-Easy positions matches them all',
    () => {
      // A small valid size (a prime just above 2^17); one table for every
      // position, as in a real game, so old entries are always around.
      const table = new TranspositionTable(131_101);
      for (const { line, moves, score } of parseBenchmark(endEasy ?? '')) {
        expect(solve(play(moves, new PairPosition()), table), line).toBe(score);
      }
    },
    60_000,
  );

  it.skipIf(middleEasy === undefined)(
    'solve with one table reused for all 1000 Middle-Easy positions matches them all',
    () => {
      const table = new TranspositionTable(131_101);
      const cases = parseBenchmark(middleEasy ?? '');
      expect(cases).toHaveLength(1000);
      for (const { line, moves, score } of cases) {
        expect(solve(play(moves, new PairPosition()), table), line).toBe(score);
      }
    },
    60_000,
  );
});