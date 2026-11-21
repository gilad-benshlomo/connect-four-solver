import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { bestMove } from '../src/solver/negamax.ts';
import { buildBook, type OpeningBook } from '../src/solver/openingBook.ts';
import { PairPosition } from '../src/solver/pairPosition.ts';
import type { Position } from '../src/solver/position.ts';
import { TranspositionTable } from '../src/solver/transpositionTable.ts';

// Builds the two opening books into src/solver/books/, where the solver imports them.
// Run with `node scripts/buildBook.ts` (an optional number sets a smaller
// depth, for a quick try). Stop it with Ctrl+C at any time and run it again
// to continue: each book is saved after every new entry.

/** The books store the computer's moves while fewer than this many moves have been played. */
const DEPTH = Number(process.argv[2] ?? 10);

/** Table size for the search: a prime just above 2^23, about 40 MB. */
const TABLE_SIZE = 8_388_617;

/** The only first move that wins, a known result (Allis, 1988), so it is not searched. */
const CENTRE = 3;

const BOOKS = [
  { computerStarts: true, file: 'src/solver/books/book-computer-first.json' },
  { computerStarts: false, file: 'src/solver/books/book-player-first.json' },
];

/** Reads a book saved by `save`, or returns an empty one if there is none yet. */
function load(file: string): OpeningBook {
  if (!existsSync(file)) return new Map();
  return new Map(JSON.parse(readFileSync(file, 'utf8')) as [number, number][]);
}

/** Saves a book as a list of [key, column] pairs. */
function save(book: OpeningBook, file: string): void {
  // Write a temporary file first, so stopping in the middle never leaves a broken book.
  writeFileSync(`${file}.tmp`, JSON.stringify([...book]));
  renameSync(`${file}.tmp`, file);
}

const table = new TranspositionTable(TABLE_SIZE);
const started = Date.now();

for (const { computerStarts, file } of BOOKS) {
  const book = load(file);
  console.log(`${file}: ${book.size} entries already, depth ${DEPTH}`);
  buildBook(book, new PairPosition(), {
    computerStarts,
    depth: DEPTH,
    chooseMove: (position: Position) => (position.moves === 0 ? CENTRE : bestMove(position, table)),
    onStored: (position, column) => {
      save(book, file);
      const minutes = ((Date.now() - started) / 60_000).toFixed(1);
      console.log(`${book.size} entries | after ${position.moves} moves: column ${column} | ${minutes} min`);
    },
  });
  save(book, file);
  console.log(`${file}: done, ${book.size} entries`);
}