import { describe, expect, it } from 'vitest';
import { TranspositionTable } from './transpositionTable';

/** A small valid size (a prime just above 2^17), so the tests stay fast. */
const SIZE = 131_101;

/** The largest key a position can have is below 2^49. */
const LARGE_KEY = 2 ** 49 - 12_345;

describe('TranspositionTable', () => {
  it('returns 0 for a key that was never stored', () => {
    expect(new TranspositionTable(SIZE).get(12_345)).toBe(0);
  });

  it('returns the value stored for a key', () => {
    const table = new TranspositionTable(SIZE);
    table.put(12_345, 7);
    expect(table.get(12_345)).toBe(7);
  });

  it('replaces the value when the same key is stored again', () => {
    const table = new TranspositionTable(SIZE);
    table.put(12_345, 7);
    table.put(12_345, 9);
    expect(table.get(12_345)).toBe(9);
  });

  it('forgets an older key when a newer one takes its slot', () => {
    const table = new TranspositionTable(SIZE);
    table.put(12_345, 7);
    table.put(12_345 + SIZE, 9); // the same slot
    expect(table.get(12_345 + SIZE)).toBe(9);
    // The old key must not get the new key's value.
    expect(table.get(12_345)).toBe(0);
  });

  it('tells apart keys that differ only above the low 32 bits', () => {
    const table = new TranspositionTable(SIZE);
    table.put(12_345, 7);
    expect(table.get(12_345 + 2 ** 32)).toBe(0);
    expect(table.get(12_345 + 2 ** 40)).toBe(0);
  });

  it('stores keys of up to 49 bits', () => {
    const table = new TranspositionTable(SIZE);
    table.put(LARGE_KEY, 7);
    expect(table.get(LARGE_KEY)).toBe(7);
    expect(table.get(LARGE_KEY - 2 ** 32)).toBe(0);
  });

  it('is empty again after clear', () => {
    const table = new TranspositionTable(SIZE);
    table.put(12_345, 7);
    table.put(LARGE_KEY, 9);
    table.clear();
    expect(table.get(12_345)).toBe(0);
    expect(table.get(LARGE_KEY)).toBe(0);
  });

  it('refuses sizes that could mix up two keys', () => {
    expect(() => new TranspositionTable(2 ** 17 - 1)).toThrow(RangeError); // too small
    expect(() => new TranspositionTable(SIZE + 1)).toThrow(RangeError); // even
  });
});