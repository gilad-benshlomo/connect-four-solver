/**
 * The page's side of the conversation with the solver's Web Worker: each
 * question becomes a promise that settles when the answer with the same id
 * comes back. The client does not know about the Worker itself; the page
 * passes in a function that sends a request, and hands every reply (and any
 * crash of the worker) back to the client. That keeps this file testable
 * without a browser.
 */
import type { SolverRequest, SolverResponse } from '../solver/solver.worker';

type Pending = { resolve: (column: number) => void; reject: (error: Error) => void };

export class SolverClient {
  private readonly send: (request: SolverRequest) => void;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  /** Why the worker stopped, once it has; every later question fails with it. */
  private stopped: string | null = null;

  /** @param send delivers a request to the worker (in the page: `worker.postMessage`). */
  constructor(send: (request: SolverRequest) => void) {
    this.send = send;
  }

  /**
   * Asks for the computer's column after `moves` (the computer to move).
   * Rejects if the solver reports an error, or if the worker stops working.
   */
  ask(moves: readonly number[]): Promise<number> {
    if (this.stopped !== null) return Promise.reject(new Error(this.stopped));
    const id = this.nextId++;
    return new Promise<number>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // A copy: the caller may keep changing its own list of moves.
      this.send({ id, moves: [...moves] });
    });
  }

  /** Handles a reply from the worker. A reply to no open question is ignored. */
  receive(response: SolverResponse): void {
    const request = this.pending.get(response.id);
    if (!request) return;
    this.pending.delete(response.id);
    if ('column' in response) request.resolve(response.column);
    else request.reject(new Error(response.error));
  }

  /**
   * The worker stopped working (it failed to load, or crashed): every open
   * question fails, and so does every later one, since no answer will come.
   */
  failAll(message: string): void {
    this.stopped = message;
    const open = [...this.pending.values()];
    this.pending.clear();
    for (const request of open) request.reject(new Error(message));
  }

  /** How many questions are still waiting for an answer. */
  get waiting(): number {
    return this.pending.size;
  }
}
