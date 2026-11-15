import { describe, expect, it } from 'vitest';
import { BigIntPosition } from './bigintPosition';
import { negamax } from './negamax';

/** Builds a position by playing the given columns in order. */
function play(columns: number[]): BigIntPosition {
  const position = new BigIntPosition();
  for (const column of columns) {
    position.play(column);
  }
  return position;
}

describe('negamax', () => {
  it('scores a win with the fourth disc as 18', () => {
    // X has three in column 0 and wins with its 4th disc: 22 - 4.
    expect(negamax(play([0, 1, 0, 1, 0, 1]))).toBe(18);
  });

  it('scores a position that cannot be saved as a loss', () => {
    // X has columns 1-3 on the bottom row, with both ends open. O can block
    // only one end, and X wins with its 4th disc: -(22 - 4).
    expect(negamax(play([1, 1, 2, 2, 3]))).toBe(-18);
  });

  it('scores a win with the last disc of the game as 1', () => {
    // 41 moves played; O's 21st disc, the last cell on the board, wins: 22 - 21.
    expect(
      negamax(play([
        5, 3, 2, 2, 4, 2, 1, 0, 4, 6, 0, 2, 1, 0, 6, 5, 4, 1, 1, 1, 0,
        5, 5, 5, 5, 1, 2, 3, 3, 6, 6, 3, 3, 3, 0, 4, 0, 6, 6, 2, 4,
      ])),
    ).toBe(1);
  });

  it('scores a draw as 0', () => {
    // Six moves left; with perfect play the board fills up with no winner.
    expect(
      negamax(play([
        0, 1, 4, 5, 6, 6, 6, 6, 0, 3, 3, 4, 5, 1, 1, 4, 5, 1,
        6, 6, 4, 4, 2, 2, 3, 0, 4, 5, 2, 2, 1, 3, 2, 3, 3, 5,
      ])),
    ).toBe(0);
  });

    it('scores a draw as exactly 0 when an odd number of moves is left', () => {
    // The same game one move later: five moves are left. Every level of the
    // search flips the sign, and in JavaScript -0 is a separate value from 0.
    expect(
      negamax(play([
        0, 1, 4, 5, 6, 6, 6, 6, 0, 3, 3, 4, 5, 1, 1, 4, 5, 1,
        6, 6, 4, 4, 2, 2, 3, 0, 4, 5, 2, 2, 1, 3, 2, 3, 3, 5, 0,
      ])),
    ).toBe(0);
  });
});