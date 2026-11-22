/**
 * The fireworks shown when the player wins: where and when each burst goes
 * off, and how its sparks move. Pure functions with no drawing, so they can be
 * tested; fireworksView.ts draws the result on a canvas.
 *
 * Positions are fractions of the drawing area (0 to 1 across and down), and
 * times are in milliseconds from the start of the show.
 */

/** The burst colours: the two disc colours, the board's blue (lightened to show on it) and white. */
export const FIREWORK_COLORS = ['#e8565c', '#ffc21a', '#8fb0ff', '#ffffff'] as const;

/** How long the show lasts after a win, the last sparks included: time to enjoy it and take a screenshot. */
export const WIN_SHOW_MS = 15_000;

/** How long the show lasts after a draw: a shorter one. */
export const DRAW_SHOW_MS = 4000;

/** The last burst goes off this long before the end, so its sparks have time to fade. */
const SPARK_LIFE_MS = 1300;
/** Bursts per second of show, whatever its length. */
const BURSTS_PER_SECOND = 2.25;
const SPARKS_PER_BURST = 48;
/** Downward pull, in drawing-area heights per second squared. */
const GRAVITY = 0.35;
/** The share of a spark's speed kept after one second of air drag. */
const DRAG_PER_SECOND = 0.25;

/** A random number from 0 (included) to 1 (excluded), as Math.random gives. */
export type Random = () => number;

/** One burst: where it goes off, when, and in what colour. */
export type Burst = { at: number; x: number; y: number; color: string };

/** One spark, as it was when its burst went off. */
export type Spark = {
  /** When the spark was born, in ms from the start of the show. */
  born: number;
  x: number;
  y: number;
  /** Speed across and down, in drawing-area sizes per second. */
  vx: number;
  vy: number;
  color: string;
};

/** Where a spark is at a moment of the show, and how visible it is (0 to 1). */
export type SparkState = { x: number; y: number; alpha: number };

/**
 * Plans the bursts of a show lasting `showMs`: spread evenly over it, at
 * random spots in the upper two thirds of the area, the colours taking
 * turns. The last burst goes off early enough for its sparks to fade out.
 */
export function planBursts(random: Random, showMs: number): Burst[] {
  const lastAt = showMs - SPARK_LIFE_MS - 200;
  const count = Math.max(2, Math.round((showMs / 1000) * BURSTS_PER_SECOND));
  const bursts: Burst[] = [];
  for (let i = 0; i < count; i++) {
    bursts.push({
      // Evenly spread, each moved a little so they don't tick like a clock.
      at: Math.min(lastAt, (i * lastAt) / (count - 1) + random() * 120),
      x: 0.25 + random() * 0.5,
      y: 0.12 + random() * 0.5,
      color: FIREWORK_COLORS[i % FIREWORK_COLORS.length],
    });
  }
  return bursts;
}

/** The sparks of one burst, thrown out evenly in a circle at slightly different speeds. */
export function sparksOf(burst: Burst, random: Random): Spark[] {
  const sparks: Spark[] = [];
  for (let i = 0; i < SPARKS_PER_BURST; i++) {
    const angle = (i / SPARKS_PER_BURST) * 2 * Math.PI + random() * 0.15;
    const speed = 0.4 + random() * 0.2;
    sparks.push({
      born: burst.at,
      x: burst.x,
      y: burst.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: burst.color,
    });
  }
  return sparks;
}

/**
 * Where a spark is at a given time, or null if it has not been born yet or
 * has already faded out. Drag slows it and gravity pulls it down.
 */
export function sparkAt(spark: Spark, time: number): SparkState | null {
  const age = time - spark.born;
  if (age < 0 || age >= SPARK_LIFE_MS) return null;
  const t = age / 1000;
  // With drag k, speed falls as e^(-k t); the distance is its integral.
  const k = -Math.log(DRAG_PER_SECOND);
  const travelled = (1 - Math.exp(-k * t)) / k;
  return {
    x: spark.x + spark.vx * travelled,
    y: spark.y + spark.vy * travelled + 0.5 * GRAVITY * t * t,
    // Full brightness at first, then fading to nothing.
    alpha: Math.min(1, 2.5 * (1 - age / SPARK_LIFE_MS)),
  };
}
