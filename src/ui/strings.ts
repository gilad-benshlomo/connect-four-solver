/**
 * Every text the page shows, in English and in Hebrew. Hebrew addresses the
 * player in the masculine or the feminine, as the player chooses, so there
 * are three versions. Only texts that address the player differ between the
 * two Hebrew versions.
 */

/** The languages of the page. */
export type Language = 'en' | 'he';

/** How Hebrew addresses the player. English has one form for both. */
export type Address = 'masculine' | 'feminine';

/** A number with what it counts, for the "about the computer" section. */
export type Stat = { value: string; label: string };

/** All the page's texts in one language (and, in Hebrew, one form of address). */
export type Strings = {
  /** The browser tab's title. */
  documentTitle: string;
  title: string;
  subtitle: string;

  whoGoesFirst: string;
  iGoFirst: string;
  computerGoesFirst: string;
  /** Shown under the two choices, one line each: the computer first, then the player. */
  startExplanation: readonly [string, string];
  /** Shown during a game the computer started. */
  computerStartedMessage: string;
  /** Shown during a game the player started. */
  playerStartedMessage: string;

  yourTurn: string;
  computerThinking: string;
  /** Added when the computer has been thinking for a few seconds. */
  thinkingSlow: string;

  youWin: string;
  /** Praise for a win, given the number of the player's moves. */
  youWinMessage: (moves: number) => string;
  computerWins: string;
  /** How long the player held out, given the number of the player's moves. */
  lasted: (moves: number) => string;
  draw: string;
  drawMessage: string;
  playAgain: string;
  newGame: string;

  errorTitle: string;
  errorMessage: string;

  you: string;
  computer: string;
  boardLabel: string;
  /** The label of the button that drops a disc in a column (1 to 7). */
  dropInColumn: (column: number) => string;

  howToPlay: string;
  rulesTitle: string;
  rules: string[];
  aboutTitle: string;
  /** Two paragraphs: what the computer can do, then how it is built to do it fast. */
  aboutText: readonly [string, string];
  stats: Stat[];
  gotIt: string;
  close: string;

  sourceCode: string;
  languageLabel: string;
  addressLabel: string;
  masculine: string;
  feminine: string;
};

const en: Strings = {
  documentTitle: 'Connect Four against a perfect solver',
  title: 'Connect Four',
  subtitle: 'You against a perfect solver.',

  whoGoesFirst: 'Who goes first?',
  iGoFirst: 'I go first',
  computerGoesFirst: 'Computer goes first',
  startExplanation: [
    'If the computer goes first, it always wins.',
    'If you go first, you can win, but only with a perfect game.',
  ],
  computerStartedMessage: 'You’re going to lose. Let’s see how long you can survive.',
  playerStartedMessage: 'You can win, but only with a perfect game.',

  yourTurn: 'Your turn',
  computerThinking: 'Computer is thinking',
  thinkingSlow: 'Perfect play takes a moment.',

  youWin: 'You beat the perfect solver!',
  youWinMessage: (moves) =>
    `Not one of your ${moves} moves let the win slip. That takes a perfect game, and you played one.`,
  computerWins: 'The computer wins',
  lasted: (moves) => (moves === 1 ? 'You lasted 1 move.' : `You lasted ${moves} moves.`),
  draw: 'A draw!',
  drawMessage:
    'Well done, you’re almost there. A draw means you didn’t make a single losing move all game. Only a perfect game does better.',
  playAgain: 'Play again',
  newGame: 'New game',

  errorTitle: 'Something went wrong',
  errorMessage: 'The computer could not choose a move. Start a new game to keep playing.',

  you: 'You',
  computer: 'Computer',
  boardLabel: 'Game board',
  dropInColumn: (column) => `Drop a disc in column ${column}`,

  howToPlay: 'How to play',
  rulesTitle: 'How to play',
  rules: [
    'Two players take turns dropping discs into one of the seven columns.',
    'A disc falls to the lowest free space in its column.',
    'The first to line up four discs in a row, a column or a diagonal wins.',
    'If the board fills up with no line of four, it’s a draw.',
  ],
  aboutTitle: 'About the computer',
  aboutText: [
    'James D. Allen and Victor Allis proved that in Connect Four, the player who goes first and never makes a mistake always wins. This computer never makes a mistake. If it goes first, you can’t beat it. If you choose to go first, you can win, but only if you play without a single mistake. One mistake, and the win is gone: at best, a draw.',
    'For all this to happen in real time, it’s built to decide fast. The whole board is encoded in two numbers, so checking for a win takes a few arithmetic operations. On every turn it searches the game tree again, to the end: trying the most threatening moves first, skipping branches that provably can’t change the result, and remembering positions it has already worked out. The opening, where the tree is largest, was solved in advance. The search runs apart from the page, so the page never freezes, and it all happens in your browser, in code written from scratch.',
  ],
  stats: [
    { value: '4,531,985,219,092', label: 'possible positions on the board' },
    { value: '3,857', label: 'opening positions solved in advance' },
    { value: '1988', label: 'the year the game was solved mathematically' },
  ],
  gotIt: 'Got it',
  close: 'Close',

  sourceCode: 'Source code on GitHub',
  languageLabel: 'Language',
  addressLabel: 'Form of address',
  masculine: 'Masculine',
  feminine: 'Feminine',
};

