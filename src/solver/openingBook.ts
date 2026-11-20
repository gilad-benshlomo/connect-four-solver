import { COLUMNS, ROWS } from '../game/board.ts';
import type { Position } from './position.ts';

// In a key (see `Position.key`), each column takes ROWS + 1 bits: its cells
// and the helper cell above them. As a number, column c is the digit at
// place c in base 2 ** (ROWS + 1).
const COLUMN_VALUES = 2 ** (ROWS + 1);

/**
 * Returns the key of the mirror image of a position, with the columns
 * swapped left to right, from the key of the position (see `Position.key`).
 * A mirror image plays the same with every move mirrored, so the opening
 * book stores only one of the two.
 */
export function mirrorKey(key: number): number {
  let rest = key;
  let mirrored = 0;
  for (let column = 0; column < COLUMNS; column++) {
    // Take the lowest column left, and put it at the mirrored place.
    const digit = rest % COLUMN_VALUES;
    rest = (rest - digit) / COLUMN_VALUES;
    mirrored += digit * COLUMN_VALUES ** (COLUMNS - 1 - column);
  }
  return mirrored;
}

/**
 * The opening book: for each stored position, the column to play there.
 * A position and its mirror image share one entry, kept under the smaller of
 * their two keys, with the column as seen from that one.
 */
export type OpeningBook = Map<number, number>;

/** Returns the column on the other side of the board: 0 for 6, 1 for 5, and so on. */
function mirrorColumn(column: number): number {
  return COLUMNS - 1 - column;
}

/** Stores the column to play in a position (see `OpeningBook`). */
export function addToBook(book: OpeningBook, position: Position, column: number): void {
  const key = position.key();
  const mirror = mirrorKey(key);
  if (mirror < key) {
    book.set(mirror, mirrorColumn(column));
  } else {
    book.set(key, column);
  }
}

/** Returns the column stored for a position, or undefined if the book does not have it. */
export function bookMove(book: OpeningBook, position: Position): number | undefined {
  const key = position.key();
  const mirror = mirrorKey(key);
  if (mirror < key) {
    const column = book.get(mirror);
    return column === undefined ? undefined : mirrorColumn(column);
  }
  return book.get(key);
}