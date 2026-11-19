/**
 * A fixed-size table that remembers one small number per position, so the
 * search can reuse what it has already worked out about a position reached
 * again through a different order of moves.
 *
 * Each key goes to one slot: `key % size`. A newer entry overwrites an older
 * one in the same slot; that is safe, because the table only saves work.
 *
 * Only the low 32 bits of each key are stored, which saves memory. They still
 * identify the key exactly: two keys in the same slot differ by a multiple of
 * `size`, two keys with the same low 32 bits differ by a multiple of 2^32, and
 * since `size` is odd, both together mean a multiple of `size * 2^32`. With
 * `size` above 2^17 that is more than 2^49, larger than any key, so the two
 * keys are the same.
 */
export class TranspositionTable {
  /** Number of slots. */
  readonly size: number;

  /** The low 32 bits of the key stored in each slot. */
  private readonly keys: Uint32Array;

  /** The value stored in each slot, from 1 to 255; 0 means empty. */
  private readonly values: Uint8Array;

  /**
   * Creates an empty table with `size` slots (5 bytes each).
   * `size` must be odd and larger than 2^17 (see above); a prime spreads
   * the keys best.
   */
  constructor(size: number) {
    if (!Number.isInteger(size) || size <= 2 ** 17 || size % 2 === 0) {
      throw new RangeError(`table size must be an odd integer above 2^17, got ${size}`);
    }
    this.size = size;
    this.keys = new Uint32Array(size);
    this.values = new Uint8Array(size);
  }

  /** Stores a value from 1 to 255 for the key, replacing whatever was in its slot. */
  put(key: number, value: number): void {
    const slot = key % this.size;
    this.keys[slot] = key; // a Uint32Array keeps only the low 32 bits
    this.values[slot] = value;
  }

  /** Returns the value stored for the key, or 0 if the table does not have it. */
  get(key: number): number {
    const slot = key % this.size;
    // `>>> 0` keeps the low 32 bits, as stored. An empty slot holds the value 0.
    return this.keys[slot] === key >>> 0 ? this.values[slot] : 0;
  }

  /** Empties the table. */
  clear(): void {
    this.keys.fill(0);
    this.values.fill(0);
  }
}