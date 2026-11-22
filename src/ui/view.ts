/**
 * The page itself: builds the elements once, then updates them when the
 * texts or the game change. All decisions are made elsewhere (flow.ts,
 * strings.ts); this file only shows them.
 */
import { BoardView } from './boardView';
import { h } from './dom';
import type { Phase, Starter } from './flow';
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

  // Before a game: who goes first.
  private readonly chooseTitle = h('h2', { class: 'choose-title', id: 'choose-title' });
  private readonly humanFirstLabel = h('span');
  private readonly computerFirstLabel = h('span');
  private readonly humanFirstButton = h(
    'button',
    { type: 'button', class: 'choice-button' },
    h('span', { class: 'mini-disc human', 'aria-hidden': 'true' }),
    this.humanFirstLabel,
  );
  private readonly computerFirstButton = h(
    'button',
    { type: 'button', class: 'choice-button' },
    h('span', { class: 'mini-disc computer', 'aria-hidden': 'true' }),
    this.computerFirstLabel,
  );
  private readonly chooseExplanation = h('p', { class: 'choose-explanation' });
  private readonly choosePanel = h(
    'section',
    { class: 'choose', 'aria-labelledby': 'choose-title' },
    h('div', { class: 'choose-head' }, this.chooseTitle),
    this.humanFirstButton,
    this.computerFirstButton,
    this.chooseExplanation,
  );

  // During and after a game: who is who, and a way to start again.
  private readonly legendYou = h('span');
  private readonly legendComputer = h('span');
  private readonly newGameButton = h('button', { type: 'button', class: 'secondary-button' });
  private readonly playAgainButton = h('button', { type: 'button', class: 'primary-button' });
  private readonly gamePanel = h(
    'div',
    { class: 'game-controls' },
    this.playAgainButton,
    h(
      'div',
      { class: 'legend' },
      h('span', { class: 'legend-item' }, h('span', { class: 'mini-disc human', 'aria-hidden': 'true' }), this.legendYou),
      h('span', { class: 'legend-item' }, h('span', { class: 'mini-disc computer', 'aria-hidden': 'true' }), this.legendComputer),
    ),
    this.newGameButton,
  );
  private readonly controls = h('div', { class: 'controls' }, this.choosePanel, this.gamePanel);
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
      this.controls,
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

    this.chooseTitle.textContent = strings.whoGoesFirst;
    this.humanFirstLabel.textContent = strings.iGoFirst;
    this.computerFirstLabel.textContent = strings.computerGoesFirst;
    this.chooseExplanation.textContent = strings.startExplanation;
    this.legendYou.textContent = strings.you;
    this.legendComputer.textContent = strings.computer;
    this.newGameButton.textContent = strings.newGame;
    this.playAgainButton.textContent = strings.playAgain;
  }

  /** Calls `handler` with the player's choice of who goes first. */
  setStartHandler(handler: (starter: Starter) => void): void {
    this.humanFirstButton.addEventListener('click', () => handler('human'));
    this.computerFirstButton.addEventListener('click', () => handler('computer'));
  }

  /** Calls `handler` when the player asks for a new game (during a game, or after one). */
  setNewGameHandler(handler: () => void): void {
    this.newGameButton.addEventListener('click', handler);
    this.playAgainButton.addEventListener('click', handler);
  }

  /** Moves the keyboard focus to where the next action is, after the page changed around it. */
  focusNextAction(phase: Phase): void {
    if (phase.kind === 'choosing') this.humanFirstButton.focus();
    else if (phase.kind === 'over' || phase.kind === 'error') this.playAgainButton.focus();
    else this.board.focusPlayableColumn();
  }

  /** Marks the page with the flow's phase; the stylesheet shows and hides parts by it. */
  setPhase(phase: Phase): void {
    this.root.dataset.phase = phase.kind;
    const finished = phase.kind === 'over' || phase.kind === 'error';
    this.choosePanel.hidden = phase.kind !== 'choosing';
    this.gamePanel.hidden = phase.kind === 'choosing';
    this.playAgainButton.hidden = !finished;
    this.newGameButton.hidden = finished;
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
