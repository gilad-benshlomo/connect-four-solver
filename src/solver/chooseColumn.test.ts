import { describe, expect, it } from 'vitest';
import { BOOK_DEPTH, loadBooks, type Books } from './books';
import { chooseColumn } from './chooseColumn';
import { bestMove } from './negamax';
import { addToBook } from './openingBook';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

/** Builds a position on the fast board by playing the given columns in order. */
function play(columns: number[]): Position {
  const position = new PairPosition();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

/**
 * A search for tests that must be answered by the book: searching an early
 * position would take minutes or more, so a wrong book would make the test
 * hang instead of fail. This one fails at once.
 */
function noSearch(position: Position): number {
  throw new Error(`Searched after ${position.moves} moves instead of using the book`);
}

/** Books with nothing in them, so that every answer comes from the search. */
function emptyBooks(): Books {
  return { computerFirst: new Map(), playerFirst: new Map() };
}

// X (who moved first) has three discs in column 0 and is to move: column 0
// wins at once, so the search answers without a long search. O's discs are
// spread out so that O has no three in a row.
const X_WINS_AFTER_6 = [0, 1, 0, 1, 0, 2];
const X_WINS_AFTER_8 = [0, 1, 0, 1, 0, 2, 5, 6];
const X_WINS_AFTER_10 = [0, 1, 0, 1, 0, 2, 5, 6, 5, 6];

describe('chooseColumn with the real opening books', () => {
  const books = loadBooks();

  it('starts in the centre', () => {
    expect(chooseColumn([], books, noSearch)).toBe(3);
  });

  it('takes the book by the number of moves: odd for a game the player started', () => {
    // Both answers were confirmed against the solver by scripts/checkBook.ts.
    expect(chooseColumn([5], books, noSearch)).toBe(4);
    expect(chooseColumn([3, 2], books, noSearch)).toBe(5);
  });

  it('plays the mirrored column in the mirror image', () => {
    expect(chooseColumn([1], books, noSearch)).toBe(2);
    expect(chooseColumn([3, 4], books, noSearch)).toBe(1);
  });
});

describe('chooseColumn around the book', () => {
  it('searches when the book has no entry', () => {
    expect(chooseColumn(X_WINS_AFTER_6, emptyBooks(), bestMove)).toBe(0);
  });

  it('plays the book before BOOK_DEPTH moves, even against the search', () => {
    // A made-up entry, worse than the winning column 0: the book is trusted as it is.
    const books = emptyBooks();
    addToBook(books.computerFirst, play(X_WINS_AFTER_8), 4);
    expect(X_WINS_AFTER_8.length).toBeLessThan(BOOK_DEPTH);
    expect(chooseColumn(X_WINS_AFTER_8, books, bestMove)).toBe(4);
  });

  it('ignores the book from BOOK_DEPTH moves on', () => {
    const books = emptyBooks();
    addToBook(books.computerFirst, play(X_WINS_AFTER_10), 4);
    expect(X_WINS_AFTER_10.length).toBe(BOOK_DEPTH);
    expect(chooseColumn(X_WINS_AFTER_10, books, bestMove)).toBe(0);
  });
});

describe('chooseColumn with moves that cannot be played', () => {
  const books = emptyBooks();

  it('refuses columns outside 0-6, and columns that are not whole numbers', () => {
    expect(() => chooseColumn([7], books, noSearch)).toThrow('Column 7 cannot be played: move 1 of [7]');
    expect(() => chooseColumn([3, -1], books, noSearch)).toThrow('Column -1 cannot be played');
    expect(() => chooseColumn([1.5], books, noSearch)).toThrow('Column 1.5 cannot be played');
  });

  it('refuses a disc in a full column', () => {
    expect(() => chooseColumn([0, 0, 0, 0, 0, 0, 0], books, noSearch)).toThrow('Column 0 cannot be played: move 7');
  });

  it('refuses a game that is already won, and moves after the win', () => {
    const won = [...X_WINS_AFTER_6, 0];
    expect(() => chooseColumn(won, books, noSearch)).toThrow('The game is already won');
    expect(() => chooseColumn([...won, 3], books, noSearch)).toThrow('The game was already won before move 8');
  });

  it('refuses a full board', () => {
    // The drawn game from game.test.ts: 42 moves and no four in a row.
    const draw = [
      0, 0, 0, 0, 0, 0,
      1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1,
      3, 3, 3, 3, 3, 3,
      4, 5, 5, 4, 4, 5, 5, 4, 4, 5, 5, 4,
      6, 6, 6, 6, 6, 6,
    ];
    expect(() => chooseColumn(draw, books, noSearch)).toThrow('The board is full');
  });
});
