import { describe, expect, it } from 'vitest';
import { analyze, analyzeFullWindow, type SearchResult } from './negamax';
import { PairPosition } from './pairPosition';
import type { Position } from './position';
import { TranspositionTable } from './transpositionTable';

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
const beginEasy = files['../../benchmarks/Test_L1_R1'];
const beginMedium = files['../../benchmarks/Test_L1_R2'];
const beginHard = files['../../benchmarks/Test_L1_R3'];


/** How many timed runs to take the median of, after one warm-up run. */
const RUNS = 3;

/** Table size for the measurements: a prime just above 2^20, about 5 MB. */
const TABLE_SIZE = 1_048_583;

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

/** How to run a measurement; every field has a default. */
type MeasureOptions = {
  /** Timed runs to take the median of (default `RUNS`). */
  runs?: number;
  /** Whether to do one untimed warm-up run first (default true). */
  warmUp?: boolean;
  /** Called before each position, outside the timing (e.g. to clear a table). */
  beforeEach?: () => void;
};

/**
 * Times `search` on every position: by default one warm-up run that is thrown
 * away (so the JavaScript engine has optimised the code), then `RUNS` timed
 * runs. Returns the figures of the run with the median total time. Also
 * checks every score, so a broken search can never produce a measurement.
 */
function measure(
  cases: BenchmarkPosition[],
  search: (position: Position) => SearchResult,
  { runs: timedRuns = RUNS, warmUp = true, beforeEach }: MeasureOptions = {},
): Measurement {
  const runs: { totalMs: number; slowestMs: number; explored: number }[] = [];
  for (let run = warmUp ? 0 : 1; run <= timedRuns; run++) {
    let totalMs = 0;
    let slowestMs = 0;
    let explored = 0;
    for (const { line, position, score } of cases) {
      beforeEach?.();
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

/** A search that uses a table: the full-window one or the narrow-window one. */
type TableSearch = (position: Position, table: TranspositionTable) => SearchResult;

/** The two searches compared from here on, both with a table. */
const SEARCHES: { name: string; search: TableSearch }[] = [
  { name: 'full window + table', search: analyzeFullWindow },
  { name: 'null window + table', search: analyze },
];

/**
 * Measures `search` on the fast board, with a table that is cleared before
 * each position (outside the timing), so every position is measured on its
 * own and the counts are the same on every run.
 */
function measureWithTable(cases: BenchmarkPosition[], search: TableSearch, options: MeasureOptions = {}): Measurement {
  const table = new TranspositionTable(TABLE_SIZE);
  return measure(cases, (position) => search(position, table), {
    ...options,
    beforeEach: () => table.clear(),
  });
}

/** Parses a benchmark file into positions on the fast board. */
function fastCases(text: string | undefined): BenchmarkPosition[] {
  return parseBenchmark(text ?? '', () => new PairPosition());
}

// Earlier rows (the BigInt board, plain negamax, no table) are kept in
// docs/JOURNEY.md; they do not change any more, so they are not re-measured.

describe.skipIf(endEasy === undefined)('search speed on End-Easy (Test_L3_R1)', () => {
  for (const { name, search } of SEARCHES) {
    it(name, () => {
      console.log(tableRow('End-Easy', 'PairPosition', name, measureWithTable(fastCases(endEasy), search)));
    });
  }
});

describe.skipIf(middleEasy === undefined)('search speed on Middle-Easy (Test_L2_R1)', () => {
  for (const { name, search } of SEARCHES) {
    it(`${name}, first 100 positions`, () => {
      const cases = fastCases(middleEasy).slice(0, 100);
      console.log(tableRow('Middle-Easy (first 100)', 'PairPosition', name, measureWithTable(cases, search)));
    });
  }

  it('null window + table, all 1000 positions', () => {
    const result = measureWithTable(fastCases(middleEasy), analyze);
    console.log(tableRow('Middle-Easy', 'PairPosition', 'null window + table', result));
  });
});

describe.skipIf(beginEasy === undefined)('search speed on Begin-Easy (Test_L1_R1)', () => {
  it('null window + table, all 1000 positions', () => {
    // One run with no warm-up: a run takes many seconds, so warming up would
    // change nothing measurable and only double the wait.
    const result = measureWithTable(fastCases(beginEasy), analyze, { runs: 1, warmUp: false });
    console.log(tableRow('Begin-Easy', 'PairPosition', 'null window + table', result));
  });
});

// The opening sets take seconds per position, so these measure only a part of
// each, with one run and no warm-up, like Begin-Easy above.

describe.skipIf(beginMedium === undefined)('search speed on Begin-Medium (Test_L1_R2)', () => {
  it('null window + table, first 100 positions', () => {
    const cases = fastCases(beginMedium).slice(0, 100);
    const result = measureWithTable(cases, analyze, { runs: 1, warmUp: false });
    console.log(tableRow('Begin-Medium (first 100)', 'PairPosition', 'null window + table', result));
  });
});

describe.skipIf(beginHard === undefined)('search speed on Begin-Hard (Test_L1_R3)', () => {
  it('null window + table, first 20 positions after 8 moves', () => {
    // Positions after 8 moves are where an opening book of depth 8 would end;
    // the earlier ones are left to the book.
    const cases = fastCases(beginHard)
      .filter(({ position }) => position.moves === 8)
      .slice(0, 20);
    const result = measureWithTable(cases, analyze, { runs: 1, warmUp: false });
    console.log(tableRow('Begin-Hard (first 20 after 8 moves)', 'PairPosition', 'null window + table', result));
  });
});