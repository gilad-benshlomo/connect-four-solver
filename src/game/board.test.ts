import { expect, test } from 'vitest';
import { COLUMNS, createBoard } from './board';

test('a new board has 7 empty columns', () => {
  const board = createBoard();
  expect(board).toHaveLength(COLUMNS);
  expect(board.every((column) => column.length === 0)).toBe(true);
});

test('columns are independent of each other', () => {
  const board = createBoard();
  board[0].push('X');
  expect(board[1]).toHaveLength(0);
});