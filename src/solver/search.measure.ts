import { describe, expect, it } from 'vitest';
import { BigIntPosition } from './bigintPosition';
import { analyze, type SearchResult } from './negamax';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

// Speed of the search on the benchmark positions published by Pascal Pons
// (blog.gamesolver.org), kept out of the repository (docs/JOURNEY.md, D18).
// Run with `npm run measure`; skipped when the files are missing.
const files = import.meta.glob<string>('../../benchmarks/Test_*', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const endEasy = files['../../benchmarks/Test_L3_R1'];
const middleEasy = files['../../benchmarks/Test_L2_R1'];

/**
 * How many Middle-Easy positions to measure, from the start of the file. Some
 * of them still take seconds with the current search, so not all 1000 yet.
 */
const MIDDLE_EASY_COUNT = 100;

/** How many timed runs to take the median of, after one warm-up run. */
const RUNS = 3;

/** One benchmark position, ready to search, with its published score. */
type BenchmarkPosition = { line: string; position: Position; score: number };

/** The figures for one search on one set of positions (the median run). */
type Measurement = {
  positions: number;
  meanMs: number;
  slowestMs: number;
  meanExplored: number;
  positionsPerSecond: number;
};

/** Parses a benchmark file ("moves score" per line, columns from 1) into positions on the given board. */
function parseBenchmark(text: string, create: () => Position): BenchmarkPosition[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const [sequence, score] = line.split(' ');
      const position = create();
      for (const digit of sequence) {
        position.play(Number(digit) - 1);
      }
      return { line, position, score: Number(score) };
    });
}

/**
 * Times `search` on every position: by default one warm-up run that is thrown
 * away (so the JavaScript engine has optimised the code), then `timedRuns`
 * timed runs. Returns the figures of the run with the median total time.
 * Also checks every score, so a broken search can never produce a measurement.
 */
function measure(
  cases: BenchmarkPosition[],
  search: (position: Position) => SearchResult,
  timedRuns = RUNS,
  warmUp = true,
): Measurement {
  const runs: { totalMs: number; slowestMs: number; explored: number }[] = [];
  for (let run = warmUp ? 0 : 1; run <= timedRuns; run++) {
    let totalMs = 0;
    let slowestMs = 0;
    let explored = 0;
    for (const { line, position, score } of cases) {
      const start = performance.now();
      const result = search(position);
      const ms = performance.now() - start;
      expect(result.score, line).toBe(score);
      totalMs += ms;
      slowestMs = Math.max(slowestMs, ms);
      explored += result.explored;
    }
    if (run > 0) {
      runs.push({ totalMs, slowestMs, explored }); // run 0 was the warm-up
    }
  }
  runs.sort((a, b) => a.totalMs - b.totalMs);
  const median = runs[Math.floor(runs.length / 2)];
  return {
    positions: cases.length,
    meanMs: median.totalMs / cases.length,
    slowestMs: median.slowestMs,
    meanExplored: median.explored / cases.length,
    positionsPerSecond: median.explored / (median.totalMs / 1000),
  };
}

/** Formats one measurement as a row for the table in docs/JOURNEY.md. */
function tableRow(set: string, board: string, search: string, m: Measurement): string {
  const cells = [
    set,
    board,
    search,
    String(m.positions),
    `${m.meanMs.toFixed(3)} ms`,
    `${m.slowestMs.toFixed(1)} ms`,
    Math.round(m.meanExplored).toLocaleString('en-US'),
    Math.round(m.positionsPerSecond).toLocaleString('en-US'),
  ];
  return `| ${cells.join(' | ')} |`;
}

/** The boards to measure; the explored counts must be the same for both. */
const BOARDS = [
  { name: 'BigIntPosition', create: () => new BigIntPosition() },
  { name: 'PairPosition', create: () => new PairPosition() },
];

// Plain negamax was measured once on End-Easy (docs/JOURNEY.md); it does not
// change with the speed-ups, so only the alpha-beta search is measured here.

describe.skipIf(endEasy === undefined)('search speed on End-Easy (Test_L3_R1)', () => {
  for (const { name, create } of BOARDS) {
    it(`alpha-beta on ${name}`, () => {
      const cases = parseBenchmark(endEasy ?? '', create);
      console.log(tableRow('End-Easy', name, 'alpha-beta', measure(cases, analyze)));
    });
  }
});

describe.skipIf(middleEasy === undefined)('search speed on Middle-Easy (Test_L2_R1)', () => {
  // Only the fast board: the BigInt one would take minutes here. One run with
  // no warm-up: a run takes tens of seconds, so warming up would change
  // nothing measurable and only double the wait.
  it('alpha-beta on PairPosition', () => {
    const cases = parseBenchmark(middleEasy ?? '', () => new PairPosition()).slice(0, MIDDLE_EASY_COUNT);
    console.log(tableRow('Middle-Easy', 'PairPosition', 'alpha-beta', measure(cases, analyze, 1, false)));
  });
});