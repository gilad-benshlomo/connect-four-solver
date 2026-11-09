export const COLUMNS = 7;
export const ROWS = 6;

export type Player = 'X' | 'O';
export type Board = Player[][];

export function createBoard(): Board {
  return Array.from({ length: COLUMNS }, () => []);
}