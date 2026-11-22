/**
 * The page itself: builds the elements once, then updates them when the
 * texts or the game change. All decisions are made elsewhere (flow.ts,
 * strings.ts); this file only shows them.
 */
import { BoardView } from './boardView';
import { h } from './dom';
import type { Phase } from './flow';
import type { Status } from './status';
import type { Language, Strings } from './strings';

const SOURCE_URL = 'https://github.com/gilad-benshlomo/connect-four-solver';

export class GameView {
  readonly root: HTMLElement;
  private readonly title = h('h1', { class: 'title' });
  private readonly subtitle = h('p', { class: 'subtitle' });
  private readonly languageGroup = h('div', { class: 'segmented language', role: 'group', dir: 'ltr' });
  private readonly englishButton = h('button', { type: 'button', class: 'segment', lang: 'en' }, 'EN');
  private readonly hebrewButton = h('button', { type: 'button', class: 'segment', lang: 'he' }, 'עב');
  private readonly status = h('div', { class: 'status', role: 'status' });
  private readonly statusDisc = h('span', { class: 'status-disc', 'aria-hidden': 'true' });
  private readonly statusText = h('span', { class: 'status-text' });
  private readonly statusDots = h('span', { class: 'dots', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
  private readonly statusDetail = h('p', { class: 'status-detail' });
  readonly board = new BoardView();
  private readonly play = h('div', { class: 'play' }, this.board.root);
  private readonly rulesButton = h('button', { type: 'button', class: 'text-button' });
  private readonly sourceLink = h('a', { class: 'source-link', href: SOURCE_URL });

  constructor(container: HTMLElement) {
    this.languageGroup.append(this.englishButton, this.hebrewButton);
    this.status.append(h('div', { class: 'status-line' }, this.statusDisc, this.statusText, this.statusDots), this.statusDetail);
    this.root = h(
      'div',
      { class: 'page' },
      this.languageGroup,
      this.title,
      this.subtitle,
      this.status,
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
    this.board.setStrings(strings);
  }

  /** Marks the page with the flow's phase; the stylesheet shows and hides parts by it. */
  setPhase(phase: Phase): void {
    this.root.dataset.phase = phase.kind;
  }

  /** Shows the status beside the board, or hides it when there is none. */
  setStatus(status: Status | null): void {
    this.status.hidden = status === null;
    if (status === null) return;
    this.statusDisc.className = `status-disc ${status.side ?? 'none'}`;
    this.statusText.textContent = status.text;
    this.statusDots.hidden = !status.busy;
    this.statusDetail.textContent = status.detail;
  }
}
