import { describe, expect, it } from 'vitest';
import { computerMove, humanMove, initialFlow, solverFailed, startGame, type Flow, type Starter } from './flow';
import { statusFor } from './status';
import { ALL_STRINGS } from './strings';

const en = ALL_STRINGS.en;

/** Plays a list of columns from the start, each by whoever's turn it is (as in flow.test.ts). */
function play(starter: Starter, columns: number[]): Flow {
  let flow = startGame(initialFlow(), starter);
  for (const column of columns) {
    flow = flow.phase.kind === 'humanTurn' ? humanMove(flow, column) : computerMove(flow, flow.gameId, column);
  }
  return flow;
}

describe('statusFor', () => {
  it('shows nothing while the player chooses who goes first', () => {
    expect(statusFor(initialFlow(), en, false)).toBeNull();
  });

  it('tells the player it is their turn, with the message for who started', () => {
    expect(statusFor(play('computer', [3]), en, false)).toEqual({
      side: 'human',
      text: 'Your turn',
      detail: en.computerStartedMessage,
      busy: false,
    });
    expect(statusFor(play('human', []), en, false)?.detail).toBe(en.playerStartedMessage);
  });

  it('shows the computer thinking, and after a while that perfect play takes a moment', () => {
    const flow = play('human', [3]);
    expect(statusFor(flow, en, false)).toEqual({
      side: 'computer',
      text: 'Computer is thinking',
      detail: en.playerStartedMessage,
      busy: true,
    });
    expect(statusFor(flow, en, true)?.detail).toBe('Perfect play takes a moment.');
  });

  it('shows a win for the player, with how many moves the player made', () => {
    // The player drops four in column 0 in 4 moves.
    expect(statusFor(play('human', [0, 1, 0, 1, 0, 1, 0]), en, false)).toEqual({
      side: 'human',
      text: 'You beat the perfect solver!',
      detail: 'Not one of your 4 moves let the win slip. That takes a perfect game, and you played one.',
      busy: false,
    });
  });

  it('shows a draw with no side', () => {
    // A full board with no line (the same moves as in flow.test.ts).
    const draw = [
      0, 0, 0, 0, 0, 0,
      1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1,
      3, 3, 3, 3, 3, 3,
      4, 5, 5, 4, 4, 5, 5, 4, 4, 5, 5, 4,
      6, 6, 6, 6, 6, 6,
    ];
    expect(statusFor(play('human', draw), en, false)).toEqual({
      side: null,
      text: 'A draw!',
      detail: en.drawMessage,
      busy: false,
    });
  });

  it('shows a win for the computer, with how many moves the player lasted', () => {
    // The computer drops four in column 3; the player made 3 moves.
    expect(statusFor(play('computer', [3, 0, 3, 0, 3, 1, 3]), en, false)).toEqual({
      side: 'computer',
      text: 'The computer wins',
      detail: 'You lasted 3 moves.',
      busy: false,
    });
  });

  it('shows an error with no disc', () => {
    const flow = solverFailed(play('computer', []), 1, 'out of memory');
    expect(statusFor(flow, en, false)).toEqual({
      side: null,
      text: en.errorTitle,
      detail: en.errorMessage,
      busy: false,
    });
  });

  it('speaks to the player in the chosen language and form of address', () => {
    const flow = play('human', []);
    expect(statusFor(flow, ALL_STRINGS.heMasculine, false)?.detail).toBe('תוכל לנצח רק אם תשחק משחק מושלם.');
    expect(statusFor(flow, ALL_STRINGS.heFeminine, false)?.detail).toBe('תוכלי לנצח רק אם תשחקי משחק מושלם.');
  });
});
