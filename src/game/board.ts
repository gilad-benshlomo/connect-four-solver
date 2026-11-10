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
export type Cell = { column: number; row: number };

const DIRECTIONS = [
  [1, 0], // horizontal
  [0, 1], // vertical
  [1, 1], // diagonal /
  [1, -1], // diagonal \
] as const;

function playerAt(board: Board, column: number, row: number): Player | undefined {
  return board[column]?.[row];
}

export function winningLine(board: Board, column: number): Cell[] | null {
  const row = board[column].length - 1;
  const player = board[column][row];
  if (player === undefined) return null;

  for (const [dc, dr] of DIRECTIONS) {
    const line: Cell[] = [{ column, row }];
    for (const sign of [1, -1]) {
      let c = column + sign * dc;
      let r = row + sign * dr;
      while (playerAt(board, c, r) === player) {
        line.push({ column: c, row: r });
        c += sign * dc;
        r += sign * dr;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}