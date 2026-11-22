/**
 * The page itself: builds the elements once, then updates them when the
 * texts or the game change. All decisions are made elsewhere (flow.ts,
 * strings.ts); this file only shows them.
 */
import { h } from './dom';
import type { Language, Strings } from './strings';

const SOURCE_URL = 'https://github.com/gilad-benshlomo/connect-four-solver';

export class GameView {
  readonly root: HTMLElement;
  private readonly title = h('h1', { class: 'title' });
  private readonly subtitle = h('p', { class: 'subtitle' });
  private readonly languageGroup = h('div', { class: 'segmented language', role: 'group', dir: 'ltr' });
  private readonly englishButton = h('button', { type: 'button', class: 'segment', lang: 'en' }, 'EN');
  private readonly hebrewButton = h('button', { type: 'button', class: 'segment', lang: 'he' }, 'עב');
  private readonly play = h('div', { class: 'play' });
  private readonly rulesButton = h('button', { type: 'button', class: 'text-button' });
  private readonly sourceLink = h('a', { class: 'source-link', href: SOURCE_URL });

  constructor(container: HTMLElement) {
    this.languageGroup.append(this.englishButton, this.hebrewButton);
    this.root = h(
      'div',
      { class: 'page' },
      this.languageGroup,
      this.title,
      this.subtitle,
      this.play,
      h('footer', { class: 'footer' }, this.rulesButton, this.sourceLink),
    );
    container.replaceChildren(this.root);
  }

  /** Shows every text in the given language, and sets the page's language and direction. */
  setStrings(strings: Strings, language: Language): void {
    const html = document.documentElement;
    html.lang = language;
    html.dir = language === 'he' ? 'rtl' : 'ltr';
    document.title = strings.documentTitle;

    this.title.textContent = strings.title;
    this.subtitle.textContent = strings.subtitle;
    this.languageGroup.setAttribute('aria-label', strings.languageLabel);
    this.englishButton.setAttribute('aria-pressed', String(language === 'en'));
    this.hebrewButton.setAttribute('aria-pressed', String(language === 'he'));
    this.rulesButton.textContent = strings.howToPlay;
    this.sourceLink.textContent = strings.sourceCode;
  }
}
