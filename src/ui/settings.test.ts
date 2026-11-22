import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, introDue, loadSettings, markIntroShown, saveSettings, type SettingsStore } from './settings';

/** A store kept in a Map, as localStorage would keep it. */
function memoryStore(): SettingsStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

/** A store that refuses to work, as in some private browsing modes. */
const brokenStore: SettingsStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('loading and saving', () => {
  it('starts in Hebrew, addressed in the masculine, until the player chooses', () => {
    expect(DEFAULT_SETTINGS).toEqual({ language: 'he', address: 'masculine' });
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('gives back what was saved', () => {
    const store = memoryStore();
    saveSettings(store, { language: 'en', address: 'masculine' });
    expect(loadSettings(store)).toEqual({ language: 'en', address: 'masculine' });
    saveSettings(store, { language: 'he', address: 'feminine' });
    expect(loadSettings(store)).toEqual({ language: 'he', address: 'feminine' });
  });

  it('falls back to the defaults for unreadable or unknown saved values', () => {
    const store = memoryStore();
    const key = () => [...store.data.keys()][0] ?? 'connect-four-solver:settings';
    saveSettings(store, { language: 'he', address: 'feminine' });

    store.data.set(key(), 'not json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);

    store.data.set(key(), JSON.stringify({ language: 'fr', address: 'feminine' }));
    expect(loadSettings(store)).toEqual({ language: 'he', address: 'feminine' });

    store.data.set(key(), JSON.stringify({ language: 'en', address: 'plural' }));
    expect(loadSettings(store)).toEqual({ language: 'en', address: 'masculine' });

    store.data.set(key(), JSON.stringify(null));
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('never throws when the browser blocks storage', () => {
    expect(loadSettings(brokenStore)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(brokenStore, { language: 'en', address: 'masculine' })).not.toThrow();
  });
});

describe('the window shown once per visit', () => {
  it('is due in a new visit, and not again once shown', () => {
    const session = memoryStore();
    expect(introDue(session)).toBe(true);
    markIntroShown(session);
    expect(introDue(session)).toBe(false);
  });

  it('is shown when storage is missing or blocked, without throwing', () => {
    expect(introDue(null)).toBe(true);
    expect(introDue(brokenStore)).toBe(true);
    expect(() => markIntroShown(brokenStore)).not.toThrow();
    expect(() => markIntroShown(null)).not.toThrow();
  });

  it('does not touch the saved settings', () => {
    const store = memoryStore();
    saveSettings(store, { language: 'he', address: 'feminine' });
    markIntroShown(store);
    expect(loadSettings(store)).toEqual({ language: 'he', address: 'feminine' });
  });
});
