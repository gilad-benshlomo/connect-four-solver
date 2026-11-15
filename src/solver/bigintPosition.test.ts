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
});