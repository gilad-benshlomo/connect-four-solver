/**
 * Unit tests for the game state in game.ts.
 * Games are written as a list of columns, X first (see board.test.ts).
 */
import { expect, test } from 'vitest';
import { currentPlayer, newGame, playMove } from './game';

/** Plays a sequence of columns from a new game. */
function playGame(moves: number[]) {
  return moves.reduce((game, column) => playMove(game, column), newGame());
}

// ---------- New game and turns ----------

test('a new game has an empty board, no moves and is in progress', () => {
  const game = newGame();
  expect(game.board.every((column) => column.length === 0)).toBe(true);
  expect(game.moves).toEqual([]);
  expect(game.status).toEqual({ kind: 'playing' });
});

test('X moves first', () => {
  expect(currentPlayer(newGame())).toBe('X');
});

test('the turn alternates after each move', () => {
  expect(currentPlayer(playGame([3]))).toBe('O');
  expect(currentPlayer(playGame([3, 4]))).toBe('X');
});

// ---------- Playing moves ----------

test("playMove drops the current player's disc and records the move", () => {
  const game = playGame([3, 3]);
  expect(game.board[3]).toEqual(['X', 'O']);
  expect(game.moves).toEqual([3, 3]);
});

test('playMove does not modify the original state', () => {
  const before = newGame();
  playMove(before, 3);
  expect(before.moves).toEqual([]);
  expect(before.board[3]).toHaveLength(0);
});

test('the game continues after a move that does not win', () => {
  const game = playGame([0, 0, 1, 1, 2]);
  expect(game.status).toEqual({ kind: 'playing' });
});

test('an illegal column throws', () => {
  expect(() => playMove(newGame(), 7)).toThrow('Illegal move');
});

// ---------- Winning ----------

test('X wins with four in a row', () => {
  //  O O O . . . .
  //  X X X X . . .
  const game = playGame([0, 0, 1, 1, 2, 2, 3]);
  expect(game.status).toMatchObject({ kind: 'won', winner: 'X' });
});

test('O can win too', () => {
  // O stacks four in column 1; X has three in column 0.
  const game = playGame([0, 1, 0, 1, 0, 1, 6, 1]);
  expect(game.status).toMatchObject({ kind: 'won', winner: 'O' });
});

test('no moves are allowed after a win', () => {
  const game = playGame([0, 0, 1, 1, 2, 2, 3]);
  expect(() => playMove(game, 4)).toThrow('Game is over');
});
// ---------- Full board ----------
// Both games fill all 42 cells. Each was built so that no four in a row
// appears before the last move. Drawings: top line is row 5, the top row.

test('a full board with no winner is a draw', () => {
  //  O O X O O X O
  //  X X O X X O X
  //  O O X O O X O
  //  X X O X X O X
  //  O O X O O X O
  //  X X O X X O X
  const game = playGame([
    0, 0, 0, 0, 0, 0,
    1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1,
    3, 3, 3, 3, 3, 3,
    4, 5, 5, 4, 4, 5, 5, 4, 4, 5, 5, 4,
    6, 6, 6, 6, 6, 6,
  ]);
  expect(game.status).toEqual({ kind: 'draw' });
});

test('a win on the last move counts as a win, not a draw', () => {
  //  O X X O O O o    o = last move: completes four O and fills the board
  //  X X O X X O X
  //  O O X O O X O
  //  X X O X X O X
  //  O O X O O X O
  //  X X O X X O X
  const game = playGame([
    0, 0, 0, 0, 0, 0,
    3, 3, 3, 3, 3, 3,
    4, 4, 4, 4, 4, 4,
    1, 2, 2, 1, 1, 2, 2, 1, 1, 5, 1, 2, 5, 5, 5, 5, 2, 5,
    6, 6, 6, 6, 6, 6,
  ]);
  expect(game.moves).toHaveLength(42);
  expect(game.status).toMatchObject({ kind: 'won', winner: 'O' });
});