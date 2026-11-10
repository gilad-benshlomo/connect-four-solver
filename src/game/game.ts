/**
 * Game state on top of the board: the move history, whose turn it is,
 * and whether the game is over. The UI talks to this layer only.
 */
import { createBoard, type Board, type Cell, type Player } from './board';

/** Where the game stands. Only a won game has a winner and a line. */
export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'won'; winner: Player; line: Cell[] }
  | { kind: 'draw' };

export type GameState = {
  board: Board;
  /** Columns played so far, in order. This is what the solver receives. */
  moves: number[];
  status: GameStatus;
};

/** Returns a new game with an empty board. X always moves first. */
export function newGame(): GameState {
  return { board: createBoard(), moves: [], status: { kind: 'playing' } };
}

/**
 * The player whose turn it is. Derived from the number of moves rather
 * than stored, so it can never disagree with the history.
 */
export function currentPlayer(state: GameState): Player {
  return state.moves.length % 2 === 0 ? 'X' : 'O';
}