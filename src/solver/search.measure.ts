import { describe, expect, it } from 'vitest';
import { BigIntPosition } from './bigintPosition';
import { analyze, analyzeNegamax, type SearchResult } from './negamax';

// Speed of the search on the benchmark positions published by Pascal Pons
// (blog.gamesolver.org), kept out of the repository (docs/JOURNEY.md, D18).
// Run with `npm run measure`; skipped when the files are missing.
const files = import.meta.glob<string>('../../benchmarks/Test_*', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const endEasy = files['../../benchmarks/Test_L3_R1'];

/** How many timed runs to take the median of, after one warm-up run. */
const RUNS = 3;

/** One benchmark position, ready to search, with its published score. */
type BenchmarkPosition = { line: string; position: BigIntPosition; score: number };

/** The figures for one search on one set of positions (the median run). */
type Measurement = {
  positions: number;
  meanMs: number;
  slowestMs: number;
  meanExplored: number;
  positionsPerSecond: number;
};

/** Parses a benchmark file ("moves score" per line, columns from 1) into positions. */
function parseBenchmark(text: string): BenchmarkPosition[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const [sequence, score] = line.split(' ');
      const position = new BigIntPosition();
      for (const digit of sequence) {
        position.play(Number(digit) - 1);
      }
      return { line, position, score: Number(score) };
    });
}

/**
 * Times `search` on every position: one warm-up run that is thrown away (so
 * the JavaScript engine has optimised the code), then `RUNS` timed runs.
 * Returns the figures of the run with the median total time. Also checks
 * every score, so a broken search can never produce a measurement.
 */
function measure(
  cases: BenchmarkPosition[],
  search: (position: BigIntPosition) => SearchResult,
): Measurement {
  const runs: { totalMs: number; slowestMs: number; explored: number }[] = [];
  for (let run = 0; run <= RUNS; run++) {
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
function tableRow(set: string, search: string, m: Measurement): string {
  const cells = [
    set,
    search,
    String(m.positions),
    `${m.meanMs.toFixed(3)} ms`,
    `${m.slowestMs.toFixed(1)} ms`,
    Math.round(m.meanExplored).toLocaleString('en-US'),
    Math.round(m.positionsPerSecond).toLocaleString('en-US'),
  ];
  return `| ${cells.join(' | ')} |`;
}

describe.skipIf(endEasy === undefined)('search speed on End-Easy (Test_L3_R1)', () => {
  const cases = parseBenchmark(endEasy ?? '');

  it('alpha-beta', () => {
    console.log(tableRow('End-Easy', 'alpha-beta', measure(cases, analyze)));
  });

  it('plain negamax', () => {
    console.log(tableRow('End-Easy', 'plain negamax', measure(cases, analyzeNegamax)));
  });
});