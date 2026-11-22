/**
 * The player's language and, in Hebrew, form of address. The first visit
 * follows the browser's language; after that, the player's own choice is
 * kept in the browser for the next visit. Storage can be missing or refuse
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

/** Hebrew if the browser's preferred language is Hebrew, English otherwise. */
export function defaultLanguage(browserLanguages: readonly string[]): Language {
  const preferred = (browserLanguages[0] ?? '').toLowerCase();
  // 'iw' is an old code for Hebrew that some systems still report.
  return preferred.startsWith('he') || preferred.startsWith('iw') ? 'he' : 'en';
}

/**
 * The saved settings, with the defaults for anything missing or unreadable.
 * Never throws.
 */
export function loadSettings(store: SettingsStore | null, browserLanguages: readonly string[]): Settings {
  const defaults: Settings = { language: defaultLanguage(browserLanguages), address: 'masculine' };
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

/** Saves the settings for the next visit, if the browser lets it. Never throws. */
export function saveSettings(store: SettingsStore | null, settings: Settings): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage is full or blocked: the choice still applies to this visit.
  }
}
