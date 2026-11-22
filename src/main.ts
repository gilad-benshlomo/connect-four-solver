import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-sans-hebrew/400.css';
import '@fontsource/ibm-plex-sans-hebrew/500.css';
import '@fontsource/ibm-plex-sans-hebrew/600.css';
import '@fontsource/ibm-plex-sans-hebrew/700.css';
import './style.css';
import type { SolverResponse } from './solver/solver.worker';
import { App } from './ui/app';
import { SolverClient } from './ui/solverClient';
import { stringsFor } from './ui/strings';
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

new App(new GameView(container), solver, stringsFor('en', 'masculine'), 'en');
