import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { BigIntPosition } from './bigintPosition';

/** Builds a position by playing the given columns in order. */
function play(columns: number[]): BigIntPosition {
  const position = new BigIntPosition();
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
function winningMoves(position: BigIntPosition): number[] {
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
function playableColumns(position: BigIntPosition): number[] {
  const columns: number[] = [];
  for (let column = 0; column < COLUMNS; column++) {
    if (position.canPlay(column)) {
      columns.push(column);
    }
  }
  return columns;
}

describe('BigIntPosition', () => {
  it('starts empty, with every column playable', () => {
    const position = new BigIntPosition();
    expect(position.moves).toBe(0);
    for (let column = 0; column < COLUMNS; column++) {
      expect(position.canPlay(column)).toBe(true);
    }
  });

  it('counts the moves played', () => {
    expect(play([3, 3, 2]).moves).toBe(3);
  });

  it('keeps a column playable until its last cell is filled', () => {
    expect(play(repeat(3, ROWS - 1)).canPlay(3)).toBe(true);
  });

  it('makes a column unplayable once it is full', () => {
    expect(play(repeat(3, ROWS)).canPlay(3)).toBe(false);
  });

  it('fills each column without affecting the others', () => {
    for (let column = 0; column < COLUMNS; column++) {
      const position = play(repeat(column, ROWS));
      for (let other = 0; other < COLUMNS; other++) {
        expect(position.canPlay(other)).toBe(other !== column);
      }
    }
  });

  it('has no winning move on an empty board', () => {
    expect(winningMoves(new BigIntPosition())).toEqual([]);
  });

  it('finds a vertical win', () => {
    // X has three in column 0; O has three in column 1.
    expect(winningMoves(play([0, 1, 0, 1, 0, 1]))).toEqual([0]);
  });

  it('finds a horizontal win', () => {
    // X has columns 0-2 on the bottom row; O has columns 0-2 on the row above.
    expect(winningMoves(play([0, 0, 1, 1, 2, 2]))).toEqual([3]);
  });

  it('finds a diagonal win going up', () => {
    // X holds (0,0), (1,1), (2,2) and wins at (3,3); the rest are fillers.
    expect(winningMoves(play([0, 1, 1, 2, 5, 2, 2, 3, 6, 3, 6, 3]))).toEqual([3]);
  });

  it('finds a diagonal win going down', () => {
    // The mirror image of the previous board.
    expect(winningMoves(play([6, 5, 5, 4, 1, 4, 4, 3, 0, 3, 0, 3]))).toEqual([3]);
  });

  it('does not join the top of one column to the bottom of the next', () => {
    // X holds rows 3-5 of column 0 and row 0 of column 1. Without the helper
    // row, X's disc at row 1 of column 1 would look like a vertical four.
    expect(winningMoves(play([1, 0, 6, 0, 6, 0, 0, 5, 0, 5, 0, 6]))).toEqual([]);
  });

  it('gives the same key to the same position reached in a different order', () => {
    expect(play([3, 2, 4]).key()).toBe(play([4, 2, 3]).key());
  });

  it('gives different keys when the same cells belong to different players', () => {
    // X in column 3 and O in column 4, versus the other way round.
    expect(play([3, 4]).key()).not.toBe(play([4, 3]).key());
  });

  it('gives one key per position over many random games', () => {
    const random = seededRandom(1);
    const boardByKey = new Map<number, string>();
    const keyByBoard = new Map<string, number>();

    for (let game = 0; game < 200; game++) {
      const position = new BigIntPosition();
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