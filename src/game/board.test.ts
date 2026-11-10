import { expect, test } from 'vitest';
import { COLUMNS, ROWS, createBoard, dropDisc, isLegalMove, winningLine } from './board';

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
// Plays a sequence of columns, X first, alternating.
function play(moves: number[]) {
  let board = createBoard();
  moves.forEach((column, i) => {
    board = dropDisc(board, column, i % 2 === 0 ? 'X' : 'O');
  });
  return board;
}

test('detects a horizontal win and returns its cells', () => {
  const board = play([0, 0, 1, 1, 2, 2, 3]);
  const line = winningLine(board, 3);
  expect(line).toHaveLength(4);
  expect(line).toEqual(
    expect.arrayContaining([
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 3, row: 0 },
    ]),
  );
});

test('detects a vertical win', () => {
  const board = play([0, 1, 0, 1, 0, 1, 0]);
  expect(winningLine(board, 0)).toHaveLength(4);
});

test('detects a / diagonal win', () => {
  // X at (0,0), (1,1), (2,2), (3,3)
  const board = play([0, 1, 1, 2, 3, 2, 2, 3, 3, 6, 3]);
  expect(winningLine(board, 3)).toHaveLength(4);
});

test('detects a \\ diagonal win', () => {
  // Mirror image: X at (6,0), (5,1), (4,2), (3,3)
  const board = play([6, 5, 5, 4, 3, 4, 4, 3, 3, 0, 3]);
  expect(winningLine(board, 3)).toHaveLength(4);
});

test('detects a win when the last disc fills the middle of the line', () => {
  // X X _ X  ->  X plays column 2
  const board = play([0, 0, 1, 1, 3, 3, 2]);
  expect(winningLine(board, 2)).toHaveLength(4);
});

test('returns every cell of a line longer than four', () => {
  // X X _ X X  ->  X plays column 2
  const board = play([0, 0, 1, 1, 3, 3, 4, 4, 2]);
  expect(winningLine(board, 2)).toHaveLength(5);
});

test('three in a row is not a win', () => {
  const board = play([0, 0, 1, 1, 2]);
  expect(winningLine(board, 2)).toBeNull();
});

test("an opponent's disc breaks the line", () => {
  // X O X X  ->  only two in a row
  const board = play([0, 1, 2, 6, 3]);
  expect(winningLine(board, 3)).toBeNull();
});

test('an empty column has no winning line', () => {
  expect(winningLine(createBoard(), 0)).toBeNull();
});