const heMasculine: Strings = {
  documentTitle: 'ארבע בשורה מול פותר מושלם',
  title: 'ארבע בשורה',
  subtitle: 'אתה מול פותר מושלם.',

  whoGoesFirst: 'מי מתחיל?',
  iGoFirst: 'אני מתחיל',
  computerGoesFirst: 'המחשב מתחיל',
  startExplanation: ['אם המחשב מתחיל, הוא תמיד מנצח.', 'אם אתה מתחיל, תוכל לנצח, אבל רק במשחק מושלם.'],
  computerStartedMessage: 'אתה הולך להפסיד, אבל בוא נראה כמה זמן תצליח לשרוד.',
  playerStartedMessage: 'תוכל לנצח רק אם תשחק משחק מושלם.',

  yourTurn: 'תורך',
  computerThinking: 'המחשב חושב',
  thinkingSlow: 'משחק מושלם לוקח רגע.',

  youWin: 'ניצחת את הפותר המושלם!',
  youWinMessage: (moves) =>
    `אף אחד מ-${moves} המהלכים שלך לא איבד את הניצחון. זה דורש משחק מושלם, ושיחקת אחד כזה.`,
  computerWins: 'המחשב ניצח',
  lasted: (moves) => (moves === 1 ? 'החזקת מעמד מהלך אחד.' : `החזקת מעמד ${moves} מהלכים.`),
  draw: 'תיקו!',
  drawMessage:
    'כל הכבוד, אתה כמעט שם. תיקו אומר שלא עשית אף מהלך מפסיד במשך כל המשחק. רק משחק מושלם משיג יותר.',
  playAgain: 'עוד משחק',
  newGame: 'משחק חדש',

  errorTitle: 'משהו השתבש',
  errorMessage: 'המחשב לא הצליח לבחור מהלך. כדי להמשיך לשחק, אפשר להתחיל משחק חדש.',

  you: 'אתה',
  computer: 'המחשב',
  boardLabel: 'לוח המשחק',
  dropInColumn: (column) => `הטלת דיסקית לעמודה ${column}`,

  howToPlay: 'איך משחקים',
  rulesTitle: 'איך משחקים',
  rules: [
    'שני שחקנים מטילים דיסקיות לסירוגין לאחת משבע העמודות.',
    'הדיסקית נופלת למקום הפנוי הנמוך ביותר בעמודה.',
    'מנצח מי שיוצר ראשון רצף של ארבע דיסקיות: בשורה, בטור או באלכסון.',
    'אם הלוח מתמלא בלי רצף, זה תיקו.',
  ],
  aboutTitle: 'על המחשב',
  aboutText: [
    'ג׳יימס אלן וויקטור אליס הוכיחו שבארבע בשורה, מי שמתחיל ומשחק בלי אף טעות מנצח תמיד. המחשב הזה משחק בלי אף טעות. אם הוא מתחיל, אי אפשר לנצח אותו. אם תבחר להתחיל, תוכל לנצח, אבל רק אם תשחק בלי אף טעות. טעות אחת, והניצחון כבר לא אפשרי: במקרה הטוב, תיקו.',
    'כדי שכל זה יקרה בזמן אמת, הוא בנוי להחליט במהירות. כל הלוח מקודד בשני מספרים, כך שבדיקת ניצחון היא כמה פעולות חשבון. בכל תור הוא סורק מחדש את עץ המשחק עד הסוף: בוחן קודם את המהלכים המאיימים, מדלג על ענפים שמוכח שלא ישנו את התוצאה, וזוכר עמדות שכבר חישב. את הפתיחה, שבה העץ הכי גדול, פתר מראש. החישוב רץ בנפרד מהדף, כך שהדף אף פעם לא נתקע, והכל קורה בדפדפן שלך, בקוד שנכתב מאפס.',
  ],
  stats: [
    { value: '4,531,985,219,092', label: 'עמדות אפשריות בלוח' },
    { value: '3,857', label: 'עמדות פתיחה שנפתרו מראש' },
    { value: '1988', label: 'השנה שבה המשחק נפתר מתמטית' },
  ],
  gotIt: 'הבנתי',
  close: 'סגירה',

  sourceCode: 'קוד המקור בגיטהאב',
  languageLabel: 'שפה',
  addressLabel: 'פנייה',
  masculine: 'זכר',
  feminine: 'נקבה',
};

