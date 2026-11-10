/**
 * Connect Four board and rules.
 *
 * The board is a list of 7 columns. Each column lists its discs from the
 * bottom up, so dropping a disc just adds it to the end of a column.
 * The game and the UI use this simple form; the solver keeps its own,
 * faster bitboard (see docs/JOURNEY.md, decision D7).
 */

export const COLUMNS = 7;
export const ROWS = 6;

/** The two players. Colours are chosen by the UI, not here. */
export type Player = 'X' | 'O';

/** board[column][row]; row 0 is the bottom of the column. */
export type Board = Player[][];

/** A position on the board, used to report winning lines. */
export type Cell = { column: number; row: number };

/** Returns a new, empty board. */
export function createBoard(): Board {
  // The callback runs once per column, so every column is a separate array.
  // (new Array(7).fill([]) would make all 7 columns the same array.)
  return Array.from({ length: COLUMNS }, () => []);
}

/** True if `column` exists on the board and still has room for a disc. */
export function isLegalMove(board: Board, column: number): boolean {
  return (
    Number.isInteger(column) &&
    column >= 0 &&
    column < COLUMNS &&
    board[column].length < ROWS
  );
}

/**
 * Drops a disc into a column and returns the resulting board.
 * The original board is never changed (decision D8).
 * @throws if the move is illegal.
 */
export function dropDisc(board: Board, column: number, player: Player): Board {
  if (!isLegalMove(board, column)) {
    throw new Error(`Illegal move: column ${column}`);
  }
  // Only the played column is copied. The other columns are shared with the
  // old board, which is safe because a column is never modified in place.
  return board.map((discs, index) =>
    index === column ? [...discs, player] : discs,
  );
}

// The four line directions, as [column step, row step].
// Each one is also walked backwards, which covers the other four.
const DIRECTIONS = [
  [1, 0], // horizontal
  [0, 1], // vertical
  [1, 1], // diagonal /
  [1, -1], // diagonal \
] as const;

/** The player in a cell, or undefined if the cell is empty or off the board. */
function playerAt(board: Board, column: number, row: number): Player | undefined {
  // ?. turns an off-board column into undefined instead of an error,
  // so the search in winningLine needs no explicit edge checks.
  return board[column]?.[row];
}

/**
 * Checks whether the top disc in `column` (the last one played there)
 * is part of four or more in a row.
 * Only the last disc needs checking: any new line must include it.
 * @returns every cell of the line (for highlighting), or null if there is none.
 */
export function winningLine(board: Board, column: number): Cell[] | null {
  const row = board[column].length - 1;
  const player = board[column][row];
  if (player === undefined) return null; // empty column

  for (const [dc, dr] of DIRECTIONS) {
    const line: Cell[] = [{ column, row }];
    // Count both ways from the disc, so a disc that fills the middle
    // of a line (X X _ X) is found as well.
    for (const sign of [1, -1]) {
      let c = column + sign * dc;
      let r = row + sign * dr;
      while (playerAt(board, c, r) === player) {
        line.push({ column: c, row: r });
        c += sign * dc;
        r += sign * dr;
      }
    }
    // At least four: a single move can complete a line of five or more.
    if (line.length >= 4) return line;
  }
  return null;
}

/**
 * True if every cell is taken.
 * A draw is a full board with no winner, so always check for a win first:
 * the 42nd disc can fill the board and win at the same time.
 */
export function isBoardFull(board: Board): boolean {
  return board.every((discs) => discs.length === ROWS);
}