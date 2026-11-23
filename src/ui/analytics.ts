/**
 * Counting games and players (D35). The page counts six events with
 * GoatCounter: a game started (by who goes first) and a game ended (by who
 * went first and how it ended). Each one is sent twice: `games-…` counts every
 * game, `people-…` counts each visitor once (GoatCounter's sessions, without
 * cookies). Which events a change in the game makes is worked out here, with
 * no page and no network, so it can be tested; sending them does nothing if
 * the counter is missing.
 */
import type { Flow, Result, Starter } from './flow';

/** The event names use "player" for the person playing, as the README does. */
const STARTER_NAMES: Record<Starter, string> = { human: 'player-first', computer: 'computer-first' };
const RESULT_NAMES: Record<Result, string> = { humanWon: 'player-won', computerWon: 'computer-won', draw: 'draw' };

/**
 * The events to count when the game goes from `before` to `after`:
 * `start-<who>-first` when a new game begins, and
 * `end-<who>-first-<result>` when a game ends. Anything else (a move, going
 * back to the choice, an answer for an old game, an error) counts nothing.
 */
export function gameEvents(before: Flow, after: Flow): string[] {
  const events: string[] = [];
  // A new game has a new id; going back to the choice also changes the id, but starts nothing.
  if (after.gameId !== before.gameId && after.phase.kind !== 'choosing' && after.starter !== null) {
    events.push(`start-${STARTER_NAMES[after.starter]}`);
  }
  if (after.phase.kind === 'over' && before.phase.kind !== 'over' && after.starter !== null) {
    events.push(`end-${STARTER_NAMES[after.starter]}-${RESULT_NAMES[after.phase.result]}`);
  }
  return events;
}

/** The part of GoatCounter's script that the page uses (https://www.goatcounter.com/help/events). */
export type GoatCounter = {
  count(options: CountOptions): void;
};

/**
 * One call to GoatCounter. With `no_session`, every call is counted; without
 * it, GoatCounter counts a path once per visitor's session.
 */
export type CountOptions = { path: string; title: string; event: true; no_session?: true };

/** The two counts sent for one event: every game, and each visitor once. */
export function countsFor(event: string): CountOptions[] {
  return [
    { path: `games-${event}`, title: `games-${event}`, event: true, no_session: true },
    { path: `people-${event}`, title: `people-${event}`, event: true },
  ];
}

declare global {
  interface Window {
    /** Set by GoatCounter's script (index.html) once it has loaded. */
    goatcounter?: GoatCounter;
  }
}

/**
 * Sends one event to GoatCounter (both of its counts, see `countsFor`), if its script has loaded. The script is
 * loaded from another server and may be blocked (by an ad blocker, for
 * instance) or fail, so a missing counter, or one that throws, is ignored:
 * counting must never get in the way of the game.
 *
 * @param counter `window.goatcounter`, which is undefined until the script has loaded
 */
export function sendEvent(counter: GoatCounter | undefined, event: string): void {
  for (const options of countsFor(event)) {
    try {
      counter?.count(options);
    } catch {
      // Nothing to do: the game goes on without this count.
    }
  }
}
