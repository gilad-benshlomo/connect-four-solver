/**
 * Unit tests for the game state in game.ts.
 */
import { expect, test } from 'vitest';
import { currentPlayer, newGame } from './game';

test('a new game has an empty board, no moves and is in progress', () => {
  const game = newGame();
  expect(game.board.every((column) => column.length === 0)).toBe(true);
  expect(game.moves).toEqual([]);
  expect(game.status).toEqual({ kind: 'playing' });
});

test('X moves first', () => {
  expect(currentPlayer(newGame())).toBe('X');
});

test('the turn alternates with the number of moves', () => {
  // Built by hand for now; playMove will replace this in the next step.
  const game = newGame();
  expect(currentPlayer({ ...game, moves: [3] })).toBe('O');
  expect(currentPlayer({ ...game, moves: [3, 4] })).toBe('X');
});