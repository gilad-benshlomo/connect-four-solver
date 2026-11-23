import { describe, expect, it } from 'vitest';
import { countsFor, gameEvents, sendEvent, type GoatCounter } from './analytics';
import { chooseAgain, computerMove, humanMove, initialFlow, solverFailed, startGame, type Flow, type Starter } from './flow';

/** Plays a list of columns from the start, each by whoever's turn it is (as in flow.test.ts). */
function play(starter: Starter, columns: number[]): Flow {
  let flow = startGame(initialFlow(), starter);
  for (const column of columns) {
    flow = flow.phase.kind === 'humanTurn' ? humanMove(flow, column) : computerMove(flow, flow.gameId, column);
  }
  return flow;
}

/** The last move of `columns`, as the change it makes: the flow before it and after it. */
function lastMove(starter: Starter, columns: number[]): [Flow, Flow] {
  return [play(starter, columns.slice(0, -1)), play(starter, columns)];
}

// The first player wins with four in column 0; the other one plays column 1.
const FIRST_PLAYER_WINS = [0, 1, 0, 1, 0, 1, 0];
const SECOND_PLAYER_WINS = [0, 1, 0, 1, 0, 1, 2, 1];
// 42 moves with no four in a row (columns filled in pairs, offset so no line forms).
const DRAW = [
  0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6,
  6, 6, 6,
];

describe('gameEvents', () => {
  it('counts the start of a game, by who goes first', () => {
    expect(gameEvents(initialFlow(), startGame(initialFlow(), 'computer'))).toEqual(['start-computer-first']);
    expect(gameEvents(initialFlow(), startGame(initialFlow(), 'human'))).toEqual(['start-player-first']);
  });

  it('counts a new game started after another one, too', () => {
    const over = play('human', FIRST_PLAYER_WINS);
    expect(gameEvents(over, startGame(over, 'human'))).toEqual(['start-player-first']);
  });

  it('counts the end of a game, by who went first and how it ended', () => {
    expect(gameEvents(...lastMove('computer', FIRST_PLAYER_WINS))).toEqual(['end-computer-first-computer-won']);
    expect(gameEvents(...lastMove('human', SECOND_PLAYER_WINS))).toEqual(['end-player-first-computer-won']);
    expect(gameEvents(...lastMove('human', FIRST_PLAYER_WINS))).toEqual(['end-player-first-player-won']);
    expect(gameEvents(...lastMove('human', DRAW))).toEqual(['end-player-first-draw']);
  });

  it('counts a result even if it should never happen, so a bug would show up in the counts', () => {
    expect(gameEvents(...lastMove('computer', SECOND_PLAYER_WINS))).toEqual(['end-computer-first-player-won']);
  });

  it('counts nothing for an ordinary move', () => {
    expect(gameEvents(...lastMove('human', [3, 3, 4]))).toEqual([]);
    expect(gameEvents(...lastMove('computer', [3, 3]))).toEqual([]);
  });

  it('counts nothing for going back to the choice, or for an error', () => {
    const playing = play('human', [3, 3]);
    expect(gameEvents(playing, chooseAgain(playing))).toEqual([]);
    const thinking = play('computer', []);
    expect(gameEvents(thinking, solverFailed(thinking, thinking.gameId, 'The solver stopped working'))).toEqual([]);
  });

  it('counts the end of a game only once', () => {
    const over = play('human', FIRST_PLAYER_WINS);
    expect(gameEvents(over, over)).toEqual([]);
    // A late answer for the finished game changes nothing.
    expect(gameEvents(over, computerMove(over, over.gameId, 6))).toEqual([]);
  });
});

describe('countsFor', () => {
  it('counts every game under games-, and each visitor once under people-', () => {
    expect(countsFor('end-player-first-draw')).toEqual([
      { path: 'games-end-player-first-draw', title: 'games-end-player-first-draw', event: true, no_session: true },
      { path: 'people-end-player-first-draw', title: 'people-end-player-first-draw', event: true },
    ]);
  });
});

describe('sendEvent', () => {
  it('sends both counts of the event to GoatCounter', () => {
    const sent: unknown[] = [];
    const counter: GoatCounter = { count: (options) => sent.push(options) };
    sendEvent(counter, 'start-player-first');
    expect(sent).toEqual(countsFor('start-player-first'));
  });

  it('does nothing when the counter has not loaded or was blocked', () => {
    expect(() => sendEvent(undefined, 'start-player-first')).not.toThrow();
  });

  it('does not let an error in the counter reach the game, and still tries the other count', () => {
    const tried: string[] = [];
    const counter: GoatCounter = {
      count: (options) => {
        tried.push(options.path);
        throw new Error('network down');
      },
    };
    expect(() => sendEvent(counter, 'start-player-first')).not.toThrow();
    expect(tried).toEqual(['games-start-player-first', 'people-start-player-first']);
  });
});