/**
 * The texts that address the player. In Hebrew these are the only ones that
 * change with the form of address; a test checks that no other text does.
 */
export const ADDRESSED_KEYS = [
  'subtitle',
  'iGoFirst',
  'startExplanation',
  'computerStartedMessage',
  'playerStartedMessage',
  'drawMessage',
  'aboutText',
  'you',
] as const satisfies readonly (keyof Strings)[];

const heFeminine: Strings = {
  ...heMasculine,
  subtitle: 'את מול פותר מושלם.',
  iGoFirst: 'אני מתחילה',
  startExplanation: ['אם המחשב מתחיל, הוא תמיד מנצח.', 'אם את מתחילה, תוכלי לנצח, אבל רק במשחק מושלם.'],
  computerStartedMessage: 'את הולכת להפסיד, אבל בואי נראה כמה זמן תצליחי לשרוד.',
  playerStartedMessage: 'תוכלי לנצח רק אם תשחקי משחק מושלם.',
  drawMessage:
    'כל הכבוד, את כמעט שם. תיקו אומר שלא עשית אף מהלך מפסיד במשך כל המשחק. רק משחק מושלם משיג יותר.',
  you: 'את',
  aboutText: [
    'ג׳יימס אלן וויקטור אליס הוכיחו שבארבע בשורה, מי שמתחיל ומשחק בלי אף טעות מנצח תמיד. המחשב הזה משחק בלי אף טעות. אם הוא מתחיל, אי אפשר לנצח אותו. אם תבחרי להתחיל, תוכלי לנצח, אבל רק אם תשחקי בלי אף טעות. טעות אחת, והניצחון כבר לא אפשרי: במקרה הטוב, תיקו.',
    heMasculine.aboutText[1],
  ],
};

/** All three versions, exported for the tests. */
export const ALL_STRINGS = { en, heMasculine, heFeminine } as const;

/** Returns the texts for a language and, in Hebrew, a form of address. */
export function stringsFor(language: Language, address: Address): Strings {
  if (language === 'en') return en;
  return address === 'feminine' ? heFeminine : heMasculine;
}
