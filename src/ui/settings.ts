/**
 * The player's language and, in Hebrew, form of address. The first visit is
 * in Hebrew, addressed in the masculine; after that, the player's own choice
 * is kept in the browser for the next visit. Storage can be missing or refuse
 * to work (private browsing, blocked cookies), so every use of it is guarded
 * and the page simply falls back to the defaults.
 */
import type { Address, Language } from './strings';

export type Settings = { language: Language; address: Address };

/** The part of the browser's storage that the settings use (localStorage in the page). */
export type SettingsStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const STORAGE_KEY = 'connect-four-solver:settings';

/** What a player who has not chosen yet gets: Hebrew, addressed in the masculine. */
export const DEFAULT_SETTINGS: Settings = { language: 'he', address: 'masculine' };

/**
 * The saved settings, with the defaults for anything missing or unreadable.
 * Never throws.
 */
export function loadSettings(store: SettingsStore | null): Settings {
  const defaults = DEFAULT_SETTINGS;
  let saved: unknown;
  try {
    const text = store?.getItem(STORAGE_KEY);
    if (!text) return defaults;
    saved = JSON.parse(text);
  } catch {
    return defaults;
  }
  if (typeof saved !== 'object' || saved === null) return defaults;
  const { language, address } = saved as Record<string, unknown>;
  return {
    language: language === 'en' || language === 'he' ? language : defaults.language,
    address: address === 'masculine' || address === 'feminine' ? address : defaults.address,
  };
}

const INTRO_KEY = 'connect-four-solver:intro-shown';

/**
 * True if the "How to play" window has not been shown yet in this visit. The
 * page keeps this in sessionStorage, which lasts while the tab is open
 * (reloads included) and is gone in a new tab or a new browser session. If
 * storage is blocked, the window is shown. Never throws.
 */
export function introDue(session: SettingsStore | null): boolean {
  try {
    return session?.getItem(INTRO_KEY) !== 'yes';
  } catch {
    return true;
  }
}

/** Notes that the "How to play" window was shown in this visit. Never throws. */
export function markIntroShown(session: SettingsStore | null): void {
  try {
    session?.setItem(INTRO_KEY, 'yes');
  } catch {
    // Blocked storage: the window may show again after a reload, which is harmless.
  }
}

/** Saves the settings for the next visit, if the browser lets it. Never throws. */
export function saveSettings(store: SettingsStore | null, settings: Settings): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage is full or blocked: the choice still applies to this visit.
  }
}
