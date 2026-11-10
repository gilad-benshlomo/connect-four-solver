/**
 * Game state on top of the board: the move history, whose turn it is,
 * and whether the game is over. The UI talks to this layer only.
 */
import {
    createBoard,
    dropDisc,
    isBoardFull,
    winningLine,
    type Board,
    type Cell,
    type Player,
} from './board';

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

/**
 * Plays the current player's disc in `column` and returns the new state.
 * The given state is never changed.
 * @throws if the game is over or the column is not a legal move.
 */
export function playMove(state: GameState, column: number): GameState {
    if (state.status.kind !== 'playing') {
        throw new Error('Game is over');
    }
    const player = currentPlayer(state);
    // dropDisc checks that the column is legal, and throws if it is not.
    const board = dropDisc(state.board, column, player);
    return {
        board,
        moves: [...state.moves, column],
        status: statusAfterMove(board, column, player),
    };
}

/**
 * The status after `player` dropped a disc in `column`.
 * The win check comes first: the 42nd disc can fill the board and win.
 */
function statusAfterMove(board: Board, column: number, player: Player): GameStatus {
    const line = winningLine(board, column);
    if (line) return { kind: 'won', winner: player, line };
    if (isBoardFull(board)) return { kind: 'draw' };
    return { kind: 'playing' };;
}