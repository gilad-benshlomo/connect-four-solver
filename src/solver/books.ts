import computerFirstFile from './books/book-computer-first.json';
import playerFirstFile from './books/book-player-first.json';
import type { OpeningBook } from './openingBook.ts';

/** The books hold the computer's move in every position with fewer moves played than this. */
export const BOOK_DEPTH = 10;

/** The two opening books: one for games the computer starts, one for games the player starts. */
export type Books = {
  computerFirst: OpeningBook;
  playerFirst: OpeningBook;
};

/**
 * Returns the opening books built by scripts/buildBook.ts, from the JSON files
 * in ./books. They are part of the code that imports them (in the site, the
 * solver's Web Worker), so there is nothing to download separately.
 */
export function loadBooks(): Books {
  // JSON gives plain arrays of numbers; bookFiles.test.ts checks that each is a [key, column] pair.
  return {
    computerFirst: new Map(computerFirstFile as [number, number][]),
    playerFirst: new Map(playerFirstFile as [number, number][]),
  };
}
