import { describe, expect, it } from 'vitest';
import { FIREWORK_COLORS, SHOW_MS, planBursts, sparkAt, sparksOf, type Random, type Spark } from './fireworks';

/** A repeatable random sequence (mulberry32), so a failing test fails the same way every time. */
function seeded(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The lowest and highest values a Random can give, and a few ordinary sequences.
const RANDOMS: [string, Random][] = [
  ['always 0', () => 0],
  ['always almost 1', () => 0.9999],
  ['seed 1', seeded(1)],
  ['seed 2', seeded(2)],
];

/** The last moment at which any spark of the show is still visible. */
function lastVisible(sparks: Spark[]): number {
  let last = 0;
  for (const spark of sparks) {
    for (let time = spark.born; sparkAt(spark, time) !== null; time += 10) last = Math.max(last, time);
  }
  return last;
}

describe('planBursts', () => {
  it('uses only the game colours, and all of them', () => {
    const colors = new Set(planBursts(seeded(3)).map((burst) => burst.color));
    expect([...colors].sort()).toEqual([...FIREWORK_COLORS].sort());
  });

  it('places every burst inside the area, away from the bottom', () => {
    for (const [name, random] of RANDOMS) {
      for (const burst of planBursts(random)) {
        expect(burst.x, name).toBeGreaterThan(0);
        expect(burst.x, name).toBeLessThan(1);
        expect(burst.y, name).toBeGreaterThan(0);
        expect(burst.y, name).toBeLessThan(0.7);
      }
    }
  });

  it('lets every spark fade out before the show ends', () => {
    for (const [name, random] of RANDOMS) {
      const sparks = planBursts(random).flatMap((burst) => sparksOf(burst, random));
      expect(lastVisible(sparks), name).toBeLessThan(SHOW_MS);
    }
  });

  it('spreads the bursts over the show instead of firing them all at once', () => {
    const times = planBursts(seeded(4)).map((burst) => burst.at);
    expect(Math.min(...times)).toBeLessThan(200);
    expect(Math.max(...times)).toBeGreaterThan(2000);
  });
});

describe('sparksOf', () => {
  it('starts every spark at the burst, when it goes off, in its colour', () => {
    const burst = { at: 500, x: 0.4, y: 0.3, color: '#ffffff' };
    const sparks = sparksOf(burst, seeded(5));
    expect(sparks.length).toBeGreaterThan(10);
    for (const spark of sparks) {
      expect(spark).toMatchObject({ born: 500, x: 0.4, y: 0.3, color: '#ffffff' });
    }
  });

  it('throws sparks in every direction', () => {
    const sparks = sparksOf({ at: 0, x: 0.5, y: 0.5, color: '#ffffff' }, seeded(6));
    expect(sparks.some((spark) => spark.vx > 0.1)).toBe(true);
    expect(sparks.some((spark) => spark.vx < -0.1)).toBe(true);
    expect(sparks.some((spark) => spark.vy > 0.1)).toBe(true);
    expect(sparks.some((spark) => spark.vy < -0.1)).toBe(true);
  });
});

describe('sparkAt', () => {
  const still: Spark = { born: 1000, x: 0.5, y: 0.2, vx: 0, vy: 0, color: '#ffffff' };

  it('shows nothing before the spark is born', () => {
    expect(sparkAt(still, 999)).toBeNull();
  });

  it('starts where the burst is, at full brightness', () => {
    expect(sparkAt(still, 1000)).toEqual({ x: 0.5, y: 0.2, alpha: 1 });
  });

  it('falls, and fades until it is gone', () => {
    const early = sparkAt(still, 1400)!;
    const late = sparkAt(still, 2100)!;
    expect(late.y).toBeGreaterThan(early.y);
    expect(late.alpha).toBeLessThan(early.alpha);
    expect(sparkAt(still, 5000)).toBeNull();
  });

  it('slows down as it flies', () => {
    const moving: Spark = { ...still, vx: 0.3 };
    const x = (time: number) => sparkAt(moving, time)!.x;
    expect(x(1200) - x(1000)).toBeGreaterThan(x(1400) - x(1200));
  });
});
