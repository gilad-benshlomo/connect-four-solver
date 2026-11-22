/**
 * The flow of a game against the computer, on top of the rules in game.ts:
 * choosing who goes first, whose turn it is, and how the game ended.
 *
 * Every function takes a state and returns the next one, without changing
 * the one it was given. When an action does not apply (a click while the
 * computer is thinking, an answer for a game that was already abandoned)
 * the same state object is returned, so the page can tell nothing changed.
 * Nothing here talks to the solver or the page: the page asks the solver
 * whenever the phase is 'computerTurn' and passes the answer back in.
 */
import { isLegalMove, type Cell } from '../game/board';
import { newGame, playMove, type GameState } from '../game/game';

/** Who made the first move of the current game. */
export type Starter = 'human' | 'computer';

/** How a finished game ended, from the player's point of view. */
export type Result = 'humanWon' | 'computerWon' | 'draw';

/** Where the flow stands. */
export type Phase =
  | { kind: 'choosing' }
  | { kind: 'humanTurn' }
  | { kind: 'computerTurn' }
  | { kind: 'over'; result: Result; line: Cell[] }
  | { kind: 'error'; message: string };

export type Flow = {
  game: GameState;
  /** Who started the current game; null before the first game. */
  starter: Starter | null;
  phase: Phase;
  /**
   * Changes with every new game. The page sends it with each request to the
   * solver and passes it back with the answer; an answer that carries an old
   * id belongs to a game that no longer exists, and is ignored.
   */
  gameId: number;
};

/** The flow when the page opens: no game yet, the player chooses who goes first. */
export function initialFlow(): Flow {
  return { game: newGame(), starter: null, phase: { kind: 'choosing' }, gameId: 0 };
}

/** Starts a new game, with the player or the computer moving first. */
export function startGame(flow: Flow, starter: Starter): Flow {
  return {
    game: newGame(),
    starter,
    phase: starter === 'human' ? { kind: 'humanTurn' } : { kind: 'computerTurn' },
    gameId: flow.gameId + 1,
  };
}

/** Leaves the current game (if any) and goes back to choosing who goes first, on an empty board. */
export function chooseAgain(flow: Flow): Flow {
  return { ...flow, game: newGame(), phase: { kind: 'choosing' }, gameId: flow.gameId + 1 };
}

/**
 * Plays the player's disc in `column`. Ignored unless it is the player's
 * turn and the column has room.
 */
export function humanMove(flow: Flow, column: number): Flow {
  if (flow.phase.kind !== 'humanTurn' || !isLegalMove(flow.game.board, column)) return flow;
  return afterMove(flow, playMove(flow.game, column), 'humanWon', { kind: 'computerTurn' });
}

/**
 * Plays the computer's answer for the game `gameId`. Ignored if that game
 * is no longer the current one, or if it is not the computer's turn. A
 * column that cannot be played means a bug in the solver: the flow stops
 * with an error rather than continue a game that broke the rules.
 */
export function computerMove(flow: Flow, gameId: number, column: number): Flow {
  if (gameId !== flow.gameId || flow.phase.kind !== 'computerTurn') return flow;
  if (!isLegalMove(flow.game.board, column)) {
    return { ...flow, phase: { kind: 'error', message: `The solver chose column ${column}, which cannot be played` } };
  }
  return afterMove(flow, playMove(flow.game, column), 'computerWon', { kind: 'humanTurn' });
}

/** Records that the solver failed for the game `gameId`. Ignored for an old game. */
export function solverFailed(flow: Flow, gameId: number, message: string): Flow {
  if (gameId !== flow.gameId || flow.phase.kind !== 'computerTurn') return flow;
  return { ...flow, phase: { kind: 'error', message } };
}

/** The flow after a move: over if the move ended the game, otherwise `next`. */
function afterMove(flow: Flow, game: GameState, ifWon: Result, next: Phase): Flow {
  const { status } = game;
  if (status.kind === 'won') return { ...flow, game, phase: { kind: 'over', result: ifWon, line: status.line } };
  if (status.kind === 'draw') return { ...flow, game, phase: { kind: 'over', result: 'draw', line: [] } };
  return { ...flow, game, phase: next };
}

/** The columns the player can click now: none unless it is the player's turn. */
export function playableColumns(flow: Flow): number[] {
  if (flow.phase.kind !== 'humanTurn') return [];
  return flow.game.board.flatMap((_, column) => (isLegalMove(flow.game.board, column) ? [column] : []));
}

/** How many moves the player has made in the current game. */
export function humanMoveCount(flow: Flow): number {
  const moves = flow.game.moves.length;
  // The starter made the odd-numbered moves (1st, 3rd, ...).
  return flow.starter === 'human' ? Math.ceil(moves / 2) : Math.floor(moves / 2);
}

/**
 * True if the disc in a cell is the player's. The game names the players by
 * who moved first (X, then O); the player is X only in a game they started.
 */
export function isHumanDisc(flow: Flow, column: number, row: number): boolean {
  const disc = flow.game.board[column][row];
  return disc !== undefined && (disc === 'X') === (flow.starter === 'human');
}
