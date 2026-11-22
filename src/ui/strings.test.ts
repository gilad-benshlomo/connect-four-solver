import { describe, expect, it } from 'vitest';
import { ADDRESSED_KEYS, ALL_STRINGS, stringsFor, type Strings } from './strings';

const VERSIONS = Object.entries(ALL_STRINGS) as [string, Strings][];

/** The texts in one entry, with functions called on sample numbers. */
function textsOf(value: Strings[keyof Strings]): string[] {
  if (typeof value === 'function') return [value(1), value(7)];
  if (typeof value !== 'string') {
    return value.flatMap((item) => (typeof item === 'string' ? [item] : [item.value, item.label]));
  }
  return [value];
}

/** Every text in a version. */
function allTexts(strings: Strings): string[] {
  return Object.values(strings).flatMap(textsOf);
}

describe('strings', () => {
  it('has the same keys in all three versions', () => {
    const keys = Object.keys(ALL_STRINGS.en).sort();
    for (const [, strings] of VERSIONS) {
      expect(Object.keys(strings).sort()).toEqual(keys);
    }
  });

  it('has no empty text in any version', () => {
    for (const [name, strings] of VERSIONS) {
      for (const text of allTexts(strings)) {
        expect(text.trim(), `an empty text in ${name}`).not.toBe('');
      }
    }
  });

  it('has as many rules and numbers in Hebrew as in English', () => {
    for (const [, strings] of VERSIONS) {
      expect(strings.rules).toHaveLength(ALL_STRINGS.en.rules.length);
      expect(strings.stats).toHaveLength(ALL_STRINGS.en.stats.length);
    }
  });

  it('writes the Hebrew versions in Hebrew', () => {
    // Catches English left behind in a Hebrew version. Numbers alone are allowed.
    const hebrewLetter = /[א-ת]/;
    for (const strings of [ALL_STRINGS.heMasculine, ALL_STRINGS.heFeminine]) {
      for (const text of allTexts(strings)) {
        if (/^[\d.,]+$/.test(text)) continue;
        expect(text, 'a Hebrew text with no Hebrew letter').toMatch(hebrewLetter);
      }
    }
  });

  it('changes only the texts that address the player between masculine and feminine', () => {
    const { heMasculine, heFeminine } = ALL_STRINGS;
    const changed = (Object.keys(heMasculine) as (keyof Strings)[]).filter(
      (key) => textsOf(heMasculine[key]).join('|') !== textsOf(heFeminine[key]).join('|'),
    );
    expect(changed.sort()).toEqual([...ADDRESSED_KEYS].sort());
  });

  it('explains who can win in two lines, the computer first', () => {
    for (const [, strings] of VERSIONS) {
      expect(strings.startExplanation).toHaveLength(2);
    }
    // Only the second line addresses the player, so the first is the same in both Hebrew versions.
    expect(ALL_STRINGS.heFeminine.startExplanation[0]).toBe(ALL_STRINGS.heMasculine.startExplanation[0]);
  });

  it('counts the moves the player lasted, one or many', () => {
    expect(ALL_STRINGS.en.lasted(1)).toBe('You lasted 1 move.');
    expect(ALL_STRINGS.en.lasted(7)).toBe('You lasted 7 moves.');
    expect(ALL_STRINGS.heMasculine.lasted(1)).toBe('החזקת מעמד מהלך אחד.');
    expect(ALL_STRINGS.heMasculine.lasted(7)).toBe('החזקת מעמד 7 מהלכים.');
  });
});

describe('stringsFor', () => {
  it('gives English whatever the form of address', () => {
    expect(stringsFor('en', 'masculine')).toBe(ALL_STRINGS.en);
    expect(stringsFor('en', 'feminine')).toBe(ALL_STRINGS.en);
  });

  it('gives Hebrew in the chosen form of address', () => {
    expect(stringsFor('he', 'masculine')).toBe(ALL_STRINGS.heMasculine);
    expect(stringsFor('he', 'feminine')).toBe(ALL_STRINGS.heFeminine);
  });
});
