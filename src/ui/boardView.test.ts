import { describe, expect, it } from 'vitest';
import { addsOneMove } from './boardView';

describe('addsOneMove', () => {
  it('is true for one more move in the same game', () => {
    expect(addsOneMove([], [3])).toBe(true);
    expect(addsOneMove([3, 3], [3, 3, 2])).toBe(true);
  });

  it('is false for the same moves, fewer moves, or two more', () => {
    expect(addsOneMove([3], [3])).toBe(false);
    expect(addsOneMove([3, 2], [3])).toBe(false);
    expect(addsOneMove([3], [3, 2, 1])).toBe(false);
  });

  it('is false for a different game of the next length', () => {
    expect(addsOneMove([3], [4, 2])).toBe(false);
    expect(addsOneMove([3, 2], [3, 4, 2])).toBe(false);
  });
});
