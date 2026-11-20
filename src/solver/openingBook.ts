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

/** What `buildBook` needs to know; see there. */
export type BookOptions = {
  /** True if the computer makes the first move of the game. */
  computerStarts: boolean;
  /** Store moves only in positions with fewer moves played than this. */
  depth: number;
  /** Picks the computer's move in a position the book does not have yet. */
  chooseMove: (position: Position) => number;
  /** Called after each new entry, for example to save progress. */
  onStored?: (position: Position, column: number) => void;
};

/**
 * Fills the opening book: walks every game from `start` in which the computer
 * plays the book's move and the opponent plays any move, and stores the
 * computer's move for each position on its turn with fewer than `depth`
 * moves played. Positions already in the book are not chosen again, so a
 * build that was stopped can be continued with the same book.
 */
export function buildBook(book: OpeningBook, start: Position, options: BookOptions): void {
  const { computerStarts, depth, chooseMove, onStored } = options;
  const computerParity = computerStarts ? 0 : 1;

  const visit = (position: Position): void => {
    if (position.moves >= depth) return;
    if (position.moves % 2 === computerParity) {
      let column = bookMove(book, position);
      if (column === undefined) {
        column = chooseMove(position);
        addToBook(book, position, column);
        onStored?.(position, column);
      }
      if (position.isWinningMove(column)) return; // the computer wins: game over
      const next = position.clone();
      next.play(column);
      visit(next);
    } else {
      for (let column = 0; column < COLUMNS; column++) {
        // A move that wins for the opponent ends the game: nothing to store after it.
        if (!position.canPlay(column) || position.isWinningMove(column)) continue;
        const next = position.clone();
        next.play(column);
        visit(next);
      }
    }
  };

  visit(start);
}