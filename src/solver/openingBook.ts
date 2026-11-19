import { COLUMNS, ROWS } from '../game/board.ts';

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