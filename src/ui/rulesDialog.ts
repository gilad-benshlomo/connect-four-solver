/**
 * The "How to play" window: the rules in four lines, and a panel about the
 * computer. It is a native <dialog> opened as a modal, so the browser keeps
 * the keyboard focus inside it and closes it with Escape.
 */
import { h } from './dom';
import type { Strings } from './strings';

export class RulesDialog {
  readonly root: HTMLDialogElement;
  private readonly title = h('h2', { class: 'rules-title', id: 'rules-title' });
  private readonly closeButton = h(
    'button',
    { type: 'button', class: 'icon-button' },
    closeIcon(),
  );
  private readonly rules = h('ul', { class: 'rules-list' });
  private readonly aboutTitle = h('h3', { class: 'about-title', id: 'about-title' });
  private readonly aboutText = h('div', { class: 'about-text' });
  private readonly stats = h('dl', { class: 'about-stats' });
  private readonly gotItButton = h('button', { type: 'button', class: 'primary-button' });

  constructor() {
    this.root = h(
      'dialog',
      // tabindex lets the window itself take the focus (see open).
      { class: 'rules', 'aria-labelledby': 'rules-title', tabindex: '-1' },
      h('div', { class: 'rules-head' }, this.title, this.closeButton),
      this.rules,
      h('section', { class: 'about', 'aria-labelledby': 'about-title' }, this.aboutTitle, this.aboutText, this.stats),
      this.gotItButton,
    );
    this.closeButton.addEventListener('click', () => this.root.close());
    this.gotItButton.addEventListener('click', () => this.root.close());
    // A click on the dimmed area around the window (the dialog itself, not its content) closes it.
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.root.close();
    });
  }

  /**
   * Opens the window over the page. The browser puts the focus on the close
   * button; when the page opens the window by itself, the focus goes to the
   * window instead, so no button looks chosen before the player did anything.
   *
   * @param byPage true when the page opens the window, not the player
   */
  open(byPage = false): void {
    this.root.showModal();
    if (byPage) this.root.focus();
  }

  /** Shows the texts in the current language. */
  setStrings(strings: Strings): void {
    this.title.textContent = strings.rulesTitle;
    this.closeButton.setAttribute('aria-label', strings.close);
    this.rules.replaceChildren(...strings.rules.map((rule) => h('li', {}, rule)));
    this.aboutTitle.textContent = strings.aboutTitle;
    this.aboutText.replaceChildren(...strings.aboutText.map((paragraph) => h('p', {}, paragraph)));
    this.stats.replaceChildren(
      ...strings.stats.map((stat) => h('div', { class: 'stat' }, h('dt', {}, stat.label), h('dd', {}, stat.value))),
    );
    this.gotItButton.textContent = strings.gotIt;
  }
}

/** An X drawn with two lines, in the text colour. */
function closeIcon(): SVGSVGElement {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svgNamespace, 'path');
  path.setAttribute('d', 'M6 6l12 12M18 6L6 18');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(path);
  return svg;
}
