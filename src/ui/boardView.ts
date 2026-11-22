/**
 * The board on the page: the row above it where a disc waits, the discs,
 * the blue face with its holes, and one button per column.
 *
 * The face is a separate layer drawn over the discs, with transparent holes,
 * so a falling disc passes behind it as in the real game. The board is
 * always laid out left to right, in Hebrew too: column 1 is on the left.
 */
import { COLUMNS, ROWS } from '../game/board';
import { h } from './dom';
import { isHumanDisc, playableColumns, type Flow } from './flow';
import type { Strings } from './strings';

/** Which disc, if any, waits in the row above the board. */
export type Hovering =
  | { kind: 'none' }
  /** The player's disc, over the column the pointer or keyboard is on. */
  | { kind: 'ghost'; column: number }
  /** The computer's disc, moving between columns while it thinks. */
  | { kind: 'thinking' };

/**
 * True if `after` is `before` with one more move: then only the new disc
 * falls. Anything else (a new game, the same moves) is drawn with no animation.
 */
export function addsOneMove(before: readonly number[], after: readonly number[]): boolean {
  return after.length === before.length + 1 && before.every((column, i) => after[i] === column);
}

export class BoardView {
  readonly root: HTMLElement;
  private readonly waitRow = h('div', { class: 'wait-row', 'aria-hidden': 'true' });
  private readonly slots: HTMLElement[][] = [];
  private readonly highlight = h('div', { class: 'column-highlight', 'aria-hidden': 'true' });
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly group: HTMLElement;
  /** The moves on the board as last drawn, to tell a new disc from a new game. */
  private drawnMoves: number[] = [];
  private hoverColumn: number | null = null;
  /** The column the keyboard was last on; the focus comes back to it on the player's next turn. */
  private lastFocused = 3;
  private onColumn: (column: number) => void = () => {};
  private onHoverChange: () => void = () => {};

  constructor() {
    const discs = h('div', { class: 'discs', 'aria-hidden': 'true' });
    const face = h('div', { class: 'face', 'aria-hidden': 'true' });
    // Rows are created from the top, as the grid lays them out.
    for (let column = 0; column < COLUMNS; column++) this.slots.push([]);
    for (let row = ROWS - 1; row >= 0; row--) {
      for (let column = 0; column < COLUMNS; column++) {
        const slot = h('div', { class: 'slot' });
        this.slots[column][row] = slot;
        discs.append(slot);
        face.append(h('div', { class: 'hole' }));
      }
    }
    const buttons = h('div', { class: 'column-buttons' });
    for (let column = 0; column < COLUMNS; column++) {
      const button = h('button', { type: 'button', class: 'column-button' });
      button.addEventListener('click', () => this.onColumn(column));
      button.addEventListener('pointerenter', () => this.setHover(column));
      button.addEventListener('pointerleave', () => this.setHover(null));
      // Only a keyboard focus shows the waiting disc; focus moved by the page
      // after a mouse click should not.
      button.addEventListener('focus', () => {
        this.lastFocused = column;
        if (button.matches(':focus-visible')) this.setHover(column);
      });
      button.addEventListener('blur', () => this.setHover(null));
      button.addEventListener('keydown', (event) => this.moveFocus(event, column));
      this.buttons.push(button);
      buttons.append(button);
    }
    for (let column = 0; column < COLUMNS; column++) this.waitRow.append(h('div', { class: 'wait-slot' }));

    this.group = h('div', { class: 'board', role: 'group', dir: 'ltr' }, discs, face, this.highlight, buttons);
    this.root = h('div', { class: 'board-area', dir: 'ltr' }, this.waitRow, this.group);
  }

  /** Calls `handler` when the player picks a column. */
  setColumnHandler(handler: (column: number) => void): void {
    this.onColumn = handler;
  }

  /** Calls `handler` when the column under the pointer or keyboard changes. */
  setHoverHandler(handler: () => void): void {
    this.onHoverChange = handler;
  }

