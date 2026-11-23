import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from '../game/board';
import { RULES_EXAMPLE_MOVES, rulesExample } from './rulesExample';

describe('rulesExample', () => {
  const example = rulesExample();

  it('ends with four in a diagonal: each cell one column and one row on from the last', () => {
    const line = [...example.line].sort((a, b) => a.column - b.column);
    expect(line).toHaveLength(4);
    for (let i = 1; i < line.length; i++) {
      expect(Math.abs(line[i].column - line[i - 1].column)).toBe(1);
      expect(Math.abs(line[i].row - line[i - 1].row)).toBe(1);
    }
    // All steps go the same way up or down, so it is one straight diagonal.
    const rising = line[1].row > line[0].row;
    for (let i = 1; i < line.length; i++) expect(line[i].row > line[i - 1].row).toBe(rising);
  });

  it("marks the four winning cells as the winner's discs", () => {
    for (const { column, row } of example.line) expect(example.cells[column][row]).toBe('winner');
  });

  it('holds every move once, on a full-size board', () => {
    expect(example.cells).toHaveLength(COLUMNS);
    for (const column of example.cells) expect(column).toHaveLength(ROWS);
    const discs = example.cells.flat().filter((cell) => cell !== 'empty');
    expect(discs).toHaveLength(RULES_EXAMPLE_MOVES.length);
  });

  it('gives each player half the discs, as in a game the winner did not start', () => {
    const cells = example.cells.flat();
    const winner = cells.filter((cell) => cell === 'winner').length;
    const other = cells.filter((cell) => cell === 'other').length;
    expect(winner).toBe(other);
  });
});
