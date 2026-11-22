/**
 * Draws the fireworks of fireworks.ts on a canvas laid over the board. The
 * canvas lets every click through and is hidden from screen readers; nothing
 * is drawn for players who asked their system for reduced motion.
 */
import { h } from './dom';
import { SHOW_MS, planBursts, sparkAt, sparksOf, type Spark, type SparkState } from './fireworks';

/** How far behind a spark its streak starts, in ms: a short tail shows its motion. */
const TAIL_MS = 90;

export class FireworksView {
  /** The canvas to place over the board. */
  readonly canvas = h('canvas', { class: 'fireworks', 'aria-hidden': 'true' });
  private sparks: Spark[] = [];
  private startedAt = 0;
  private frame: number | undefined;
  private readonly reducedMotion: () => boolean;

  /** @param reducedMotion true if the player asked for reduced motion (by default, read from the system) */
  constructor(reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    this.reducedMotion = reducedMotion;
    this.canvas.hidden = true;
  }

  /** Starts a new show, replacing one still running. */
  play(): void {
    this.stop();
    if (this.reducedMotion()) return;
    this.sparks = planBursts(Math.random).flatMap((burst) => sparksOf(burst, Math.random));
    this.startedAt = performance.now();
    this.canvas.hidden = false;
    this.frame = requestAnimationFrame((now) => this.draw(now));
  }

  /** Ends the show at once and clears the canvas. */
  stop(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.sparks = [];
    this.canvas.hidden = true;
  }

  private draw(now: number): void {
    const time = now - this.startedAt;
    if (time >= SHOW_MS) {
      this.stop();
      return;
    }
    const context = this.prepare();
    if (context) {
      const { width, height } = this.canvas;
      const size = Math.min(width, height);
      for (const spark of this.sparks) {
        const head = sparkAt(spark, time);
        if (!head) continue;
        const tail = sparkAt(spark, Math.max(spark.born, time - TAIL_MS)) ?? head;
        context.globalAlpha = head.alpha;
        context.strokeStyle = spark.color;
        context.shadowColor = spark.color;
        context.lineWidth = Math.max(2, size / 150);
        context.beginPath();
        // The burst sits at its spot in the area; the sparks fly in units of
        // the area's shorter side, so a burst stays round on any shape.
        const x = (state: SparkState) => spark.x * width + (state.x - spark.x) * size;
        const y = (state: SparkState) => spark.y * height + (state.y - spark.y) * size;
        context.moveTo(x(tail), y(tail));
        context.lineTo(x(head), y(head));
        context.stroke();
      }
    }
    this.frame = requestAnimationFrame((next) => this.draw(next));
  }

  /** Matches the canvas to its size on screen (it may change mid-show) and clears it. */
  private prepare(): CanvasRenderingContext2D | null {
    const scale = window.devicePixelRatio || 1;
    const width = Math.round(this.canvas.clientWidth * scale);
    const height = Math.round(this.canvas.clientHeight * scale);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const context = this.canvas.getContext('2d');
    if (!context) return null;
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';
    // A soft glow in each spark's own colour, so white sparks show over the light holes too.
    context.shadowBlur = Math.min(width, height) / 50;
    return context;
  }
}
