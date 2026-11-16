import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS, createBoard, dropDisc, isLegalMove, winningLine, type Board, type Player } from '../game/board';
import { BigIntPosition } from './bigintPosition';
import { PairPosition } from './pairPosition';

/** The type of the boards under test. */
type TestPosition = BigIntPosition | PairPosition;

/** A board implementation: its name in the test report, and how to make an empty one. */
type Implementation = { name: string; create: () => TestPosition };

/** Every test below runs once for each implementation in this list. */
const IMPLEMENTATIONS: Implementation[] = [
  { name: 'BigIntPosition', create: () => new BigIntPosition() },
  { name: 'PairPosition', create: () => new PairPosition() },
];

/** Builds a position by playing the given columns in order. */
function play(create: () => TestPosition, columns: number[]): TestPosition {
  const position = create();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

/** Returns a list that repeats one column the given number of times. */
function repeat(column: number, times: number): number[] {
  return new Array<number>(times).fill(column);
}

/** Returns every column in which the player to move would win right away. */
function winningMoves(position: TestPosition): number[] {
  const winning: number[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column) && position.isWinningMove(column)) {
      winning.push(column);
    }
  }
  return winning;
}

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

/** Returns the columns that still have room. */
function playableColumns(position: TestPosition): number[] {
  const columns: number[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column)) {
      columns.push(column);
    }
  }
  return columns;
}

for (const { name, create } of IMPLEMENTATIONS) {
  describe(name, () => {
    it('starts empty, with every column playable', () => {
      const position = create();
      expect(position.moves).toBe(0);
      for (let column = 0; column < COLUMNS; column++) {
        expect(position.canPlay(column)).toBe(true);
      }
    });

    it('counts the moves played', () => {
      expect(play(create, [3, 3, 2]).moves).toBe(3);
    });

    it('keeps a column playable until its last cell is filled', () => {
      expect(play(create, repeat(3, ROWS - 1)).canPlay(3)).toBe(true);
    });

    it('makes a column unplayable once it is full', () => {
      expect(play(create, repeat(3, ROWS)).canPlay(3)).toBe(false);
    });

    it('fills each column without affecting the others', () => {
      for (let column = 0; column < COLUMNS; column++) {
        const position = play(create, repeat(column, ROWS));
        for (let other = 0; other < COLUMNS; other++) {
          expect(position.canPlay(other)).toBe(other !== column);
        }
      }
    });

    it('has no winning move on an empty board', () => {
      expect(winningMoves(create())).toEqual([]);
    });

    it('finds a vertical win', () => {
      // X has three in column 0; O has three in column 1.
      expect(winningMoves(play(create, [0, 1, 0, 1, 0, 1]))).toEqual([0]);
    });

    it('finds a horizontal win', () => {
      // X has columns 0-2 on the bottom row; O has columns 0-2 on the row above.
      expect(winningMoves(play(create, [0, 0, 1, 1, 2, 2]))).toEqual([3]);
    });

    it('finds a diagonal win going up', () => {
      // X holds (0,0), (1,1), (2,2) and wins at (3,3); the rest are fillers.
      expect(winningMoves(play(create, [0, 1, 1, 2, 5, 2, 2, 3, 6, 3, 6, 3]))).toEqual([3]);
    });

    it('finds a diagonal win going down', () => {
      // The mirror image of the previous board.
      expect(winningMoves(play(create, [6, 5, 5, 4, 1, 4, 4, 3, 0, 3, 0, 3]))).toEqual([3]);
    });

    it('does not join the top of one column to the bottom of the next', () => {
      // X holds rows 3-5 of column 0 and row 0 of column 1. Without the helper
      // row, X's disc at row 1 of column 1 would look like a vertical four.
      expect(winningMoves(play(create, [1, 0, 6, 0, 6, 0, 0, 5, 0, 5, 0, 6]))).toEqual([]);
    });

    it('gives the same key to the same position reached in a different order', () => {
      expect(play(create, [3, 2, 4]).key()).toBe(play(create, [4, 2, 3]).key());
    });

    it('gives different keys when the same cells belong to different players', () => {
      // X in column 3 and O in column 4, versus the other way round.
      expect(play(create, [3, 4]).key()).not.toBe(play(create, [4, 3]).key());
    });

    it('gives one key per position over many random games', () => {
      const random = seededRandom(1);
      const boardByKey = new Map<number, string>();
      const keyByBoard = new Map<string, number>();

      for (let game = 0; game < 200; game++) {
        const position = create();
        // A plain description of the board, kept alongside the bitboard.
        const columns: string[][] = Array.from({ length: COLUMNS }, () => []);

        while (position.moves < COLUMNS * ROWS) {
          const choices = playableColumns(position);
          const column = choices[Math.floor(random() * choices.length)];
          columns[column].push(position.moves % 2 === 0 ? 'X' : 'O');
          position.play(column);

          const board = JSON.stringify(columns);
          const key = position.key();
          // One key never stands for two boards, and one board never gets two keys.
          expect(boardByKey.get(key) ?? board).toBe(board);
          expect(keyByBoard.get(board) ?? key).toBe(key);
          boardByKey.set(key, board);
          keyByBoard.set(board, key);
        }
      }
    });
  });
}

for (const { name, create } of IMPLEMENTATIONS) {
  describe(`${name} against the game board`, () => {
    it('agrees on legal and winning moves over many random games', () => {
      const random = seededRandom(2);
      let positionsChecked = 0;
      let winsFound = 0;

      for (let game = 0; game < 500; game++) {
        const position = create();
        let board: Board = createBoard();
        let player: Player = 'X';

        while (true) {
          // Ask both boards the same questions about every column.
          for (let column = 0; column < COLUMNS; column++) {
            const legal = isLegalMove(board, column);
            expect(position.canPlay(column)).toBe(legal);
            if (legal) {
              const wins = winningLine(dropDisc(board, column, player), column) !== null;
              expect(position.isWinningMove(column)).toBe(wins);
              if (wins) winsFound++;
            }
          }
          positionsChecked++;

          const choices = playableColumns(position);
          if (choices.length === 0) break; // the board is full
          const column = choices[Math.floor(random() * choices.length)];
          const won = position.isWinningMove(column);
          board = dropDisc(board, column, player);
          position.play(column);
          player = player === 'X' ? 'O' : 'X';
          if (won) break; // the game is over
        }
      }

      // Make sure the test really covered a lot of positions and wins.
      expect(positionsChecked).toBeGreaterThan(5000);
      expect(winsFound).toBeGreaterThan(1000);
    });
  });
}

for (const { name, create } of IMPLEMENTATIONS) {
  describe(`${name}.clone`, () => {
    it('copies the position exactly', () => {
      const copy = play(create, [3, 2, 4]).clone();
      expect(copy.moves).toBe(3);
      expect(copy.key()).toBe(play(create, [3, 2, 4]).key());
    });

    it('keeps the copy and the original independent', () => {
      const original = play(create, [3, 3]);
      const copy = original.clone();

      copy.play(2);
      expect(original.key()).toBe(play(create, [3, 3]).key());
      expect(original.moves).toBe(2);

      original.play(4);
      expect(copy.key()).toBe(play(create, [3, 3, 2]).key());
      expect(copy.moves).toBe(3);
    });
  });
}