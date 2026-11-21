import { readFileSync } from 'node:fs';
import { COLUMNS, ROWS } from '../src/game/board.ts';
import { bestMove, solve } from '../src/solver/negamax.ts';
import { bookMove, type OpeningBook } from '../src/solver/openingBook.ts';
import { PairPosition } from '../src/solver/pairPosition.ts';
import type { Position } from '../src/solver/position.ts';
import { TranspositionTable } from '../src/solver/transpositionTable.ts';

// Checks a sample of the opening books against the solver: the book's move
// must score as well as the move bestMove chooses, and in the computer-first
// book the computer must still be winning where the book ends. A one-off
// check, too slow for npm test; the results go into docs/JOURNEY.md.
//
// Scores are compared, not columns: among moves with the same score, bestMove
// takes the first in COLUMN_ORDER, which prefers column 2 to column 4. A book
// entry is shared with the mirror image, so it can hold the mirror of that
// choice: column 4 where bestMove takes 2, both equally good.
//
//   node scripts/checkBook.ts          deep positions and the edge (minutes)
//   node scripts/checkBook.ts early    four early positions (could take hours)
//
// The samples come from a seeded random generator, so every run checks the
// same positions. Each result is printed as soon as it is known, so the run
// can be stopped with Ctrl+C at any time.

/** The books store the computer's moves while fewer than this many moves have been played. */
const DEPTH = 10;

/** Table size for the search, as in buildBook.ts: a prime just above 2^23, about 40 MB. */
const TABLE_SIZE = 8_388_617;

/** A position on the computer's turn, and the moves that led to it. */
type Reached = { moves: number[]; position: Position };

/** Reads a book saved by buildBook.ts. */
function load(file: string): OpeningBook {
  return new Map(JSON.parse(readFileSync(file, 'utf8')) as [number, number][]);
}

/**
 * Plays every game the book allows from the start, the computer following the
 * book and the opponent trying every move that does not win at once, and
 * returns every position on the computer's turn up to `DEPTH` moves, the ones
 * at `DEPTH` included (where the book ends), grouped by moves played.
 */
function reachedPositions(book: OpeningBook, computerStarts: boolean): Map<number, Reached[]> {
  const byMoves = new Map<number, Reached[]>();
  const visit = (position: Position, moves: number[]): void => {
    if (position.moves > DEPTH) return;
    if (position.moves % 2 === (computerStarts ? 0 : 1)) {
      const list = byMoves.get(position.moves) ?? [];
      list.push({ moves, position });
      byMoves.set(position.moves, list);
      if (position.moves === DEPTH) return; // past the book
      const column = bookMove(book, position);
      if (column === undefined) throw new Error(`no book move after moves [${moves.join(', ')}]`);
      if (position.isWinningMove(column)) return; // the computer wins: game over
      const next = position.clone();
      next.play(column);
      visit(next, [...moves, column]);
    } else {
      for (let column = 0; column < COLUMNS; column++) {
        if (!position.canPlay(column) || position.isWinningMove(column)) continue;
        const next = position.clone();
        next.play(column);
        visit(next, [...moves, column]);
      }
    }
  };
  visit(new PairPosition(), []);
  return byMoves;
}

/** Returns a simple seeded random number generator (values in [0, 1)), as in the tests. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

/** Picks `count` different items at random, always the same ones for the same seed. */
function sample<T>(items: T[], count: number, seed: number): T[] {
  const random = seededRandom(seed);
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked;
}

const table = new TranspositionTable(TABLE_SIZE);
let checked = 0;
let failed = 0;
let ties = 0; // a different column with the same score

/** Returns the score of playing a column, for the player to move (same scale as `solve`). */
function scoreAfter(position: Position, column: number): number {
  // A winning move ends the game, so there is nothing left to solve.
  if (position.isWinningMove(column)) return Math.floor((COLUMNS * ROWS + 1 - position.moves) / 2);
  const next = position.clone();
  next.play(column);
  return 0 - solve(next, table);
}

/** Checks that the book's column scores as well as bestMove's in each position, printing one line each. */
function checkBestScore(title: string, book: OpeningBook, positions: Reached[]): void {
  console.log(`\n${title}: ${positions.length} positions, the book's column must score as well as bestMove's`);
  for (const { moves, position } of positions) {
    const started = Date.now();
    console.log(`  [${moves.join(', ')}] started at ${new Date(started).toLocaleTimeString()}`);
    const inBook = bookMove(book, position)!;
    const chosen = bestMove(position, table);
    const bookScore = scoreAfter(position, inBook);
    const bestScore = scoreAfter(position, chosen);
    const ok = bookScore === bestScore;
    checked++;
    if (!ok) failed++;
    else if (inBook !== chosen) ties++;
    const verdict = !ok ? 'WORSE' : inBook === chosen ? 'OK' : 'OK, a tie';
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`    book ${inBook} (score ${bookScore}), bestMove ${chosen} (score ${bestScore}): ${verdict} (${seconds} s)`);
  }
}

/** Checks that the player to move, the computer, wins in each position, printing one line each. */
function checkWinning(title: string, positions: Reached[]): void {
  console.log(`\n${title}: ${positions.length} positions, the computer must be winning`);
  for (const { moves, position } of positions) {
    const started = Date.now();
    const score = solve(position, table);
    const ok = score > 0;
    checked++;
    if (!ok) failed++;
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`  [${moves.join(', ')}] score ${score}: ${ok ? 'OK' : 'NOT WINNING'} (${seconds} s)`);
  }
}

const computerFirst = load('src/solver/books/book-computer-first.json');
const playerFirst = load('src/solver/books/book-player-first.json');
const computerReached = reachedPositions(computerFirst, true);
const playerReached = reachedPositions(playerFirst, false);
const runStarted = Date.now();

/** The positions met after this many moves in a book (none if the computer never moves then). */
function at(reached: Map<number, Reached[]>, moves: number): Reached[] {
  return reached.get(moves) ?? [];
}

if (process.argv[2] === 'early') {
  // The medium-early ones first: they take less time than the very first moves.
  checkBestScore('Computer first, after 4 moves', computerFirst, sample(at(computerReached, 4), 1, 41));
  checkBestScore('Player first, after 5 moves', playerFirst, sample(at(playerReached, 5), 1, 51));
  checkBestScore('Computer first, after 2 moves', computerFirst, sample(at(computerReached, 2), 1, 21));
  checkBestScore('Player first, after 1 move', playerFirst, sample(at(playerReached, 1), 1, 11));
} else {
  const count = Number(process.argv[2] ?? 30); // a smaller number, for a quick try
  checkBestScore('Computer first, after 8 moves', computerFirst, sample(at(computerReached, 8), count, 8));
  checkBestScore('Player first, after 9 moves', playerFirst, sample(at(playerReached, 9), count, 9));
  checkWinning(`Computer first, after ${DEPTH} moves (the book ends)`, sample(at(computerReached, DEPTH), count, 10));
}

const minutes = ((Date.now() - runStarted) / 60_000).toFixed(1);
console.log(`\n${checked} checked, ${failed} failed (${ties} ties between equally good columns), ${minutes} min`);