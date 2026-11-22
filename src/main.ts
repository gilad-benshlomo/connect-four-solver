import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-sans-hebrew/400.css';
import '@fontsource/ibm-plex-sans-hebrew/500.css';
import '@fontsource/ibm-plex-sans-hebrew/600.css';
import '@fontsource/ibm-plex-sans-hebrew/700.css';
import './style.css';
import { humanMove, initialFlow, startGame, type Flow } from './ui/flow';
import { stringsFor } from './ui/strings';
import { GameView } from './ui/view';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app element in index.html');
}

const view = new GameView(app);
view.setStrings(stringsFor('en', 'masculine'), 'en');

let flow: Flow = startGame(initialFlow(), 'human');

/** Draws the board and the disc waiting above it. */
function render(): void {
  view.board.render(flow);
  renderHovering();
}

function renderHovering(): void {
  const column = view.board.hoveredColumn;
  view.board.renderHovering(
    flow.phase.kind === 'humanTurn' && column !== null ? { kind: 'ghost', column } : { kind: 'none' },
  );
}

view.board.setColumnHandler((column) => {
  const next = humanMove(flow, column);
  if (next === flow) return;
  flow = next;
  render();
});
view.board.setHoverHandler(renderHovering);
render();
