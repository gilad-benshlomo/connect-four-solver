import { describe, expect, it } from 'vitest';
import type { SolverRequest } from '../solver/solver.worker';
import { SolverClient } from './solverClient';

/** A client whose requests are collected instead of sent to a worker. */
function makeClient(): { client: SolverClient; sent: SolverRequest[] } {
  const sent: SolverRequest[] = [];
  return { client: new SolverClient((request) => sent.push(request)), sent };
}

describe('SolverClient', () => {
  it('sends the moves with an id, and settles with the column that comes back', async () => {
    const { client, sent } = makeClient();
    const answer = client.ask([3, 2]);
    expect(sent).toEqual([{ id: sent[0].id, moves: [3, 2] }]);
    client.receive({ id: sent[0].id, column: 5 });
    await expect(answer).resolves.toBe(5);
    expect(client.waiting).toBe(0);
  });

  it('matches answers to questions by id, in whatever order they come', async () => {
    const { client, sent } = makeClient();
    const first = client.ask([3]);
    const second = client.ask([3, 3]);
    expect(sent[0].id).not.toBe(sent[1].id);
    client.receive({ id: sent[1].id, column: 2 });
    client.receive({ id: sent[0].id, column: 4 });
    await expect(first).resolves.toBe(4);
    await expect(second).resolves.toBe(2);
  });

  it('fails a question when the solver reports an error', async () => {
    const { client, sent } = makeClient();
    const answer = client.ask([0, 0, 0, 0, 0, 0, 0]);
    client.receive({ id: sent[0].id, error: 'Column 0 cannot be played' });
    await expect(answer).rejects.toThrow('Column 0 cannot be played');
    expect(client.waiting).toBe(0);
  });

  it('ignores an answer to no open question, and a second answer to the same one', async () => {
    const { client, sent } = makeClient();
    const answer = client.ask([]);
    client.receive({ id: 999, column: 0 });
    expect(client.waiting).toBe(1);
    client.receive({ id: sent[0].id, column: 3 });
    client.receive({ id: sent[0].id, column: 6 });
    await expect(answer).resolves.toBe(3);
  });

  it('fails every open question when the worker stops, and ignores its late answers', async () => {
    const { client, sent } = makeClient();
    const first = client.ask([]);
    const second = client.ask([3]);
    client.failAll('The solver could not start');
    await expect(first).rejects.toThrow('The solver could not start');
    await expect(second).rejects.toThrow('The solver could not start');
    expect(client.waiting).toBe(0);
    expect(() => client.receive({ id: sent[0].id, column: 3 })).not.toThrow();
  });

  it('sends a copy of the moves, not the caller\'s list', () => {
    const { client, sent } = makeClient();
    const moves = [3, 2];
    void client.ask(moves);
    moves.push(4);
    expect(sent[0].moves).toEqual([3, 2]);
  });
});
