import { describe, expect, it } from 'vitest';
import {
  chooseAgain,
  computerMove,
  humanMove,
  humanMoveCount,
  initialFlow,
  isHumanDisc,
  playableColumns,
  solverFailed,
  startGame,
  type Flow,
  type Starter,
} from './flow';

/**
 * Plays a list of columns from the start of a new game, each by whoever's
 * turn it is: the player through humanMove, the computer through computerMove
 * (standing in for the solver's answers).
 */
function play(starter: Starter, columns: number[]): Flow {
  let flow = startGame(initialFlow(), starter);
  for (const column of columns) {
    flow = flow.phase.kind === 'humanTurn' ? humanMove(flow, column) : computerMove(flow, flow.gameId, column);
  }
  return flow;
}

/** A simple seeded random number generator (values in [0, 1)), as in the other tests. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 2 ** 32;
  };
}

// A 42-move game that fills the board with no four in a row (from game.test.ts).
const DRAW = [
  0, 0, 0, 0, 0, 0,
  1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1,
  3, 3, 3, 3, 3, 3,
  4, 5, 5, 4, 4, 5, 5, 4, 4, 5, 5, 4,
  6, 6, 6, 6, 6, 6,
];

describe('starting', () => {
  it('opens on choosing who goes first, with no game', () => {
    const flow = initialFlow();
    expect(flow.phase).toEqual({ kind: 'choosing' });
    expect(flow.starter).toBeNull();
    expect(flow.game.moves).toEqual([]);
  });

  it('gives the first move to whoever was chosen', () => {
    expect(startGame(initialFlow(), 'human').phase).toEqual({ kind: 'humanTurn' });
    expect(startGame(initialFlow(), 'computer').phase).toEqual({ kind: 'computerTurn' });
  });

  it('starts every game on an empty board, with a new id', () => {
    const first = play('human', [3, 3, 2]);
    const second = startGame(first, 'computer');
    expect(second.game.moves).toEqual([]);
    expect(second.starter).toBe('computer');
    expect(second.gameId).toBe(first.gameId + 1);
  });

  it('can go back to choosing, which also abandons the game in progress', () => {
    const flow = play('computer', [3, 3]);
    const back = chooseAgain(flow);
    expect(back.phase).toEqual({ kind: 'choosing' });
    expect(back.game.moves).toEqual([]);
    expect(back.gameId).toBe(flow.gameId + 1);
    // An answer to the abandoned game changes nothing.
    expect(computerMove(back, flow.gameId, 3)).toBe(back);
  });
});

describe('turns', () => {
  it('passes the turn back and forth, recording every move', () => {
    const afterHuman = play('human', [3]);
    expect(afterHuman.phase).toEqual({ kind: 'computerTurn' });
    const afterComputer = computerMove(afterHuman, afterHuman.gameId, 2);
    expect(afterComputer.phase).toEqual({ kind: 'humanTurn' });
    expect(afterComputer.game.moves).toEqual([3, 2]);
  });

  it('ignores the player while the computer is thinking', () => {
    const flow = play('computer', []);
    expect(humanMove(flow, 3)).toBe(flow);
  });

  it('ignores a full column', () => {
    const flow = play('human', [0, 0, 0, 0, 0, 0]);
    expect(flow.phase).toEqual({ kind: 'humanTurn' });
    expect(humanMove(flow, 0)).toBe(flow);
  });

  it('ignores a column that does not exist', () => {
    const flow = play('human', []);
    expect(humanMove(flow, 7)).toBe(flow);
    expect(humanMove(flow, -1)).toBe(flow);
  });

  it('ignores an answer when it is not the computer\'s turn', () => {
    const flow = play('human', []);
    expect(computerMove(flow, flow.gameId, 3)).toBe(flow);
  });

  it('ignores an answer that belongs to an earlier game', () => {
    const old = play('computer', []);
    const current = startGame(old, 'computer');
    expect(computerMove(current, old.gameId, 3)).toBe(current);
  });

  it('does not change the flow it was given', () => {
    const flow = play('human', []);
    humanMove(flow, 3);
    expect(flow.game.moves).toEqual([]);
    expect(flow.phase).toEqual({ kind: 'humanTurn' });
  });
});

describe('playable columns', () => {
  it('lists the columns with room on the player\'s turn', () => {
    expect(playableColumns(play('human', [0, 0, 0, 0, 0, 0]))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('lists none on the computer\'s turn, or before a game', () => {
    expect(playableColumns(play('computer', []))).toEqual([]);
    expect(playableColumns(initialFlow())).toEqual([]);
  });
});

describe('the end of a game', () => {
  it('ends with the player winning, and the winning line', () => {
    // The player (X) drops four in column 0; the computer answers in column 1.
    const flow = play('human', [0, 1, 0, 1, 0, 1, 0]);
    expect(flow.phase.kind).toBe('over');
    if (flow.phase.kind !== 'over') return;
    expect(flow.phase.result).toBe('humanWon');
    expect(flow.phase.line).toHaveLength(4);
  });

  it('ends with the computer winning', () => {
    const flow = play('computer', [3, 0, 3, 0, 3, 1, 3]);
    expect(flow.phase).toMatchObject({ kind: 'over', result: 'computerWon' });
  });

  it('ends in a draw on a full board with no line', () => {
    const flow = play('human', DRAW);
    expect(flow.phase).toEqual({ kind: 'over', result: 'draw', line: [] });
  });

  it('ignores the player after the game is over', () => {
    const flow = play('computer', [3, 0, 3, 0, 3, 1, 3]);
    expect(humanMove(flow, 5)).toBe(flow);
  });
});

describe('when the solver goes wrong', () => {
  it('stops with an error on a column that cannot be played', () => {
    const flow = play('computer', []);
    expect(computerMove(flow, flow.gameId, 9).phase).toMatchObject({ kind: 'error' });
  });

  it('stops with the solver\'s message when it fails', () => {
    const flow = play('computer', []);
    expect(solverFailed(flow, flow.gameId, 'out of memory').phase).toEqual({
      kind: 'error',
      message: 'out of memory',
    });
  });

  it('ignores a failure that belongs to an earlier game', () => {
    const old = play('computer', []);
    const current = startGame(old, 'human');
    expect(solverFailed(current, old.gameId, 'late')).toBe(current);
  });

  it('can start a new game after an error', () => {
    const broken = solverFailed(play('computer', []), 1, 'out of memory');
    expect(startGame(broken, 'human').phase).toEqual({ kind: 'humanTurn' });
  });
});

describe('counting and colouring', () => {
  it('counts the player\'s moves, whoever started', () => {
    expect(humanMoveCount(play('human', [3, 3, 2]))).toBe(2);
    expect(humanMoveCount(play('computer', [3, 3, 2]))).toBe(1);
    expect(humanMoveCount(play('computer', []))).toBe(0);
  });

  it('knows which discs are the player\'s, whoever started', () => {
    // Column 3 holds the first two moves: the starter's disc, then the other's.
    const humanFirst = play('human', [3, 3]);
    expect(isHumanDisc(humanFirst, 3, 0)).toBe(true);
    expect(isHumanDisc(humanFirst, 3, 1)).toBe(false);
    const computerFirst = play('computer', [3, 3]);
    expect(isHumanDisc(computerFirst, 3, 0)).toBe(false);
    expect(isHumanDisc(computerFirst, 3, 1)).toBe(true);
    expect(isHumanDisc(computerFirst, 3, 2)).toBe(false); // empty
  });
});

describe('whole games', () => {
  it('always reaches an end, with the turns alternating, over many random games', () => {
    const random = seededRandom(2026);
    for (let game = 0; game < 300; game++) {
      const starter: Starter = random() < 0.5 ? 'human' : 'computer';
      let flow = startGame(initialFlow(), starter);
      let expectHuman = starter === 'human';
      while (flow.phase.kind === 'humanTurn' || flow.phase.kind === 'computerTurn') {
        expect(flow.phase.kind).toBe(expectHuman ? 'humanTurn' : 'computerTurn');
        const choices = flow.game.board.flatMap((discs, column) => (discs.length < 6 ? [column] : []));
        const column = choices[Math.floor(random() * choices.length)];
        flow = expectHuman ? humanMove(flow, column) : computerMove(flow, flow.gameId, column);
        expectHuman = !expectHuman;
      }
      expect(flow.phase.kind).toBe('over');
      if (flow.phase.kind === 'over' && flow.phase.result !== 'draw') {
        // The last move won, and it was made by the side named as the winner.
        const lastWasHuman = !expectHuman;
        expect(flow.phase.result).toBe(lastWasHuman ? 'humanWon' : 'computerWon');
      }
    }
  });
});
