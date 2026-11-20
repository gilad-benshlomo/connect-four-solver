import { describe, expect, it } from 'vitest';
import { COLUMNS } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { COLUMN_ORDER } from './negamax';
import {
  addToBook,
  bookMove,
  buildBook,
  mirrorKey,
  type BookOptions,
  type OpeningBook,
} from './openingBook';
import { PairPosition } from './pairPosition';
import type { Position } from './position';

/**
 * Returns a simple seeded random number generator (values in [0, 1)),
 * so that random tests run the same games every time.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

/** Builds a position on the fast board by playing the given columns in order. */
function play(columns: number[]): Position {
  const position = new PairPosition();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

/** The same moves, each in the mirrored column. */
function mirrored(columns: number[]): number[] {
  return columns.map((column) => COLUMNS - 1 - column);
}

describe('mirrorKey', () => {
  it('leaves the empty board as it is', () => {
    const key = play([]).key();
    expect(mirrorKey(key)).toBe(key);
  });

  it('leaves a position that is its own mirror image as it is', () => {
    // X in columns 2 and 4, O between them; then a column of discs in the centre.
    for (const moves of [[2, 3, 4], [3, 3, 3]]) {
      const key = play(moves).key();
      expect(mirrorKey(key)).toBe(key);
    }
  });

  it('gives the key of the game played in the mirrored columns', () => {
    expect(mirrorKey(play([0]).key())).toBe(play([6]).key());
    expect(mirrorKey(play([0, 1, 5]).key())).toBe(play([6, 5, 1]).key());
  });

  it('agrees with the mirrored game over many random games, on both boards', () => {
    const random = seededRandom(11);
    let checked = 0;
    let different = 0; // positions that are not their own mirror image

    for (let game = 0; game < 200; game++) {
      const moves: number[] = [];
      const position = new BigIntPosition();
      while (true) {
        const playable: number[] = [];
        for (let column = 0; column < COLUMNS; column++) {
          if (position.canPlay(column)) playable.push(column);
        }
        if (playable.length === 0) break; // full: only the discs' places matter here, not wins
        const column = playable[Math.floor(random() * playable.length)];
        position.play(column);
        moves.push(column);

        // The key comes from the reference board, the mirrored one from the fast board.
        const key = position.key();
        const expected = play(mirrored(moves)).key();
        expect(mirrorKey(key), moves.join('')).toBe(expected);
        expect(mirrorKey(expected)).toBe(key); // mirroring twice changes nothing
        checked++;
        if (expected !== key) different++;
      }
    }

    // Make sure the test really met many positions, nearly all of them not symmetric.
    expect(checked).toBeGreaterThan(8000);
    expect(different).toBeGreaterThan(8000);
  });
});

describe('the opening book', () => {
  it('has nothing for a position that was never stored', () => {
    expect(bookMove(new Map(), play([3]))).toBeUndefined();
  });

  it('returns the column stored for a position', () => {
    const book: OpeningBook = new Map();
    addToBook(book, play([3, 2]), 4);
    expect(bookMove(book, play([3, 2]))).toBe(4);
  });

  it('returns the mirrored column for the mirror image', () => {
    const book: OpeningBook = new Map();
    addToBook(book, play([0, 1]), 2);
    expect(bookMove(book, play([6, 5]))).toBe(4);
  });

  it('keeps one entry for a position and its mirror image, under the smaller key', () => {
    const book: OpeningBook = new Map();
    addToBook(book, play([0, 1]), 2);
    addToBook(book, play([6, 5]), 4);
    expect(book.size).toBe(1);
    const key = play([0, 1]).key();
    expect([...book.keys()]).toEqual([Math.min(key, mirrorKey(key))]);
  });

  it('stores and returns the column as it is for a position that is its own mirror image', () => {
    const book: OpeningBook = new Map();
    addToBook(book, play([2, 3, 4]), 1);
    expect(bookMove(book, play([2, 3, 4]))).toBe(1);
  });

  it('returns what was stored over many random positions, and their mirror images', () => {
    const random = seededRandom(13);
    const book: OpeningBook = new Map();
    const stored: { moves: number[]; column: number }[] = [];

    for (let game = 0; game < 300; game++) {
      // A short random game, and a random column to store for where it ends.
      const moves = Array.from({ length: 1 + Math.floor(random() * 10) }, () =>
        Math.floor(random() * COLUMNS),
      );
      const column = Math.floor(random() * COLUMNS);
      addToBook(book, play(moves), column);
      stored.push({ moves, column });
    }

    // What the book should return for each key: a later game can reach the
    // same position or its mirror image and replace the column, so the last
    // one stored counts. The mirror image goes first, so that for a position
    // that is its own mirror image the column itself is what remains.
    const expected = new Map<number, number>();
    for (const { moves, column } of stored) {
      expected.set(play(mirrored(moves)).key(), COLUMNS - 1 - column);
      expected.set(play(moves).key(), column);
    }
    for (const { moves } of stored) {
      expect(bookMove(book, play(moves)), moves.join('')).toBe(expected.get(play(moves).key()));
      const mirror = mirrored(moves);
      expect(bookMove(book, play(mirror)), mirror.join('')).toBe(expected.get(play(mirror).key()));
    }
    // Mirror images and repeated positions share entries.
    expect(book.size).toBeLessThan(stored.length);
  });
});

/** A cheap stand-in for `bestMove`: the most central playable column. */
function centralMove(position: Position): number {
  return COLUMN_ORDER.find((column) => position.canPlay(column)) ?? -1;
}

/**
 * Plays every game the book allows from the start, the computer following the
 * book and the opponent trying every move that does not win, and checks that
 * the book has a move for every position on the computer's turn before `depth`.
 * Returns how many such positions it met.
 */
function checkCovered(book: OpeningBook, start: Position, computerStarts: boolean, depth: number): number {
  let met = 0;
  const visit = (position: Position): void => {
    if (position.moves >= depth) return;
    if (position.moves % 2 === (computerStarts ? 0 : 1)) {
      const column = bookMove(book, position);
      expect(column, `no move after ${position.moves} moves`).toBeDefined();
      met++;
      if (position.isWinningMove(column!)) return;
      const next = position.clone();
      next.play(column!);
      visit(next);
    } else {
      for (let column = 0; column < COLUMNS; column++) {
        if (!position.canPlay(column) || position.isWinningMove(column)) continue;
        const next = position.clone();
        next.play(column);
        visit(next);
      }
    }
  };
  visit(start);
  return met;
}

describe('buildBook', () => {
  /** Options with the cheap chooser that records every position it was asked about. */
  function options(computerStarts: boolean, depth: number, asked: Position[]): BookOptions {
    return {
      computerStarts,
      depth,
      chooseMove: (position) => {
        asked.push(position.clone());
        return centralMove(position);
      },
    };
  }

  it('stores nothing with depth 0', () => {
    const book: OpeningBook = new Map();
    buildBook(book, play([]), options(true, 0, []));
    expect(book.size).toBe(0);
  });

  it('stores the first move, then one move for each reply up to mirror images', () => {
    const book: OpeningBook = new Map();
    buildBook(book, play([]), options(true, 3, []));
    // The empty board, then the centre and each of the 7 replies; replies in
    // columns 0 and 6 (and 1 and 5, 2 and 4) are mirror images.
    expect(book.size).toBe(1 + 4);
    for (let reply = 0; reply < COLUMNS; reply++) {
      expect(bookMove(book, play([3, reply]))).toBe(centralMove(play([3, reply])));
    }
  });

  it('covers every position where the computer moves, and stays within the depth', () => {
    for (const computerStarts of [true, false]) {
      const asked: Position[] = [];
      const book: OpeningBook = new Map();
      buildBook(book, play([]), options(computerStarts, 7, asked));
      expect(checkCovered(book, play([]), computerStarts, 7)).toBeGreaterThan(book.size);
      // Each entry was chosen once, always on the computer's turn and before the depth.
      expect(asked).toHaveLength(book.size);
      for (const position of asked) {
        expect(position.moves % 2).toBe(computerStarts ? 0 : 1);
        expect(position.moves).toBeLessThan(7);
      }
    }
  });

  it('chooses nothing again when run a second time with the same book', () => {
    const book: OpeningBook = new Map();
    buildBook(book, play([]), options(false, 6, []));
    const asked: Position[] = [];
    buildBook(book, play([]), options(false, 6, asked));
    expect(asked).toHaveLength(0);
  });

  it('continues a stopped build to the same book as a build in one go', () => {
    const whole: OpeningBook = new Map();
    buildBook(whole, play([]), options(true, 7, []));

    const book: OpeningBook = new Map();
    let stored = 0;
    const stopping: BookOptions = {
      ...options(true, 7, []),
      onStored: () => {
        stored++;
        if (stored === 20) throw new Error('stopped');
      },
    };
    expect(() => buildBook(book, play([]), stopping)).toThrow('stopped');
    expect(book.size).toBe(20);
    buildBook(book, play([]), options(true, 7, []));
    expect(new Map([...book].sort())).toEqual(new Map([...whole].sort()));
  });

  it('stops after the computer wins', () => {
    // X has three in column 0 and the computer (X) is to move: it wins at once.
    const asked: Position[] = [];
    const book: OpeningBook = new Map();
    buildBook(book, play([0, 1, 0, 1, 0, 1]), {
      ...options(true, 20, asked),
      chooseMove: (position) => {
        asked.push(position);
        return 0;
      },
    });
    expect(asked).toHaveLength(1);
  });

  it('skips the moves that win for the opponent', () => {
    // X, the opponent here, is to move and wins in column 0; the other six
    // moves each leave the computer a position to choose in.
    const asked: Position[] = [];
    const book: OpeningBook = new Map();
    buildBook(book, play([0, 1, 0, 1, 0, 1]), options(false, 8, asked));
    expect(asked).toHaveLength(6);
  });
});