import { COLUMNS, ROWS } from '../game/board.ts';
import { BOOK_DEPTH, type Books } from './books.ts';
import { bookMove } from './openingBook.ts';
import { PairPosition } from './pairPosition.ts';
import type { Position } from './position.ts';

/**
 * Returns the column the computer plays after the given moves (columns 0-6
 * from the start of the game), the computer being the player to move (D7).
 * Before `BOOK_DEPTH` moves it plays the opening book's column; after that,
 * or if the book has no entry, the column `search` returns (in the game,
 * `bestMove` with a transposition table kept for the whole game; tests can
 * pass a search that fails at once). The book is chosen by the number of
 * moves: the computer moves after an even number of moves in a game it
 * started, after an odd number in a game the player started.
 * Throws if a move is not legal, or if the game is already over.
 */
export function chooseColumn(
  moves: readonly number[],
  books: Books,
  search: (position: Position) => number,
): number {
  const position = new PairPosition();
  let won = false; // the last move played completed four in a row
  for (const [index, column] of moves.entries()) {
    const where = `move ${index + 1} of [${moves.join(', ')}]`;
    if (won) {
      throw new Error(`The game was already won before ${where}`);
    }
    if (!Number.isInteger(column) || column < 0 || column >= COLUMNS || !position.canPlay(column)) {
      throw new Error(`Column ${column} cannot be played: ${where}`);
    }
    won = position.isWinningMove(column);
    position.play(column);
  }
  if (won) {
    throw new Error(`The game is already won: [${moves.join(', ')}]`);
  }
  if (moves.length === COLUMNS * ROWS) {
    throw new Error('The board is full');
  }

  if (moves.length < BOOK_DEPTH) {
    const book = moves.length % 2 === 0 ? books.computerFirst : books.playerFirst;
    const column = bookMove(book, position);
    if (column !== undefined) return column;
  }
  return search(position);
}

