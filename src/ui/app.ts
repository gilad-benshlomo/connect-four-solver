/**
 * Puts the pieces together: the flow (what happens), the solver (the
 * computer's moves) and the view (what the page shows). Every change goes
 * through `update`, which redraws the page and, on the computer's turn,
 * asks the solver for its move.
 */
import {
  chooseAgain,
  computerMove,
  humanMove,
  initialFlow,
  solverFailed,
  startGame,
  type Flow,
  type Starter,
} from './flow';
import type { SolverClient } from './solverClient';
import { statusFor } from './status';
import type { Language, Strings } from './strings';
import type { GameView } from './view';

/** After this long, the status adds that perfect play takes a moment. */
const SLOW_AFTER_MS = 3000;

/**
 * The computer's disc is never played sooner than this after the player's,
 * so the player's disc lands first, even when the answer comes from the book.
 */
const SHORTEST_TURN_MS = 550;

/** True if nothing usable has the keyboard focus: no element, or one now hidden or disabled. */
function lostFocus(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return true;
  return active.closest('[hidden]') !== null || (active instanceof HTMLButtonElement && active.disabled);
}

export class App {
  private flow: Flow = initialFlow();
  private strings: Strings;
  /** True once the computer has been thinking for SLOW_AFTER_MS. */
  private slow = false;
  private slowTimer: number | undefined;
  /** The game id and move count of the position the solver was last asked about. */
  private asked = '';
  private readonly view: GameView;
  private readonly solver: SolverClient;

  constructor(view: GameView, solver: SolverClient, strings: Strings, language: Language) {
    this.view = view;
    this.solver = solver;
    this.strings = strings;
    view.board.setColumnHandler((column) => this.update(humanMove(this.flow, column)));
    view.board.setHoverHandler(() => this.renderHovering());
    view.setStartHandler((starter) => this.start(starter));
    view.setNewGameHandler(() => this.update(chooseAgain(this.flow)));
    view.setStrings(strings, language);
    this.render();
  }

  /** Starts a new game with the given player moving first. */
  start(starter: Starter): void {
    this.update(startGame(this.flow, starter));
  }

  /** Shows the page in another language or form of address. */
  setStrings(strings: Strings, language: Language): void {
    this.strings = strings;
    this.view.setStrings(strings, language);
    this.render();
  }

  private update(next: Flow): void {
    if (next === this.flow) return;
    this.flow = next;
    if (next.phase.kind !== 'computerTurn') this.stopSlowTimer();
    this.render();
    // A button that was just hidden or disabled loses the keyboard focus;
    // move the focus to whatever comes next instead of leaving it nowhere.
    if (lostFocus()) this.view.focusNextAction(next.phase);
    if (next.phase.kind === 'computerTurn') this.askComputer();
  }

  private render(): void {
    this.view.setPhase(this.flow.phase);
    this.view.setStatus(statusFor(this.flow, this.strings, this.slow));
    this.view.board.render(this.flow);
    this.renderHovering();
  }

  private renderHovering(): void {
    const { phase } = this.flow;
    const column = this.view.board.hoveredColumn;
    if (phase.kind === 'computerTurn') this.view.board.renderHovering({ kind: 'thinking' });
    else if (phase.kind === 'humanTurn' && column !== null) this.view.board.renderHovering({ kind: 'ghost', column });
    else this.view.board.renderHovering({ kind: 'none' });
  }

  /** Asks the solver for the computer's move in the current position, once per position. */
  private askComputer(): void {
    const { gameId, game } = this.flow;
    const key = `${gameId}:${game.moves.length}`;
    if (key === this.asked) return;
    this.asked = key;

    const askedAt = performance.now();
    this.stopSlowTimer();
    this.slowTimer = window.setTimeout(() => {
      this.slow = true;
      this.render();
    }, SLOW_AFTER_MS);

    this.solver.ask(game.moves).then(
      (column) => {
        const wait = Math.max(0, SHORTEST_TURN_MS - (performance.now() - askedAt));
        window.setTimeout(() => this.update(computerMove(this.flow, gameId, column)), wait);
      },
      (error: unknown) => {
        // Kept in the console for whoever investigates; the page shows a plain message.
        console.error('The solver failed:', error);
        this.update(solverFailed(this.flow, gameId, error instanceof Error ? error.message : String(error)));
      },
    );
  }

  private stopSlowTimer(): void {
    window.clearTimeout(this.slowTimer);
    this.slowTimer = undefined;
    this.slow = false;
  }
}
