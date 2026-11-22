import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-sans-hebrew/400.css';
import '@fontsource/ibm-plex-sans-hebrew/500.css';
import '@fontsource/ibm-plex-sans-hebrew/600.css';
import '@fontsource/ibm-plex-sans-hebrew/700.css';
import './style.css';
import { stringsFor } from './ui/strings';
import { GameView } from './ui/view';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app element in index.html');
}

const view = new GameView(app);
view.setStrings(stringsFor('en', 'masculine'), 'en');
