/**
 * The small board shown next to the rules on wide screens: a game that ends
 * with four discs in a diagonal. It is worked out by playing the moves through
 * the game's own rules, so the picture can never show a win the rules would
 * not count.
 */
import { COLUMNS, ROWS } from '../game/board';
import { newGame, playMove } from '../game/game';

/** The moves of the example game, as columns 0–6; the last one completes a diagonal. */
export const RULES_EXAMPLE_MOVES: readonly number[] = [4, 3, 3, 4, 4, 1, 2, 2, 5, 3, 0, 4];

/** What a cell of the example shows: empty, one of the winner's discs, or one of the other player's. */
export type ExampleCell = 'empty' | 'winner' | 'other';

/** The example board: `cells[column][row]`, row 0 at the bottom, and the four winning cells. */
export type RulesExample = {
  cells: ExampleCell[][];
  line: { column: number; row: number }[];
};

/**
 * Plays `RULES_EXAMPLE_MOVES` and returns the board it ends with, the winner's
 * discs told apart from the other player's.
 *
 * @throws if the moves do not end in a win (the example would show nothing)
 */
export function rulesExample(): RulesExample {
  let state = newGame();
  for (const column of RULES_EXAMPLE_MOVES) state = playMove(state, column);
  const status = state.status;
  if (status.kind !== 'won') throw new Error('The rules example must end in a win');
  const cells: ExampleCell[][] = [];
  for (let column = 0; column < COLUMNS; column++) {
    cells.push([]);
    for (let row = 0; row < ROWS; row++) {
      const disc = state.board[column][row];
      cells[column].push(disc === undefined ? 'empty' : disc === status.winner ? 'winner' : 'other');
    }
  }
  return { cells, line: status.line.map(({ column, row }) => ({ column, row })) };
}
