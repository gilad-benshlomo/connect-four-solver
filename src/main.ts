// Only the Latin letters of IBM Plex Sans and the Hebrew letters of IBM Plex Sans Hebrew:
// the page needs no other alphabet, so nothing else is shipped.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-sans-hebrew/hebrew-400.css';
import '@fontsource/ibm-plex-sans-hebrew/hebrew-500.css';
import '@fontsource/ibm-plex-sans-hebrew/hebrew-600.css';
import '@fontsource/ibm-plex-sans-hebrew/hebrew-700.css';
import './style.css';
import type { SolverResponse } from './solver/solver.worker';
import { App } from './ui/app';
import { introDue, loadSettings, markIntroShown, type SettingsStore } from './ui/settings';
import { SolverClient } from './ui/solverClient';
import { GameView } from './ui/view';

const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Missing #app element in index.html');
}

// The solver runs in its own thread, so the page never freezes while it thinks.
const worker = new Worker(new URL('./solver/solver.worker.ts', import.meta.url), { type: 'module' });
const solver = new SolverClient((request) => worker.postMessage(request));
worker.onmessage = (event: MessageEvent<SolverResponse>) => solver.receive(event.data);
worker.onerror = (event) => solver.failAll(event.message || 'The solver stopped working');

/** One of the browser's storages, or null where even reaching it is blocked. */
function browserStorage(kind: 'localStorage' | 'sessionStorage'): SettingsStore | null {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

const store = browserStorage('localStorage');
const view = new GameView(container);
new App(view, solver, loadSettings(store, navigator.languages), store);

// Every visit opens with "How to play" and the panel about the computer;
// reloading or playing again in the same tab does not open it again.
const session = browserStorage('sessionStorage');
if (introDue(session)) {
  view.openRules(true);
  markIntroShown(session);
}
