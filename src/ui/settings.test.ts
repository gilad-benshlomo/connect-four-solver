import { describe, expect, it } from 'vitest';
import { defaultLanguage, loadSettings, saveSettings, type SettingsStore } from './settings';

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

describe('defaultLanguage', () => {
  it('is Hebrew when the browser prefers Hebrew', () => {
    expect(defaultLanguage(['he-IL', 'en-US'])).toBe('he');
    expect(defaultLanguage(['he'])).toBe('he');
    expect(defaultLanguage(['iw'])).toBe('he');
  });

  it('is English otherwise, even if Hebrew comes second', () => {
    expect(defaultLanguage(['en-US', 'he-IL'])).toBe('en');
    expect(defaultLanguage(['fr-FR'])).toBe('en');
    expect(defaultLanguage([])).toBe('en');
  });
});

describe('loading and saving', () => {
  it('starts from the browser\'s language and the masculine form', () => {
    expect(loadSettings(memoryStore(), ['he-IL'])).toEqual({ language: 'he', address: 'masculine' });
    expect(loadSettings(null, ['en-GB'])).toEqual({ language: 'en', address: 'masculine' });
  });

  it('gives back what was saved, whatever the browser prefers', () => {
    const store = memoryStore();
    saveSettings(store, { language: 'he', address: 'feminine' });
    expect(loadSettings(store, ['en-US'])).toEqual({ language: 'he', address: 'feminine' });
  });

  it('falls back to the defaults for unreadable or unknown saved values', () => {
    const store = memoryStore();
    const key = () => [...store.data.keys()][0] ?? 'connect-four-solver:settings';
    saveSettings(store, { language: 'he', address: 'feminine' });

    store.data.set(key(), 'not json');
    expect(loadSettings(store, ['en'])).toEqual({ language: 'en', address: 'masculine' });

    store.data.set(key(), JSON.stringify({ language: 'fr', address: 'feminine' }));
    expect(loadSettings(store, ['en'])).toEqual({ language: 'en', address: 'feminine' });

    store.data.set(key(), JSON.stringify(null));
    expect(loadSettings(store, ['he'])).toEqual({ language: 'he', address: 'masculine' });
  });

  it('never throws when the browser blocks storage', () => {
    expect(loadSettings(brokenStore, ['he'])).toEqual({ language: 'he', address: 'masculine' });
    expect(() => saveSettings(brokenStore, { language: 'en', address: 'masculine' })).not.toThrow();
  });
});
