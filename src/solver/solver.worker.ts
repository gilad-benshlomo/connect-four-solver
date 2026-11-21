import { loadBooks } from './books.ts';
import { chooseColumn } from './chooseColumn.ts';
import { bestMove } from './negamax.ts';
import type { Position } from './position.ts';
import { TranspositionTable } from './transpositionTable.ts';

// The solver's Web Worker: it runs the search off the page's main thread, so
// the page never freezes while the computer thinks. The page sends the moves
// so far and gets back the computer's column (D7).

/** A request to the solver: the moves so far (columns 0-6), with the computer to move. */
export type SolverRequest = {
  /** Sent back with the answer, so the page can tell which request it belongs to. */
  id: number;
  moves: number[];
};

/** The answer to the request with the same id: the computer's column, or why there is none. */
export type SolverResponse = { id: number; column: number } | { id: number; error: string };

/**
 * Size of the search's transposition table: odd and above 2^17 (D21), about
 * 40 MB, as in scripts/buildBook.ts. Chosen by measuring in the browser: the
 * slowest move tried after the book took about 4.4 s with 10 MB, 2.7 s with
 * 20 MB and 1.4 s with 40 MB on a desktop PC, and about 10 s with 40 MB on an
 * iPhone 14, which handled the memory (docs/JOURNEY.md).
 */
const TABLE_SIZE = 8_388_617;

const books = loadBooks();
// One table for the worker's whole life: entries stay correct from one game to the next.
const table = new TranspositionTable(TABLE_SIZE);
const search = (position: Position) => bestMove(position, table);

// The project's types describe a page (lib "DOM"), where postMessage takes a
// target origin; in a worker it takes only the message, as on a Worker object.
const scope = self as unknown as Worker;

scope.onmessage = (event: MessageEvent<SolverRequest>) => {
  const { id, moves } = event.data;
  let response: SolverResponse;
  try {
    response = { id, column: chooseColumn(moves, books, search) };
  } catch (error) {
    // Sent as an answer, so the page knows which request failed instead of waiting for ever.
    response = { id, error: error instanceof Error ? error.message : String(error) };
  }
  scope.postMessage(response);
};
