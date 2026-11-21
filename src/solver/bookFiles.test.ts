import { describe, expect, it } from 'vitest';
import computerFirstFile from './books/book-computer-first.json';
import playerFirstFile from './books/book-player-first.json';
import { COLUMNS } from '../game/board';
import { bookMove, mirrorKey, type OpeningBook } from './openingBook';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

// The two opening books built by scripts/buildBook.ts (docs/JOURNEY.md, D24).
// They are part of the repository, so they are imported directly: a missing
// file fails this test, in CI too, instead of skipping it.

/** The books store the computer's moves while fewer than this many moves have been played. */
const DEPTH = 10;

/**
 * Plays every game the book allows from the start, the computer following the
 * book and the opponent trying every move that does not win at once, and
 * checks that the book has a playable column for every position on the
 * computer's turn before `DEPTH`. Returns how many such positions it met.
 */
function checkCovered(book: OpeningBook, computerStarts: boolean): number {
  let met = 0;
  const visit = (position: Position, moves: number[]): void => {
    if (position.moves >= DEPTH) return;
    if (position.moves % 2 === (computerStarts ? 0 : 1)) {
      const column = bookMove(book, position);
      const where = `after moves [${moves.join(', ')}]`;
      expect(column, `no column ${where}`).toBeDefined();
      expect(position.canPlay(column!), `column ${column} is full ${where}`).toBe(true);
      met++;
      if (position.isWinningMove(column!)) return; // the computer wins: game over
      const next = position.clone();
      next.play(column!);
      visit(next, [...moves, column!]);
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
  return met;
}

const BOOKS = [
  { name: 'computer first', file: computerFirstFile, computerStarts: true, entries: 825, positions: 2212 },
  { name: 'player first', file: playerFirstFile, computerStarts: false, entries: 3032, positions: 12627 },
];

for (const { name, file, computerStarts, entries, positions } of BOOKS) {
  describe(`the ${name} book file`, () => {
    // JSON gives plain arrays of numbers; the tests below check that each is a [key, column] pair.
    const pairs = file as [number, number][];
    const book: OpeningBook = new Map(pairs);

    it(`has ${entries} entries, each a column 0-6 under the smaller of the two mirror keys`, () => {
      expect(pairs).toHaveLength(entries);
      expect(book.size).toBe(entries); // every key appears once
      for (const [key, column] of pairs) {
        expect(Number.isInteger(key) && key >= 0, `key ${key}`).toBe(true);
        expect(key, `key ${key} is not the smaller one`).toBeLessThanOrEqual(mirrorKey(key));
        expect(Number.isInteger(column) && column >= 0 && column < COLUMNS, `column ${column} for key ${key}`).toBe(true);
      }
    });

    it(`has a playable column for all ${positions} positions on the computer's turn before move ${DEPTH}`, () => {
      expect(checkCovered(book, computerStarts)).toBe(positions);
    });
  });
}