import { expect, test } from 'vitest';
import { COLUMNS, ROWS, createBoard, dropDisc, isLegalMove } from './board';

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
function fullColumnBoard(column: number) {
  let board = createBoard();
  for (let i = 0; i < ROWS; i++) {
    board = dropDisc(board, column, i % 2 === 0 ? 'X' : 'O');
  }
  return board;
}

test('discs stack from the bottom up', () => {
  let board = createBoard();
  board = dropDisc(board, 3, 'X');
  board = dropDisc(board, 3, 'O');
  expect(board[3]).toEqual(['X', 'O']);
});

test('dropDisc does not modify the original board', () => {
  const before = createBoard();
  dropDisc(before, 3, 'X');
  expect(before[3]).toHaveLength(0);
});

test('a column is legal until it is full', () => {
  expect(isLegalMove(createBoard(), 2)).toBe(true);
  expect(isLegalMove(fullColumnBoard(2), 2)).toBe(false);
});

test('columns outside the board are illegal', () => {
  const board = createBoard();
  expect(isLegalMove(board, -1)).toBe(false);
  expect(isLegalMove(board, COLUMNS)).toBe(false);
  expect(isLegalMove(board, 1.5)).toBe(false);
});

test('dropDisc throws on a full column', () => {
  const board = fullColumnBoard(2);
  expect(() => dropDisc(board, 2, 'X')).toThrow('Illegal move');
});