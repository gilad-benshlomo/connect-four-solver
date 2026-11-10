export const COLUMNS = 7;
export const ROWS = 6;

export type Player = 'X' | 'O';
export type Board = Player[][];

export function createBoard(): Board {
  return Array.from({ length: COLUMNS }, () => []);
}
export function isLegalMove(board: Board, column: number): boolean {
  return (
    Number.isInteger(column) &&
    column >= 0 &&
    column < COLUMNS &&
    board[column].length < ROWS
  );
}

export function dropDisc(board: Board, column: number, player: Player): Board {
  if (!isLegalMove(board, column)) {
    throw new Error(`Illegal move: column ${column}`);
  }
  return board.map((discs, index) =>
    index === column ? [...discs, player] : discs,
  );
}