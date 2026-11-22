/**
 * The status shown beside the board: whose turn it is, or how the game
 * ended, and one line under it. Worked out here from the flow and the texts,
 * so the page only has to show it.
 */
import { humanMoveCount, type Flow } from './flow';
import type { Strings } from './strings';

/** One status, ready to show. */
export type Status = {
  /** Whose disc to show beside the text; null for no disc (a draw, an error). */
  side: 'human' | 'computer' | null;
  text: string;
  /** The line under the text. */
  detail: string;
  /** True while the computer is thinking: the page shows that it is busy. */
  busy: boolean;
};

/**
 * The status for the current flow, or null before a game (the choice of who
 * goes first replaces it). `slow` is true once the computer has been thinking
 * for a while, which adds a line saying that perfect play takes a moment.
 */
export function statusFor(flow: Flow, strings: Strings, slow: boolean): Status | null {
  const startMessage =
    flow.starter === 'computer' ? strings.computerStartedMessage : strings.playerStartedMessage;
  const { phase } = flow;
  switch (phase.kind) {
    case 'choosing':
      return null;
    case 'humanTurn':
      return { side: 'human', text: strings.yourTurn, detail: startMessage, busy: false };
    case 'computerTurn':
      return {
        side: 'computer',
        text: strings.computerThinking,
        detail: slow ? strings.thinkingSlow : startMessage,
        busy: true,
      };
    case 'over':
      if (phase.result === 'humanWon') {
        return { side: 'human', text: strings.youWin, detail: strings.youWinMessage, busy: false };
      }
      if (phase.result === 'computerWon') {
        return { side: 'computer', text: strings.computerWins, detail: strings.lasted(humanMoveCount(flow)), busy: false };
      }
      return { side: null, text: strings.draw, detail: strings.drawMessage, busy: false };
    case 'error':
      return { side: null, text: strings.errorTitle, detail: strings.errorMessage, busy: false };
  }
}