  /** The column under the pointer or keyboard, if the player may play there now. */
  get hoveredColumn(): number | null {
    return this.hoverColumn;
  }

  /** Updates the labels that screen readers announce. */
  setStrings(strings: Strings): void {
    this.group.setAttribute('aria-label', strings.boardLabel);
    this.buttons.forEach((button, column) => button.setAttribute('aria-label', strings.dropInColumn(column + 1)));
  }

  /** Draws the discs and enables the columns the player can play now. */
  render(flow: Flow): void {
    const { moves } = flow.game;
    const isNextMove = addsOneMove(this.drawnMoves, moves);
    const winning = flow.phase.kind === 'over' ? flow.phase.line : [];

    for (let column = 0; column < COLUMNS; column++) {
      const discs = flow.game.board[column];
      for (let row = 0; row < ROWS; row++) {
        const slot = this.slots[column][row];
        if (row >= discs.length) {
          slot.replaceChildren();
          continue;
        }
        const disc = (slot.firstElementChild as HTMLElement | null) ?? slot.appendChild(h('div', {}));
        const isWin = winning.some((cell) => cell.column === column && cell.row === row);
        disc.className = [
          'disc',
          isHumanDisc(flow, column, row) ? 'human' : 'computer',
          isWin ? 'win' : '',
          winning.length > 0 && !isWin ? 'dim' : '',
        ].join(' ').trim();
      }
    }

    if (isNextMove) {
      const column = moves[moves.length - 1];
      const row = flow.game.board[column].length - 1;
      const disc = this.slots[column][row].firstElementChild as HTMLElement;
      // From the row above the board down to its place.
      disc.style.setProperty('--fall', String(ROWS - row));
      disc.classList.add('falling');
      disc.addEventListener('animationend', () => disc.classList.remove('falling'), { once: true });
    }
    this.drawnMoves = [...moves];

    const playable = new Set(playableColumns(flow));
    this.buttons.forEach((button, column) => {
      button.disabled = !playable.has(column);
    });
    if (this.hoverColumn !== null && !playable.has(this.hoverColumn)) this.hoverColumn = null;
  }

  /** Draws the disc that waits above the board, and the highlight of its column. */
  renderHovering(hovering: Hovering): void {
    this.waitRow.querySelectorAll('.wait-slot').forEach((slot, column) => {
      const show =
        (hovering.kind === 'ghost' && hovering.column === column) || (hovering.kind === 'thinking' && column === 3);
      slot.replaceChildren(
        ...(show ? [h('div', { class: hovering.kind === 'ghost' ? 'disc human ghost' : 'disc computer thinking' })] : []),
      );
    });
    const column = hovering.kind === 'ghost' ? hovering.column : null;
    this.highlight.hidden = column === null;
    if (column !== null) this.highlight.style.setProperty('--column', String(column));
  }

  /**
   * Moves the keyboard focus back to the column it was last on or, if that
   * column is full, to the nearest one that can be played. Does nothing when
   * no column can be played.
   */
  focusPlayableColumn(): void {
    for (let distance = 0; distance < COLUMNS; distance++) {
      for (const column of [this.lastFocused - distance, this.lastFocused + distance]) {
        const button = this.buttons[column];
        if (button && !button.disabled) {
          button.focus();
          return;
        }
      }
    }
  }

  private setHover(column: number | null): void {
    if (column !== null && this.buttons[column].disabled) column = null;
    if (column === this.hoverColumn) return;
    this.hoverColumn = column;
    this.onHoverChange();
  }

  /** Left and right arrows move between the columns that can be played. */
  private moveFocus(event: KeyboardEvent, column: number): void {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    for (let next = column + step; next >= 0 && next < COLUMNS; next += step) {
      if (!this.buttons[next].disabled) {
        this.buttons[next].focus();
        return;
      }
    }
  }
}
