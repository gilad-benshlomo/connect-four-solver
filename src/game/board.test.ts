/**
 * Unit tests for the board and rules in board.ts.
 *
 * Conventions:
 * - Games are written as a list of columns: play([3, 3, 4]) means
 *   X plays column 3, O plays column 3, X plays column 4. X always starts.
 * - In the drawings, the bottom line is row 0.
 */
import { expect, test } from 'vitest';
import { COLUMNS, ROWS, createBoard, dropDisc, isBoardFull, isLegalMove, winningLine } from './board';

// ---------- Helpers ----------

/** Plays a sequence of columns, X first, alternating. */
function play(moves: number[]) {
  let board = createBoard();
  moves.forEach((column, i) => {
    board = dropDisc(board, column, i % 2 === 0 ? 'X' : 'O');
  });
  return board;
}

/** A board where only `column` is full, with alternating discs. */
function fullColumnBoard(column: number) {
  let board = createBoard();
  for (let i = 0; i < ROWS; i++) {
    board = dropDisc(board, column, i % 2 === 0 ? 'X' : 'O');
  }
  return board;
}

/**
 * A board with every cell taken, filled column by column.
 * It is not a reachable game position (it contains several wins),
 * which is fine: isBoardFull only counts discs.
 */
function fillBoard() {
  let board = createBoard();
  for (let column = 0; column < COLUMNS; column++) {
    for (let i = 0; i < ROWS; i++) {
      board = dropDisc(board, column, i % 2 === 0 ? 'X' : 'O');
    }
  }
  return board;
}

// ---------- Empty board ----------

test('a new board has 7 empty columns', () => {
  const board = createBoard();
  expect(board).toHaveLength(COLUMNS);
  expect(board.every((column) => column.length === 0)).toBe(true);
});

test('columns are independent of each other', () => {
  // Guards against new Array(7).fill([]), where all columns are one array.
  const board = createBoard();
  board[0].push('X');
  expect(board[1]).toHaveLength(0);
});

// ---------- Dropping discs and legal moves ----------

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

// ---------- Win detection ----------
// In every game below, nobody has won before the last move.

test('detects a horizontal win and returns its cells', () => {
  //  O O O . . . .
  //  X X X X . . .
  const board = play([0, 0, 1, 1, 2, 2, 3]);
  const line = winningLine(board, 3);
  expect(line).toHaveLength(4);
  // arrayContaining: the order of the cells does not matter.
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
  //  . . . X . . .
  //  . . X X . . .
  //  . X O O . . .
  //  X O O X . . O
  const board = play([0, 1, 1, 2, 3, 2, 2, 3, 3, 6, 3]);
  expect(winningLine(board, 3)).toHaveLength(4);
});

test('detects a \\ diagonal win', () => {
  // Mirror image of the / test.
  //  . . . X . . .
  //  . . . X X . .
  //  . . . O O X .
  //  O . . X O O X
  const board = play([6, 5, 5, 4, 3, 4, 4, 3, 3, 0, 3]);
  expect(winningLine(board, 3)).toHaveLength(4);
});

test('detects a win when the last disc fills the middle of the line', () => {
  //  O O . O . . .
  //  X X x X . . .    x = last move
  const board = play([0, 0, 1, 1, 3, 3, 2]);
  expect(winningLine(board, 2)).toHaveLength(4);
});

test('returns every cell of a line longer than four', () => {
  //  O O . O O . .
  //  X X x X X . .    x = last move
  const board = play([0, 0, 1, 1, 3, 3, 4, 4, 2]);
  expect(winningLine(board, 2)).toHaveLength(5);
});

test('three in a row is not a win', () => {
  const board = play([0, 0, 1, 1, 2]);
  expect(winningLine(board, 2)).toBeNull();
});

test("an opponent's disc breaks the line", () => {
  //  X O X X . . O    only two X in a row
  const board = play([0, 1, 2, 6, 3]);
  expect(winningLine(board, 3)).toBeNull();
});

test('an empty column has no winning line', () => {
  expect(winningLine(createBoard(), 0)).toBeNull();
});

// ---------- Full board ----------

test('an empty board is not full', () => {
  expect(isBoardFull(createBoard())).toBe(false);
});

test('one full column does not make the board full', () => {
  expect(isBoardFull(fullColumnBoard(0))).toBe(false);
});

test('a board with every cell taken is full', () => {
  expect(isBoardFull(fillBoard())).toBe(true);
});

test('a board missing a single disc is not full', () => {
  // 41 discs: the boundary just below a full board.
  const almost = fillBoard().map((discs, index) =>
    index === 6 ? discs.slice(0, -1) : discs,
  );
  expect(isBoardFull(almost)).toBe(false);
});