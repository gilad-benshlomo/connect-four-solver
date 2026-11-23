# Development Journey — Connect Four Solver

A running log of how this project was planned and built: the steps, the tools, the decisions, and what changed along the way. It is updated at the end of every work session.

**Live site:** https://gilad-benshlomo.github.io/connect-four-solver/

---

## Goal

Build a Connect Four game in which a visitor plays against the computer, playable in one click from a link (desktop and phone), as a portfolio project.

### Two critical requirements
1. **A perfect-play solver.** The player chooses who starts.
   - If the computer starts, it always wins (Connect Four is a solved game: the first player wins with perfect play).
   - If the player starts, the player wins only by playing perfectly for the whole game.
   - Among winning moves the solver picks the fastest win; when losing, it picks the longest loss.
2. **Professional, high-quality visuals** that look good on both desktop and phone, since most visitors will arrive from a LinkedIn post.

### How correctness will be proven
- Tests against published benchmark positions with known exact scores.
- Thousands of automated games with the computer moving first: it must win all of them.
- Solver vs. solver: the first player must always win.

---

## Key decisions

| # | Decision | Reason |
|---|---|---|
| D1 | **Game-tree search, not machine learning** | Connect Four is solved. Minimax with alpha-beta pruning (plus bitboards, a transposition table, move ordering and an opening book) can play perfectly. An ML model would be weaker and harder to build. |
| D2 | Repo name **`connect-four-solver`** | Highlights the strongest part of the project. Accepted that the name commits us to a true perfect-play solver. |
| D3 | First stack: **Python + Pygame**, deployed to the web with **pygbag** | Preference for Python. |
| D4 | **Deploy early** with an empty window, before writing game logic | Find web-deployment problems while the codebase is ~30 lines, not ~500. |
| D5 | **Switch to TypeScript** (web app on GitHub Pages) | See "Phase 2" below. Both critical requirements are better served by a native web app. |
| D6 | **Vitest** for unit tests | Same ecosystem as Vite; runs TypeScript without extra configuration. |
| D7 | **Two board representations:** a simple list of columns for the game, a private bitboard for the solver | Game rules and UI stay readable, while the solver gets the speed it needs. The solver receives only the move history and returns a column, so no shared state has to be kept in sync. Two independent rule implementations can also be cross-checked on thousands of random games. |
| D8 | `dropDisc` **returns a new board** instead of changing the existing one | Code still holding the old board (such as a running animation) is not affected. The cost is negligible, since the fast search happens on the bitboard. |
| D9 | **A game-state layer** on top of the board: board, move history and status. The UI talks only to this layer | The rules can refuse illegal sequences (two moves in a row by the same player, moves after the game ended) even if the UI has a bug. |
| D10 | The current player is **derived from the number of moves**, not stored | One source of truth: the turn can never disagree with the history. |
| D11 | **X always moves first**; which player is the human is decided by the UI | The rules and the solver only need to know who moved first. Human vs. computer, two humans or computer vs. computer are all UI changes. |
| D12 | The status is a **discriminated union**: playing, won (with winner and line) or draw | Contradictory states cannot be written, and TypeScript refuses to read a winner without first checking that the game was won. |
| D13 | **Unit tests run in GitHub Actions** after installing dependencies and before the build | A failing test stops the workflow, so broken logic never reaches the live site. |
| D14 | **Comments in English:** JSDoc above every exported function and type, short `//` comments only where the reason is not obvious | Readable for anyone visiting the repo; VS Code shows JSDoc on hover. |
| D15 | **The solver follows Pascal Pons's published approach** (negamax with alpha-beta, centre-first move order, bitboard, score = 22 minus the winner's disc count), **but the code is written from scratch**, and the README credits his tutorial and benchmark positions | Being open about the source is more professional than presenting a known approach as new. His code is AGPL v3 and this repo is MIT, so no code is copied. What is ours: the TypeScript/browser port, the 32-bit question decided by measurement, the Web Worker, the cross-checking tests and the UI. |
| D16 | **The bitboard is built twice behind one interface:** BigInt as a readable reference that stays in the tests, and two 32-bit numbers as the fast version. Both must agree on every position; measurements decide which one runs on the site; WebAssembly only if neither is fast enough | JavaScript bitwise operators cut numbers to 32 bits, and the board needs 49. Only the board module knows how bits are stored: the search, move ordering, transposition table and tests see plain numbers (columns, scores, keys), so swapping versions touches one file. |
| D17 | **How the search is built and checked:** the search copies the position (`clone`) before each move instead of undoing it; a plain negamax comes first, then alpha-beta pruning, which must return exactly the same scores; test positions are a few hand-built ones plus the published benchmark sets | Copying is the version that is hard to get wrong; undo is added only if measurements show copying is a bottleneck. Pruning is the delicate part, so it is checked against a search with no pruning at all. Hand-built positions pinpoint what broke; published positions are the independent proof, and catch a misunderstanding that the code and our own tests would share. |
| D18 | **The published benchmark files stay out of the repository:** they live in `benchmarks/` (listed in `.gitignore`), and the test that reads them runs only when they are present and is skipped otherwise (e.g. in CI). The README will say where to download them. To be revisited if the author gives permission to include them | The tutorial page only says "© 2019 Pascal Pons", with no licence for the data, so copying the files into a public repo would be redistribution without permission. A single example position quoted from the page, with credit, is used in the normal tests. |
| D19 | **How speed is measured:** `npm run measure` runs `*.measure.ts` files with their own Vitest config, never as part of `npm test`; one warm-up run, then the median of 3 runs; columns as in the tutorial (mean time, slowest, mean explored positions, positions per second). Explored counts must be identical across boards and runs | Timings vary, tests must not. Explored positions measure the algorithm, time measures the code; when only the board changes, only the time may move. Speed numbers differ between the test runner, plain Node and Chrome, so small differences are not trusted (see the lessons) |
| D20 | **The fast board splits the 49 bits by columns:** `PairPosition` keeps columns 0–3 (28 bits) in one 32-bit number and columns 4–6 (21 bits) in another; shifts that cross the halves go through small helper functions. Both boards implement one `Position` interface, which the search uses | Drops never cross the halves, and no value ever reaches bit 31, so JavaScript's signed 32-bit operators are safe. Measured about 8× faster than BigInt; it is the board the search runs on. BigInt stays as the reference in the tests (D16) |
| D21 | **Transposition table:** a fixed-size table indexed by `key % size`, storing only the low 32 bits of the key (`Uint32Array`) and an upper bound on the score (`Uint8Array`, 0 = empty). The size must be an odd number above 2^17 | The slot plus the low 32 bits identify a 49-bit key exactly when the size is odd and above 2^17 (Chinese remainder theorem), so no wrong hit is possible. Storing only upper bounds is what alpha-beta can always prove after a search that found no move above alpha |
| D22 | **`solve` uses null-window searches** (a binary search on the score, each step asking only "above or below this value?"); the full-window search stays as `solveFullWindow`, a reference in the tests | Narrow windows prune far more. Rounding with `Math.floor` was chosen by measurement over `Math.trunc` (half the explored positions in Middle-Easy) |
| D23 | **Move ordering:** the search tries only moves that do not let the opponent win at once (`nonLosingColumns`), the ones that make the most threats first (`threatsAfter`), and the centre-first order among equals | The filter alone cut explored positions by 37% but did not save time; with the threat ordering, positions dropped 10–60× on hard opening positions and time 2–150×. Measured before writing it into the project |
| D24 | **Opening book:** for each position on the computer's turn before move 10, the book stores the computer's move (the best score: fastest win or slowest loss; centre first among equals). A position and its mirror image share one entry. The first move when the computer starts is fixed to the centre, the only winning first move (Allis, 1988). Two books: computer first and player first. Built offline by a resumable script as JSON `[key, column]` pairs (first into `public/`; moved on 2026-11-21, D26) | Early positions are too slow to solve during a game (minutes or more); after move 10 the solver answers in about a second. Mirror images halve the work and the file. The book is our own output, so it goes into the repo |
| D25 | **Imports in the solver include the `.ts` extension**, so Node 24 runs the TypeScript files directly (type stripping), with no extra tool | The book build runs for hours as a plain Node program, not as a test. `allowImportingTsExtensions` was already on; Vite and Vitest accept both forms |
| D26 | **The books live in `src/solver/books/` and are imported into the code** (`books.ts`, `loadBooks`), not downloaded from `public/` | They are small (about 70 KB, about 24 KB compressed together with the solver), so there is no separate download that can fail or arrive late. A missing file fails the tests and the build instead of being skipped. `public/` is for files served as they are, and the copies there would have suggested that the site loads them |
| D27 | **`chooseColumn(moves, books, search)`** holds the whole "which column" logic: it rebuilds the position, refuses illegal moves and finished games, takes the book by the number of moves (even: the computer started), plays the book before move 10, and otherwise calls the `search` it is given | One plain function, tested in Vitest; the Web Worker only wraps it. The search is passed in so that tests which must be answered by the book can pass one that fails at once: with the real search, a wrong book sent a test into a search of the empty board, and the run hung instead of failing |
| D28 | **The solver runs in a Web Worker** (`solver.worker.ts`): requests `{ id, moves }`, answers `{ id, column }` or `{ id, error }`; one transposition table of 8,388,617 entries (about 40 MB) for the worker's whole life | The page never freezes while the computer thinks. Errors come back as answers with their id, so the page never waits for ever. The table size was chosen by measuring in the browser (see 2026-11-21): 40 MB cut the slowest move tried from 4.4 s to 1.4 s on the PC, and an iPhone 14 handled it |
| D29 | **The fonts are served by the site itself** (`@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-sans-hebrew`, OFL licence), and only their Latin and Hebrew letters are shipped | No request to an outside server: faster on a phone, works where Google is blocked, and no tracking. The browser downloads only the letters it needs. The first build shipped every alphabet (1.2 MB of files); keeping two cut the site to about 390 KB |
| D30 | **The page is plain TypeScript and DOM, no framework.** Everything that decides lives in modules with no DOM and is tested in Vitest (`strings`, `flow`, `solverClient`, `status`, `settings`); the view (`view`, `boardView`, `rulesDialog`) only shows, and is checked in Chrome with screenshots | One screen does not need a framework, and the site stays small. Testing the view itself would need a fake browser package; the logic around it is covered instead |
| D31 | **The board is three layers:** the discs, a blue face with transparent holes drawn over them, and seven invisible column buttons on top | A falling disc passes behind the face, as in the real game; the buttons make every column a real control for mouse, touch and keyboard |
| D32 | **Language and form of address:** the first visit is in Hebrew, addressed in the masculine (until 2026-11-22 it followed the browser's language); the player's choice is then kept in the browser's storage. Hebrew has a masculine and a feminine version of the texts that address the player, chosen next to "who goes first" | No extra step before playing; a returning player finds the page as they left it. Storage may be blocked, so every use of it falls back quietly |
| D33 | **"How to play" opens by itself once per visit**, kept in `sessionStorage` (a reload or a new game does not open it again; a new tab or browser session does). When the page opens it, the focus goes to the window itself, not to the close button | Visitors from a CV read what the project is before they play. Opening it before every game would be annoying; `sessionStorage` matches "a visit" with no code to expire it |
| D34 | **Fireworks:** where and when the bursts go off and how the sparks move are pure functions (`fireworks.ts`, tested); `fireworksView.ts` only draws them on a canvas over the board. 15 s for a win, 4 s for a draw, at the same pace; nothing with reduced motion; clicks pass through | The same split as D30: what can be tested is tested, the drawing is checked by screenshots. The win lasts long enough to enjoy and to take a screenshot |

---

## Session log

### 2026-11-03 — Planning and repository setup
- Defined the vision: user vs. computer, playable from a link, strongest possible computer player, smooth animations.
- Chose game-tree search over ML (D1) and the repo name (D2).
- Agreed on a working method: one small step at a time, each with *what / why / how / expected result*, every command explained, moving on only after approval.
- Checked tools: Git 2.45.1, Python 3.13.12.
- Configured Git identity (`user.name`, `user.email`) so commits are linked to the GitHub profile.
- Created the public GitHub repo with a README, a Python `.gitignore` and the MIT license.
- Cloned it locally and verified the link to GitHub (`git log`, `git remote -v`).

### 2026-11-08 — Python environment and first window
- Opened the project in VS Code and installed the Microsoft Python extension (Python, Pylance, Python Debugger, Python Environments).
- Created a virtual environment (`.venv`) to isolate the project's libraries; confirmed Git ignores it.
- Installed `pygame-ce` 2.5.8 and `pytest` 9.2.0; pinned them in `requirements.txt`.
- First own commit and push: `96c541a` — *Add requirements.txt with project dependencies*.
- Wrote `game/main.py`: a Pygame window with a game loop (input → update → draw), written in async form (`await asyncio.sleep(0)`) so it can run in a browser.
- Lesson: the first run did nothing because the file was not saved (● on the editor tab). Python runs the file on disk, not what is shown in the editor.

### 2026-11-09 — Web test, re-evaluation, and the switch to TypeScript
- Committed and pushed the first window: `47bbc6f` — *Add initial Pygame window with async game loop*.
- Installed `pygbag` and ran the game in a browser locally (`python -m pygbag game`).
  - It worked. First load took about 5 seconds.
  - The server log showed the browser downloads a full CPython 3.12 (WebAssembly) and a browser build of pygame-ce 2.5.7 before the game starts.
- Re-evaluated the stack against the two critical requirements (see Phase 2).
- Checked the new toolchain: Node.js v24.16.0, npm 11.13.0.
- Removed the Python prototype in a dedicated commit: `d813f5b` — *Remove Python prototype before TypeScript rewrite* (`git rm` for tracked files; ignored leftovers `game/build` and `.venv` deleted separately).
- Started this journey document and added it to the repo: `430f95e`.
- Scaffolded the TypeScript project with `create-vite` 9.3.4 (template `vanilla-ts`, no framework), choosing *Ignore files and continue* so LICENSE, README and docs were kept. This also replaced the Python `.gitignore` with the Node.js one (`node_modules`, `dist`, logs, editor files).
- `npm install`: 17 packages, 0 known vulnerabilities. `package-lock.json` pins exact versions and is committed.
- Ran the dev server (`npm run dev`, ready in ~200 ms) and saw Hot Module Replacement update the page title without a reload.
- Replaced the Vite demo with a minimal page (dark background `#141826`, the same colour as the Python prototype) and removed the demo files.
- `npm run build` (`tsc && vite build`): the whole site is three files, about 1.5 KB, under 1 KB gzipped — compared with megabytes of Python runtime in the pygbag version.
- Committed the clean skeleton: `a3ae92b`.
- Set Vite's `base` to `/connect-four-solver/` so asset links work under the GitHub Pages sub-path; verified with `npm run preview`: `b28a877`.
- Set the GitHub Pages source to **GitHub Actions** and added a workflow (`.github/workflows/deploy.yml`): on every push to `main` it checks out the code, sets up Node 24, runs `npm ci` and `npm run build`, uploads `dist`, and deploys. `e5445ae`.
- First deployment succeeded in 25 seconds (build 9 s, deploy 10 s). The site loads quickly on desktop and on a phone over 4G.
- Lessons:
  - An unsaved file (● on the tab) is invisible to every tool; Vite's HMR made that obvious.
  - While a server runs, the terminal belongs to it; stop it (`q` or `Ctrl+C`) and wait for the prompt before running the next command.
  - Check `git status` before `git add .`.
- Setup stage complete. Next: game logic with unit tests.

### 2026-11-09 (continued) — Test tooling and the first game logic
- Installed Vitest 5.1.0 as a development dependency: 20 packages added, 0 known vulnerabilities.
- Wrote a temporary sanity test, watched it pass, then broke it on purpose to confirm a failure is reported and to learn how to read the report.
- Added the `npm test` script (`vitest run`): `815a813`.
- Chose the board representation after comparing a matrix, a list of columns and a bitboard (D7).
- Added `src/game/board.ts` (constants, `Player` and `Board` types, `createBoard`) and 2 unit tests, and deleted the temporary test: `6c1c40f`.
- `npm run build` still passes, and the site is still about 1.5 KB: neither the tests nor the unused game code reach the bundle.
- Stopped in the middle of step 10: `isLegalMove`, `dropDisc` and 5 more tests were specified, but they have not been run or committed yet.
- Lessons:
  - A test only means something once it has been seen to fail.
  - Vitest does not check types; `tsc` (part of `npm run build`) does, so run both before pushing.
  - In JSON every item except the last needs a trailing comma, and the error is often marked on the line after the mistake.
  - Add files by name when something temporary must stay out of a commit.
  - The `LF will be replaced by CRLF` warning is about line endings on Windows and is harmless here.

### 2026-11-10 — Game logic complete
- Started by checking the state left from the last session (`git status`, `git log --oneline -3`, `npm test`).
- Added `isLegalMove` and `dropDisc`, with tests for stacking, immutability and the board's edges: `7889976`.
- Added `winningLine`: it checks only around the last disc, counts in both directions along each of the four lines, and returns the winning cells so the UI can highlight them: `f6d86d8`.
- Broke `winningLine` on purpose with the two classic bugs (counting in one direction only, and `> 4` instead of `>= 4`). Each was caught by a different set of tests, which showed why several examples are needed.
- During that exercise an edit accidentally deleted `return null`. The tests showed only the symptom (`undefined` instead of `null`); `tsc` pointed to the exact line, thanks to the explicit return type.
- Added `isBoardFull`, tested at the boundary of 41 and 42 discs: `f827ae2`.
- Added English comments to the board code and its tests, as a separate comments-only commit verified by the unchanged test count: `1e9de2f`.
- Designed the game-state layer (D9–D12) and added `game.ts` with `newGame` and `currentPlayer`: `9d8d9f1`.
- Added `playMove`, which checks for a win before a full board. Two hand-built 42-move games test a draw and a win that also fills the board; reversing the two checks on purpose made only the second one fail: `6b42417`.
- Added a `Run unit tests` step to the workflow (D13): `5e5b5a5`. The build job passed and GitHub showed a Vitest test report (2 files, 32 tests). The deploy job failed with *Deployment failed, try again later*, a GitHub Pages error; *Re-run failed jobs* succeeded.
- Game logic stage complete: 32 tests across `board.test.ts` and `game.test.ts`.
- Lessons:
  - Vitest finds wrong behaviour; `tsc` finds code that does not match its types. Run both before every commit.
  - Break a test on purpose to prove it catches the bug it was written for.
  - You cannot test every board. Test one example of each case the code tells apart (equivalence classes), plus the boundaries between them.
  - When a game must not end early, design the final board first, then find a move order that reaches it.
  - When editing, select only the characters that change; selecting whole lines is how `return null` was lost.
  - Paste one command at a time: two commands on one line make Git read the second as file names.
  - Files opened from a Git or extension view are read-only copies; `code <path>` opens the real file.

### 2026-11-10 (continued) — Solver planning: how to fit a 49-bit board
- Started by checking the state (`git status` clean, last commit `f8bdf37`, 32 tests passing).
- Worked through the bitboard layout: 7 bits per column (6 cells plus an empty helper row), cell index = column × 7 + row, 49 bits in total. The helper row stops horizontal and diagonal shifts from wrapping a disc from the top of one column into the bottom of the next. Dropping a disc is one addition: the carry rises to the first empty cell.
- The problem: a JavaScript number holds integers exactly up to 53 bits, but every bitwise operator first cuts its operands to 32 bits. Cells 32–48 (the top of column 4 and columns 5–6) would be silently lost.
- Compared the options:
  - **BigInt:** no size limit, code reads like the published solver; slow, because every operation allocates a new value, and it cannot be mixed with ordinary numbers.
  - **Two 32-bit numbers:** fast; every shift and every drop in column 4 must carry bits across the boundary by hand, and a mistake gives wrong answers silently. Splitting by columns (0–3 and 4–6) would remove the problem for drops but not for shifts.
  - **WebAssembly:** a real 64-bit type and the best speed, at the cost of another language and toolchain.
  - **The existing list-of-columns board:** too slow for search, but useful as the referee in tests.
- **Proposed, not yet decided:** build BigInt first as a readable reference, cross-check it against the game logic on random games, add a basic alpha-beta search, and measure. Then build the two-number version, require it to pass the same tests and agree with BigInt on every position, measure again, and decide. Keep WebAssembly only if measurements demand it. Both versions would expose the same small interface so the search is written once. (Confirmed on 2026-11-15 as D16.)
- No code changes this session.
- Lessons:
  - JavaScript bitwise operators work on 32 bits and fail silently: `(2 ** 32 + 5) | 0` is `5`, `1 << 31` is negative, `1 << 32` is `1`.
  - To choose "by measurement", you need at least two working versions to measure.

### 2026-11-12 / 2026-11-13 — Questions and a written summary
- Clarified that the project is written in TypeScript, not Java. Java has a 64-bit integer type, but browsers do not run Java; it would only matter as one possible source language for the WebAssembly option, so it adds no new option.
- Prepared a three-page Word summary of the project for review: architecture and the reasons behind it, important commands, and topics to understand before presenting the project.

### 2026-11-15 — The solver: concepts, reference bitboard, negamax, alpha-beta, published benchmark
**Concepts first (no code).** Walked through the whole solver, one idea per step:
1. Why search and not machine learning: the requirements are absolute ("always wins", "fastest win"), and only a search gives exact, provable answers. Connect Four was solved in 1988 (first player wins); about 4.5 trillion positions, so the search must be smart, not exhaustive.
2. Negamax: a position's value is worked out from the leaves up; each side picks what is best for itself; one function, flipping the sign at every level.
3. Leaves are scored by the game rules only (a win by the last disc, or a full board); the player to move at a leaf is always the loser or it is a draw.
4. The score encodes *when*: 22 minus the winner's disc number (18 for a win with the 4th disc, 1 for the 21st, negative for losses, 0 for a draw). Taking the maximum then picks the fastest win and the longest loss on its own.
5. Alpha-beta pruning skips branches that cannot change the result; it saves the most when good moves are tried first.
6. Move ordering: centre columns first (they take part in more lines), plus exact filters (forced blocks, not playing under an opponent's winning cell).
7. Transposition table: reuse results for positions reached in different orders; a fixed-size table indexed by key modulo size, storing the full key and whether the stored value is exact or only a bound.
8. Bitboard operations: `canPlay`, `play` (XOR to pass the turn, addition to drop), four-in-a-row with shifts of 1, 7, 6 and 8, and a unique key `current + mask + bottom row`.
9. Opening book: early positions are the most expensive and never change, so they are solved once offline; depth chosen by measurement.
10. How it all connects: the UI sends only the move list to a Web Worker and gets a column back; the answer goes through `playMove` like a human move; a request id discards answers that arrive after a new game was started.

**Decisions:** learned that this approach follows Pascal Pons's tutorial and decided to credit it and write our own code (D15); confirmed the two-bitboard plan (D16); decided how the search is built and checked (D17); kept the published benchmark files out of the repo (D18).

**Built** (every step: code with tests, then a deliberate break with a prediction, then a commit):
- `src/solver/bigintPosition.ts`: the BigInt reference bitboard: `canPlay`, `play` (changes the position in place, unlike the game board, because the search copies explicitly), `isWinningMove`, `key` (returned as a plain number, exact because it fits in 49 bits), `clone`. Commits `4d72b1a`, `c8192e4`, `cbaebef`, `ae5612c`, `9c2ef97`.
- A cross-check test: 500 seeded random games played on the game board and the bitboard side by side, comparing legal moves and winning moves in about 10,000 positions (`ae5612c`).
- `src/solver/negamax.ts`: a plain `negamax` (the reference) and `solve`, negamax with alpha-beta pruning (`78af1de`, `816e9ef`, `f5d0e9b`).
- `src/solver/benchmark.test.ts`: the losing example from the tutorial (`44455554221`, score −15) and all 1,000 End-Easy positions (`Test_L3_R1`) read from `benchmarks/` with `import.meta.glob`; skipped when the file is missing (`91c1596`).
- 62 tests in 5 files; in CI the file-based test is skipped.

**What the deliberate breaks showed:**

| Bug introduced | Caught by |
|---|---|
| Drop without the carry (`mask \|= bottom`) | 2 tests: the column-full boundary (5 vs 6 discs) |
| No helper row (6 bits per column) | Only the test built for it (top of one column joined to the bottom of the next) |
| Three in a row counted as a win | 5 tests, because `winningMoves` lists *every* winning column |
| Key without the current player's discs | 2 tests: swapped owners, and the random uniqueness test |
| Top row left out of `columnCells` | Only the random cross-check against the game board |
| `clone` returning `this` | Only the independence test (the "copies exactly" test still passed) |
| Negamax without the sign flip | Only the loss and draw positions (immediate wins never reach the recursion) |
| Alpha-beta window not flipped | Only the comparison with plain negamax and the published positions; every hand-built position still passed |

**Found by the published positions:** negamax returned `-0` instead of `0` for some draws. Every level flips the sign, and in JavaScript `-0` is a separate value; our hand-built draw had an even number of moves left, so it never showed. A hand-built draw with five moves left was added first and seen to fail, then the fix: `0 - x` instead of `-x`.

**Measured:**
- Plain negamax on all 1,000 End-Easy positions: about 7.2 s; with alpha-beta: about 0.33 s (about 20× faster), with identical scores.
- On a scratch copy: 100 random positions with 14 moves left took about 12 s without pruning and about 0.14 s with it.
- The game-board cross-check test takes about 0.4 s; the whole suite about 1 s.

**Environment notes:**
- A new PowerShell terminal refused `npm` (`npm.ps1 cannot be loaded because running scripts is disabled`); the first terminal worked. `npm.cmd test` is a fallback that the policy does not block.
- The tutorial site failed the certificate check in the Claude app's built-in browser (certificate issued for a different name); it opened normally in the user's own browser.
- With Vite 8.3 and Vitest 5.1: `import.meta.glob` needs a wildcard (a plain file name fails); the built-in `bench` API did not work; a separate Vitest config file that includes only `*.measure.ts` files does work.

**Proposed, not yet decided — how to measure speed** (confirmed in the next session as D19):
1. What: mean time per position, mean number of explored positions, and positions per second (the same columns as the tutorial's table). Explored positions must stay identical when only the board representation changes; only positions per second should move.
2. On what: the first 100 positions of End-Easy and Middle-Easy (`Test_L2_R1`, to be downloaded into `benchmarks/`).
3. How: `*.measure.ts` files run by a separate `npm run measure` with its own small Vitest config, never by `npm test` (timings vary; tests must be fast and repeatable).
4. Where: on the PC first; in the browser and on a phone later, in the Web Worker stage.
5. Results: a table in this journal, one row per version.

**Lessons:**
- A test that only checks that the right thing happens can miss a bug; also check that the wrong thing does *not* happen (the helper row, distinct keys, the clone's independence).
- Random cross-checks against an independent implementation find cases nobody thought to design.
- Hand-built positions decided by an immediate win never reach the recursive code; include losses, draws and positions that force a deep search.
- Hand-built tests check that the code matches our understanding; published data checks the understanding itself, and caught a JavaScript quirk (`-0`) that both shared.
- Before fixing a bug, add a test that fails because of it, and watch it fail.
- In VS Code, right-clicking a folder and typing `solver/name.ts` creates a nested `solver` folder; type only the file name.
- Press `Esc` before pasting a command: leftover text joined it into `npx tscnpm test`, and `npx` tried to download a package by that name.
- The path bar under the tabs shows which file is open; `bigintPosition.ts` and `bigintPosition.test.ts` are easy to mix up.
- A method pasted after the class's closing `}` is outside the class; the indentation of the brace shows what it closes.
- After reverting a deliberate break, `git status` should list only the files that really changed; an extra file means the revert was not exact.

### 2026-11-16 → 2026-11-20 — Speed, then the opening book
**Speed, in order** (each step measured on Middle-Easy, `Test_L2_R1`, and kept only if it helped):
1. Measurement first (D19): an explored-positions counter in both searches, `npm run measure`, and Middle-Easy as the baseline.
2. The fast board (D20): `PairPosition` on two 32-bit numbers, run through the same tests as BigInt (a list of implementations), checked against it on random games including keys, then a shared `Position` interface.
3. A cap on the window: no position can score more than a win with the disc after next.
4. Centre-first move order.
5. A transposition table (D21), tested on its own before being used in the search.
6. Null-window searches (D22).
7. `nonLosingColumns` on both boards (the moves that do not hand the opponent a win), tested against a slow rule built from tested operations.
8. `threatsAfter` on both boards (how many empty cells would complete four after a move), tested against a plain grid with no bits; `orderMoves`; then the search tries only safe moves, most threats first (D23).
9. Two more measurement rows: the first 100 Begin-Medium positions, and 20 Begin-Hard positions after 8 moves (where a depth-8 book would end).

**Decided not to chase small gains:** the filter on its own, a browser measurement page and other ±15% ideas were dropped once it was clear that the opening book is what makes perfect play possible, and that the solver only needs to be fast enough to build it and to play after it.

**The opening book (D24, D25):**
- `mirrorKey` (the key of the mirror image, worked out from the key as digits in base 128), `addToBook` and `bookMove` (one entry per mirror pair, under the smaller key), and `buildBook`, which walks every game where the computer follows the book and the opponent tries every move, and can be stopped and continued.
- `bestMove` in `negamax.ts`: the move with the best score, centre first among equals; used to build the book and, later, by the game after the book ends.
- `scripts/buildBook.ts`: builds both books to depth 10, saving after every entry. Started on the night of 2026-11-20; not committed yet.

**What the deliberate breaks showed** (earlier steps: the explored counter, an empty move list, the cross-half shifts, `clone` without the move count, the cap off by 4, a missing column in the order, the table without the key check, the table storing a lower bound, a too-narrow first range, a missing gap pattern in the winning cells, `upHigh` without the low half; each failed the tests predicted):

| Bug introduced | Caught by |
|---|---|
| `threatsAfter` on the fast board counting only columns 0–3 | 2 tests: the hand-built "both open ends" (one end in column 4) and the random comparison; the other hand-built tests passed, their threats being in columns 0–3 |
| `orderMoves` with `<=` instead of `<` | 4 of 5 tests: every tie came out reversed |
| An immediate loss scored one disc too early | 7 tests in 2 files, every score off by exactly one |
| `mirrorKey` putting each column one place too far | All 4 tests, already on the empty board |
| `bookMove` not mirroring the column it finds through the mirror image | 2 tests: the mirror-image test and the random one |
| `bestMove` with `>=` instead of `>` | Only the random comparison with plain negamax (a tie between columns 3 and 6) |
| `buildBook` ignoring what the book already has | 3 tests: 400 choices instead of 98, a second run choosing everything again, a stopped build losing entries |

**Measured** (on the user's PC, `npm run measure`, `PairPosition`, null window with a table):

| Set | Mean | Slowest | Mean explored |
|---|---|---|---|
| Middle-Easy, first 100: plain alpha-beta, full window | 337 ms | | |
| … with the cap | 200 ms | | |
| … with centre-first order | 3.4 ms | | |
| … with the table | 0.57 ms | | |
| … with null windows | 0.11 ms | | |
| Middle-Easy, all 1000, before / after threat ordering | 0.34 / 0.18 ms | 40 / 8.6 ms | 4,444 / 618 |
| Begin-Easy, all 1000, before / after threat ordering | 14.9 / 1.33 ms | 640 / 46 ms | 193,480 / 4,326 |
| Begin-Medium, first 100 | 463 ms | 13.2 s | 1,709,178 |
| Begin-Hard, first 20 after 8 moves | 2.84 s | 7.5 s | 10,887,630 |

On a slower scratch machine, Begin-Hard positions after 3 to 7 moves took 3–40 s each, and one after 2 moves did not finish in 5 minutes: the player-first book, whose first choices follow 2 moves, is the slow part.

**Lessons:**
- The test runner, plain Node and Chrome gave different answers about the same change (the filter: slower, faster, equal). Trust large effects, and decide close calls in the browser.
- Cutting explored positions pays only if the cut is larger than the extra work per position: 37% did not, 10–60× did.
- Check the cheap answers first: `bestMove` first solved the centre column (over two minutes) before noticing a win in column 0.
- A solver test that starts from an early position can run for minutes; keep such tests near the end of the game, and keep trial runs small.
- The expected values in a test can be wrong too: the first random book test overwrote the expected column of positions that are their own mirror image.
- Copy the files from disk and compare them before a commit: this caught an unsaved file, a line pasted into the wrong file (`orderMoves.test.ts` instead of `openingBook.test.ts`), and two imports joined on one line.
- "No test suite found" means the test file on disk is empty: save before running.

### 2026-11-20 (day) — Building the opening books
- Ran `node scripts/buildBook.ts` (depth 10) from 02:45. The computer-first book finished at 04:35: **825 entries in about 1 h 50 min**. The script then went on to the player-first book by itself.
- Some time after 05:48 Windows restarted the PC (probably an update). Nothing was lost: the script saves after every entry through a temporary file, and running the same command again continued from the same point.
- The player-first book finished at 15:16: **3,032 entries in about 5 h 50 min** in total. By the player's first move (four cases, thanks to mirror images): column 0/6, 842 entries, about 1 h 30 min; 1/5, 1,302 entries, about 2 h 50 min; 2/4, 721 entries, about 26 min; 3, 729 entries, about 30 min.
- Checked both files outside the tests, by walking every game where the computer follows the book and the opponent plays any move that does not win at once: a stored move for all 2,212 computer-first positions and all 12,627 player-first positions before move 10, none missing. Every key is distinct and every column is 0–6. Both files together are under 70 KB.
- Committed the updated journal (`f4c88c0`). The script and the two books are not committed yet; they wait for the checks planned below.
- **Planned checks (approved):** a fast test in `npm test` that reads the books from `public/` (so it also runs in CI) and checks coverage and legal moves; and a one-off script that compares a random sample of deep entries with `bestMove`, and confirms with `solve` that the computer-first book keeps the computer winning at its edge. "Thousands of games won by the computer" comes later, once the full game runs.
- Lessons:
  - Time estimates for the build were wrong both ways: the first book took far less than estimated, and the player-first branches that start near the centre, expected to be the slowest, were the fastest and smallest.
  - A long job on a home PC needs: sleep off, the power-saving mode off while plugged in, Windows updates paused, and a job that can be stopped and continued.
  - A new PowerShell terminal again refused `npm`; `npm.cmd` works.

### 2026-11-21 — Checking the books, choosing a column, and the Web Worker
- Started with the usual state check (`f4c88c0`, 146 tests, the script and the two books untracked), then committed the updated journal (`e356ce5`).
- **Backed up the books first:** the script and both books were committed and pushed before writing their test (`f6bbf73`), at the user's request. The files on GitHub were compared byte for byte with the ones on the PC.
- **A permanent test for the books** (`src/solver/bookFiles.test.ts`, `9014574`): it imports both JSON files directly (so a missing file fails, in CI too, instead of being skipped as `import.meta.glob` would) and checks the number of entries, that every column is 0–6 and every key is the smaller of the two mirror keys, and, walking every game, that all 2,212 and 12,627 positions have a playable column. About 0.2 s. A reverse check (every entry is reached) was discussed and left out for now (see the open items).
- **A one-off check against the solver** (`scripts/checkBook.ts`, `12490b0`), run once on the PC:
  - Fast part: 30 random positions after 8 moves (computer first), 30 after 9 (player first), and 30 where the computer-first book ends (after 10): **90 checked, 0 failed**, 1.7 min, slowest 10.3 s. Every edge position is a win for the computer (scores 2 to 16).
  - Early part (`early`): one position after 4 moves and one after 2 (computer first), one after 5 and one after a single move (player first): **4 checked, 0 failed**, 36.4 min. The heaviest, the reply to a first move in column 5, took 26.6 min; score 1, the computer wins with its last disc, as expected for that losing first move (Allis, 1988).
  - **Found on the way:** the plan was to require exactly the book's column, and 3 of 60 positions differed (book 4, `bestMove` 2), each time with the same score. Among equal scores `bestMove` takes the first in `COLUMN_ORDER` (3, 2, 4, …), which prefers 2 to 4; a book entry is shared with the mirror image, so it can hold the mirror of that choice. Both moves are perfect, so the check compares **scores**, not columns. In the game, the computer may play 4 in one position and 2 in its mirror; the result is the same.
- **Moved the books** to `src/solver/books/` with `git mv`, and updated the paths in the test and both scripts (`dbf93bb`, D26). The built site no longer contains JSON files.
- **`chooseColumn` and `books.ts`** (`725d03a`, D27), 10 tests: the empty board, the book chosen by the number of moves and its mirror images, the book's edge (an invented entry is played after 8 moves and ignored after 10), an empty book falling back to the search, and illegal input (columns 7, -1, 1.5, a full column, a finished game, a move after a win, a full board).
- **The Web Worker** (`9ec886c`, D28), tried in the browser with a temporary block in `main.ts` (not committed): the right column for every request, the error with its id, and the page stayed responsive.

**What the deliberate breaks showed:**

| Bug introduced | Caught by |
|---|---|
| `bookFiles` test walking to depth 11 | Only computer first: positions after 10 moves have no entry. Player first still passed: the computer moves after an odd number of moves, and the next one after 9 is 11 |
| `checkBook` reading the mirrored column (`6 - column`) | The 2 computer-first positions (`WORSE`); the 2 player-first ones passed, because their book move is the centre, its own mirror |
| `chooseColumn` using the book at move 10 too (`<=`) | 1 test: the invented entry was played after 10 moves |
| `chooseColumn` with the two books swapped | First: no failure, the test **hung** (a search of the empty board). After passing a failing search (D27): 4 tests failed within milliseconds |

**Measured** (dev server, median of 3–4 page loads; each load starts the worker with an empty table; the three positions are 10 or 11 moves into a game, just past the book):

| Device, table size | After 10, computer first | After 10, computer first | After 11, player first |
|---|---|---|---|
| PC, about 10 MB (2,097,153) | 4,399 ms | 2,121 ms | 1,117 ms |
| PC, about 20 MB (4,194,305) | 2,710 ms | 1,909 ms | 1,092 ms |
| PC, about 40 MB (8,388,617) | 1,373 ms | 1,758 ms | 787 ms |
| iPhone 14 (Safari), about 40 MB | 7,749 ms | 9,867 ms | 4,657 ms |

Book answers took 0–2 ms, and the first request (including the worker starting and creating its table) 20–130 ms, with no visible difference between table sizes. Page loads differed by 2–5%. The iPhone was 5.6–5.9× slower than the PC and showed no memory problem with 40 MB.

**Lessons:**
- The transposition table is not downloaded: it is created empty on the device. Its cost is memory, not loading time.
- Up to about 10 s of waiting on a phone right after the book is too long for visitors from LinkedIn; the next planning step is how to shorten it (a deeper book is the strongest option; small speed-ups exist).
- A check that two moves are "the same" must allow for ties; what matters is the score.
- A bug that sends a test into a long search makes the run hang rather than fail, and Vitest's time limit cannot stop code that never yields. Pass the slow part in, so tests can replace it with something that fails at once.
- `git status` cannot show whether a deliberate break was reverted in a file that is not tracked yet; compare the file's contents instead.
- A new PowerShell terminal now refuses `npx` as well as `npm`; `npx.cmd` works.
- On request, Claude made some edits directly in the project folder through the desktop app's file bridge; the user ran the tests and all Git commands. Once, a write reported success but left the old content (the same staging path was reused); comparing checksums caught it, and a fresh path fixed it.
- `npm run dev -- --host` lists several network addresses; the phone needs the one marked Wi-Fi (`192.168.56.1` belonged to a virtual adapter).
- Predictions that were wrong: `git status` lists a new folder (`scripts/`) rather than the file inside it; `git grep "public/book"` found nothing in the journal, which only ever wrote `public/`.

### 2026-11-22 — Design, then the whole page
**The phone wait, postponed.** Right after the book the computer can think for up to about 10 s on a phone. Decided to finish the game first and come back to it on a day with a few free hours: a deeper book changes only what is behind `chooseColumn` (D7), not the page. Worked out that the depth grows in steps of two (the book holds only the computer's moves): depth 12 adds one computer move to each book, depth 13 only to the player-first one. Plan for that day: measure positions after 12 moves on the PC and the iPhone first, then choose 12 or 14.

**Design (approved before any UI code).** A canvas with desktop and phone screens for every state: who goes first, your turn, computer thinking, computer wins, how to play. Decisions along the way, all the user's:
- Both English and Hebrew, chosen by the player; Hebrew right to left, the board never mirrored.
- The classic look: a blue board with red and yellow discs. The player is always red, the computer always yellow.
- First drawn with a ring and an X on the discs, for colour blindness. Measured instead: the lightness ratio between the two colours, simulated for the three main kinds of colour blindness, was 2.3 to 3.4. A slightly deeper red (`#C41E26`) raised it to 3.0 to 4.7 in all of them, so the marks were dropped and the winning four are also outlined.
- Font: four pairs were compared side by side in both scripts; IBM Plex Sans with IBM Plex Sans Hebrew was chosen.
- "How to play" in a window: four rules and a panel about the computer with three real numbers (4.5 trillion positions, 3,857 opening positions computed in advance, 1988).
- The player picks the Hebrew form of address (masculine or feminine) next to "who goes first", not in a window that pops up first.
- After the computer starts: "You're going to lose. Let's see how long you can survive."; at the end, "You lasted N moves."
- The credit to Pascal Pons stays in the README only.

**The page, in eight stages** (each: code, tests, a deliberate break, a commit; built by Claude on a copy of the repository and delivered as a Git bundle for review):
1. `strings.ts`: every text in English, Hebrew masculine and Hebrew feminine; only six texts differ between the two Hebrew versions, and a test checks that no other does (`b777ecf`).
2. `flow.ts`: who goes first, turns, the end of a game and errors, as states; an action that does not apply returns the same state, and an answer for an abandoned game is ignored by its id. 300 random whole games in the tests (`e81e300`).
3. `solverClient.ts`: each question to the worker is a promise, matched to its answer by id (`7b04bca`).
4. The layout, colours and self-hosted fonts (D29) (`77ac6cb`).
5. The board (D31): discs fall behind the face and bounce once; a waiting disc and a highlighted column on hover or keyboard focus; arrows and Enter to play (`bfeb133`).
6. `app.ts` and `status.ts`: the computer plays through the worker; while it thinks its disc sways above the board, and after 3 s a line says that perfect play takes a moment; its disc never lands sooner than 0.55 s after the player's, so the player's disc lands first (`2bccea8`).
7. The choice of who goes first, the legend, "New game" and "Play again"; going back to the choice clears the board; the keyboard focus follows the game (`08b4b92`).
8. `settings.ts` and `rulesDialog.ts`: the language switch, the form of address, and "How to play" as a native modal dialog (D32) (`2674195`).

Then, from checking in the browser: the solver client now fails at once when the worker has stopped (`2c32dfb`), the button after an error says "New game" like its message (`4fec0eb`), an unused class was removed (`e43b229`), and only the Latin and Hebrew letters of the fonts are shipped (`fa7a0f3`).

**What the deliberate breaks showed:**

| Bug introduced | Caught by |
|---|---|
| "אתה" left in the feminine version | The test that only addressed texts differ |
| An English rule left in Hebrew | The test that Hebrew texts contain Hebrew letters |
| A rule missing from Hebrew | The test that both languages have as many rules |
| The player's moves counted for the wrong side | The counting test |
| Every win recorded as the player's | 2 tests: the computer's win, and the 300 random games |
| No check of the game id on the computer's answer | 1 test (2 were predicted: the other answer was already refused because the phase had changed) |
| Answers matched to the oldest question, not by id | 2 tests |
| The caller's list of moves sent instead of a copy | 1 test |
| Open questions not cleared after a crash | 1 test |
| A disc animated for any longer list of moves | The test with a different game of the next length |
| No "perfect play takes a moment" | 1 test |
| The two start messages swapped | 3 tests |
| Going back to the choice keeping the old board | 1 test |
| Hebrew chosen if it appears anywhere in the browser's languages | 1 test |
| Saved settings read without catching errors | 2 tests |

**Found in the browser, not by the tests:**
- With the worker's file missing, the game waited for ever: the worker failed before anything was asked, so the questions after it had no one to fail them. A test was written and seen to fail first (it timed out), then the fix.
- Focus moved by the page after a mouse click showed the waiting disc in column 1; it is now shown only for keyboard focus.
- A button that is hidden keeps the focus until the browser's next frame, so "nothing has the focus" also checks for a hidden or disabled element.
- In Hebrew, the chosen "נקבה" button showed dark text on its dark background.

**Measured:** the site builds to about 390 KB, of which the page's code is about 23 KB (about 7.7 KB compressed; first written here as 16 KB and 6 KB, corrected the same evening), the solver's worker about 75 KB, and the styles about 12 KB. On a scripted replay of the slow position from 2026-11-21 (`[3, 2, 5, 2, 2, 3, 3, 6, 5, 5]`), the computer thought for 3.6 s in Chrome in Claude's environment, and the "takes a moment" line appeared. All text reaches a contrast of at least 5.4:1.

**Lessons:**
- Check colour blindness by numbers (lightness ratios under simulation) before adding marks to a design.
- An older npm rewrote unrelated lines of `package-lock.json`; the new entries were added by hand to the original file instead, so the diff holds only the two packages.
- A test that the logic covers does not catch a page that waits for ever; blocking a file in the browser did.
- A scripted player that plays the same columns loses within the book; a player that blocks and takes immediate wins reaches the solver.

### 2026-11-22 (afternoon) — Review, polish, and the page goes live
**First review.** The user pulled the bundle, ran the tests and the build on his PC, and played it with two friends on two PCs and two phones: "amazing and addictive". Their notes, all built the same afternoon (same discipline: code, tests, a deliberate break, a commit; delivered as bundles):
- **Thin lines on the board** (`ccd0540`): on displays scaled to 110–150%, the hole cells met at fractional pixels and light seams showed between them. A script counted full lines of non-blue pixels: 17 vertical and 17 horizontal before, none after, at 11 sizes and scales. The edge stripes now overlap the holes by 2px and each hole cell casts 1px of blue.
- **The start explanation on two lines** (`8c6b261`): one for a game the computer starts, one for a game the player starts.
- **New texts for a draw and a win** (`74a047a`), worded together with the user: a draw means not one losing move; a win names the perfect solver and counts the player's moves ("Not one of your N moves let the win slip").
- **Fireworks for a win** (`41f7a99`), then **15 s for a win and 4 s for a draw** (`ab7abee`) (D34).
- **At least one second per computer turn** (`0d60745`), instead of 0.55 s: the book answers at once, and the computer seemed not to think. Measured: 1.04–1.06 s per turn.

**Pushed and checked live** (the first time the new page was online): `c14894d..ab7abee`. The user checked the live site on the PC and on a phone; the computer answered quickly on both.

**The window about the computer** (`4052d8f`), worded by the user over several drafts:
- Two paragraphs: what the solver can do (Allen and Allis proved that the first player wins with no mistakes; this computer makes none; if you start, one mistake and the win is gone: at best, a draw), then how it is built to decide fast (two numbers for the board, threatening moves first, branches that provably cannot change the result skipped, positions remembered, the opening solved in advance, the search apart from the page).
- Every technical claim was checked against the code first. "Takes symmetry into account" was left out: symmetry is used only in the opening book, not in the search on every turn. "The fastest there is" was not written, since it cannot be shown.
- The exact count of positions, 4,531,985,219,092, on a row of its own instead of "4.5 trillion"; "3,857 opening positions solved in advance"; 1988 kept. Considered and left for later: "3,000× faster than the solver's first version" (337 ms to 0.11 ms per Middle-Easy position).
- The window opens by itself once per visit (D33). The English message after the computer starts now reads "You're going to lose, but let's see how long you can survive." (`c82e7d6`).

**Then:** every new player starts in Hebrew, masculine (`e5e108d`, D32 changed), and the footer link reads "How to play & about the computer" / "איך משחקים ועל המחשב" (`f8ff07b`). Pushed (`ab7abee..c82e7d6`, then `c82e7d6..f8ff07b`) and checked live.

**What the deliberate breaks showed:**

| Bug introduced | Caught by |
|---|---|
| "היא תמיד מנצח" in the feminine explanation | The test that the first line is the same in both Hebrew versions |
| The draw message left out of the addressed texts | The test that only addressed texts differ |
| The last burst 200 ms before the end of the show | The test that every spark fades before the end |
| A fixed number of bursts for any length | The test that a longer show keeps the same pace |
| The once-per-visit check inverted | 2 tests, as predicted |
| English as the default | 2 tests, as predicted |

**Found in the browser, not by the tests:**
- The first fireworks were thin and small; they were made larger and given a glow before the user saw them. In the 15 s show, sparks were cut off at the bottom of the canvas; they now fade near its edges.
- To check the end of a game without beating the solver, the screenshot scripts replace the worker with a fake one that plays fixed moves (only in the scripts, never in the code).
- A check of two games side by side reported no fireworks after a win: the draw game took 20 s longer, so the win's 15 s show had already ended. Checked alone, it lasted from 0 to 15 s as designed.

**Measured:** the page's code is now about 28 KB (about 9.6 KB compressed). Tests: 227 here, 231 on the user's PC (with the 4 that read the published benchmark files).

**Lessons:**
- A thin line that appears only on some screens is a scaling seam: check at fractional display scales (110%, 125%, 150%), not only at 100%.
- A text in the page that makes a technical claim is checked against the code, like any other claim.
- A timing check that runs two pages side by side waits for the slower one; check timings one at a time.
- Wording takes as many rounds as code; small changes ("but", a comma, the order of two clauses) change the tone.

### 2026-11-23 — The rules window and the end-of-game texts
Started by asking whether visits to the live site can be counted (GitHub Pages shows none; the repository's Insights → Traffic counts only visits to the repository). Options: GoatCounter (free for non-commercial use, no cookies), Cloudflare Web Analytics, or Google Analytics (cookies, so a consent banner). Left for later; if added, it needs a decision of its own beside D29's "no tracking".

**The window that opens on arrival** (`49244a3`, `7ebaa1b`), reviewed through five rounds of screenshots before anything was committed:
- It now starts with the game's title and subtitle ("Connect Four", "You against a perfect solver."), since it covers the page on a first visit and a visitor could not tell where they were.
- "How to play" became "Rules of the game" and "About the computer" became "The algorithm", in the window and in the footer link ("Rules & the algorithm").
- The panel has three short paragraphs: the proof and "This computer plays perfectly"; then, on its own, what that means for a player who goes first ("…only if you play perfectly. One mistake, and the win is gone: at most, a draw."); then the line that opens a list of how the algorithm decides fast, four points without bullets, and a closing line. The point about the opening was dropped, since the "3,857 opening positions solved in advance" number already says it.
- Asked whether "the computer" and "the algorithm" mean the same thing: the computer is the opponent (what it does), the algorithm is the method (how it decides); the text keeps that split.
- The two section headings are the same size.

**The texts after a win and a draw** (`00885d6`), worded by the user: a win says "To get here, you played a perfect game, N moves without a single mistake. Well done!" (the same for both Hebrew forms of address); a draw ends with "A little more and the win is yours".

**A gap in the tests, found by a deliberate break** (`0240d3a`): a masculine ending put into the feminine draw message passed every test, because the existing check only compares the two versions, and this text already differed. A new test looks for masculine words in every addressed feminine text; the same break then failed it.

**What the deliberate breaks showed:**

| Bug introduced | Caught by |
|---|---|
| One point missing from the Hebrew list | The test that every version has the same points |
| "ואתה מגיע" in the feminine draw message | Nothing at first (1 failure was predicted); after the new test, that test |

**Measured:** tests: 229 here, 233 on the user's PC. The page's code is about 28 KB (about 9.7 KB compressed).

**Lessons:**
- A test that compares two versions only proves they differ, not that each one is right; a deliberate break with a wrong prediction found it.
- Show a design change as a screenshot of the real page before committing it; it took five rounds to get the window right, and none of them cost a commit.
- When shooting the end of a game, the screenshot scripts now mark the window as already shown, or it covers the board.

---

## Phase 1 — Python prototype (2026-11-03 → 2026-11-09)

**What was built:** repository, local environment, and a Pygame window running both natively and in the browser via pygbag.

**What was learned:**
- Graphics and animation would be fine in Pygame.
- Two weak points for this project's goals:
  1. **Load time:** every visit downloads the Python runtime (~5 s locally, likely more on mobile data). Some LinkedIn visitors would leave before the game appears.
  2. **Solver speed:** Python in the browser is slow for heavy search, so perfect play would depend on a very large precomputed opening book.
- Mobile layout, touch input and sharpness on high-density screens would all need manual work.

## Phase 2 — Switch to TypeScript (decided 2026-11-09)

**Why:** compared on the two critical requirements.

| Criterion | Python + Pygame | TypeScript web app |
|---|---|---|
| Visuals | Good, mostly drawn by hand | Best, with CSS, SVG and animation tools |
| Phone | ~5 s load; manual layout and touch | Near-instant load; responsive layout and touch built in |
| Solver speed | Slowest; heavy reliance on an opening book | Much faster; can run in a background Web Worker so the UI never freezes |

**What carries over:** the repo and its history, Git, VS Code, and the design principles (game loop, small focused commits, pinned dependencies, deploy early).

**Trade-off accepted:** learning a new language and toolchain (TypeScript, HTML/CSS, Node.js, npm, Vite) in exchange for a better result on both critical requirements.

## Phase 3 — TypeScript setup and first deploy (2026-11-09)

**What was built:** a Vite + TypeScript project, a minimal page, and a CI/CD pipeline that builds and publishes the site to GitHub Pages on every push.

**Measured:**
- Production build: ~1.5 KB total (<1 KB gzipped).
- Pipeline: 25 s from push to live site.
- Loads quickly on a phone over 4G.

**Open items noted for later:**
- ~~Update the repo description and README (both still mention Python). Credit Pascal Pons's tutorial and benchmark positions (D15), and explain where to download the benchmark files into `benchmarks/` (D18).~~ Done (`4f49f79`).
- Consider asking Pascal Pons for permission to include the benchmark files in the repo (D18).
- The test helpers `play`, `seededRandom` and `playableColumns` are repeated in several test files; move them into one shared file (a separate refactoring commit).
- ~~When the two-number bitboard arrives, replace the `BigIntPosition` type in `negamax.ts` with a shared position interface (D16).~~ Done (`c4f09fb`).
- The tutorial's other example, `4455` (score 18, a win with the 4th disc), needs a deep search from move 4; keep it as a test for the speed stage.
- `scripts/buildBook.ts` has no editor types for Node (`node:fs`, `process` are underlined in VS Code); harmless, as `tsc` checks only `src`. Could get its own small tsconfig with `@types/node` if wanted.
- Possible speed-ups not taken: lookup tables for the bit masks in `PairPosition` (25–35% faster in a scratch test), local constants in hot loops, lower bounds in the table.
- Mention the opening book and its sources (Allis 1988 for the first move) in the README.
- A whitespace leftover in `src/solver/position.ts` (an empty line with two spaces, after `threatsAfter`); fix in a formatting-only commit.
- Design a social preview image for the repo (shown when the link is shared on LinkedIn).
- Bump GitHub Actions versions once releases targeting Node 24 are available (current run shows Node 20 deprecation warnings; harmless for now).
- GitHub notes that `ubuntu-latest` is moving to Ubuntu 26. The workflow uses only Node, npm and Vite, so no change is expected.
- The book depth 10 is written in four places: `BOOK_DEPTH` in `books.ts`, and its own constant in `bookFiles.test.ts`, `buildBook.ts` and `checkBook.ts`; make them all use `BOOK_DEPTH` (a separate commit).
- Optional: in `bookFiles.test.ts`, also check that every entry is reached by the walk (no unused entries).
- Ties between columns are not broken the same way in a position and its mirror (2 is preferred to 4); harmless, noted in case it ever matters.
- `chooseColumn.test.ts` has its own `play` helper too (see the shared helpers above); so do `flow.test.ts` and `status.test.ts`.
- Shorten the wait on a phone just after the book (postponed on 2026-11-22; see that entry).
- The board is not described to screen readers: the columns are labelled buttons and the status is announced, but the discs are not. Consider a text summary of each column.
- After the computer moves, keyboard focus returns to the column it was on; consider announcing the computer's column too.

## Phase 4 — Game logic and unit tests (2026-11-09 → 2026-11-10)

**What was built:**
- `src/game/board.ts`: the board as a list of columns, legal moves, dropping a disc, win detection that returns the winning cells, and full-board detection.
- `src/game/game.ts`: the game state (board, move history, status), the current player derived from the history, and `playMove`, which refuses moves after the game is over.
- 32 unit tests, run locally with `npm test` and in GitHub Actions before every build.

**Measured:** the whole test suite runs in about 130 ms. The site bundle is unchanged (the game code is not yet imported by the page).

## Phase 5 — Solver: correctness (2026-11-15)

**What was built:**
- `src/solver/bigintPosition.ts`: the BigInt reference bitboard (`canPlay`, `play`, `isWinningMove`, `key`, `clone`).
- `src/solver/negamax.ts`: plain `negamax` (the reference) and `solve` (alpha-beta pruning).
- Tests: hand-built positions, a cross-check against the game board on random games, `solve` against plain negamax on 200 random late positions, and the 1,000 published End-Easy positions (local only, D18).

**Measured:** both searches give the published score for all 1,000 End-Easy positions; plain negamax takes about 7.2 s for the whole set, alpha-beta about 0.33 s.

**Next:** decide how to measure speed, then the two-number bitboard (D16), then move ordering, a transposition table and an opening book.

## Phase 6 — Solver: speed and the opening book (2026-11-16 → 2026-11-20)

**What was built:**
- `src/solver/position.ts` (the shared interface) and `src/solver/pairPosition.ts` (the fast board), with `nonLosingColumns` and `threatsAfter` on both boards.
- `src/solver/transpositionTable.ts`; in `negamax.ts`: the window cap, null-window `solve`, `orderMoves` and `bestMove`.
- `src/solver/openingBook.ts`: mirror images, storing and looking up moves, and the resumable build; `scripts/buildBook.ts` and the two books (built on 2026-11-20, committed on 2026-11-21, now in `src/solver/books/`).
- `src/solver/search.measure.ts` and `npm run measure`.
- 146 tests in 12 files; in CI the 4 tests that read the published files are skipped.

**Measured:** Middle-Easy from 337 ms to 0.11 ms per position (first 100); Begin-Easy 1.3 ms; positions after 8 moves about 3 s.

**Built on 2026-11-20:** the computer-first book (825 entries, about 1 h 50 min) and the player-first book (3,032 entries, about 5 h 50 min), both covering every position on the computer's turn before move 10.

**Next:** test both books, commit them with the script, then the Web Worker and the game page.

## Phase 7 — Solver in the browser (2026-11-21)

**What was built:**
- `src/solver/bookFiles.test.ts`: a permanent check of both book files, in every test run and in CI.
- `scripts/checkBook.ts`: a one-off check of a sample of entries against the solver (94 positions, none wrong).
- `src/solver/books.ts` (`loadBooks`, `BOOK_DEPTH`) and `src/solver/chooseColumn.ts`, with tests.
- `src/solver/solver.worker.ts`: the solver in a Web Worker, with a 40 MB transposition table.
- 160 tests in 14 files; in CI the 4 tests that read the published files are skipped.

**Measured:** answers from the book in 0–2 ms; just after the book, about 0.8–1.8 s on the PC and 4.7–9.9 s on an iPhone 14.

**Next:** plan how to shorten the wait on a phone just after the book (a deeper book, speed-ups, or both), then the design stage.

## Phase 8 — Design and the game page (2026-11-22)

**What was built:**
- An approved design: desktop and phone, in both languages, for every state of the game.
- `src/ui/`: `strings`, `flow`, `solverClient`, `status`, `settings` (logic, with tests), and `view`, `boardView`, `rulesDialog`, `app`, `dom` (the page); `src/style.css`; `src/main.ts` wires the worker and the app.
- 211 tests in 20 files; in CI the 4 tests that read the published files are skipped.
- After the review (afternoon): `fireworks`, `fireworksView`, the once-per-visit window and the new texts; 227 tests in 21 files (231 with the published files).
- 2026-11-23: the rules window and the end-of-game texts reworded; 229 tests (233 with the published files).

**Live since 2026-11-22.** **Next:** the last polish (README, a social preview image, the GitHub page), then the postponed phone wait if it is still needed.

---

## Tools used so far

| Tool | Version | Role | Status |
|---|---|---|---|
| Git | 2.45.1 | Version control | In use |
| GitHub | — | Hosting, later GitHub Actions + Pages | In use |
| VS Code | 1.121.0 | Editor | In use |
| Python | 3.13.12 | Language for the prototype | Retired with Phase 1 |
| venv / pip | pip 26.3 | Isolated environment, package installer | Retired with Phase 1 |
| pygame-ce | 2.5.8 | Graphics for the prototype | Retired with Phase 1 |
| pytest | 9.2.0 | Testing for the prototype | Retired with Phase 1 |
| pygbag | — | Python-to-browser packaging | Retired with Phase 1 |
| Node.js | 24.16.0 | Runs the TypeScript toolchain | In use |
| npm | 11.13.0 | Package installer for JavaScript | In use |
| Vite | 8.3.6 | Dev server, TypeScript transpiling, production build | In use |
| TypeScript | ~7.0.2 | Language for the game, solver and UI | In use |
| GitHub Actions | — | CI/CD: build and deploy on every push | In use |
| GitHub Pages | — | Hosts the live site | In use |
| GitHub Actions extension (VS Code) | 0.32.3 | Validates workflow files in the editor | In use |
| Vitest | 5.1.0 | Unit tests | In use |
| Node type stripping | (Node 24) | Runs `scripts/buildBook.ts` straight from TypeScript | In use |
| Fontsource (IBM Plex Sans, IBM Plex Sans Hebrew) | 5.3.0 | Self-hosted fonts (D29) | In use |
| Claude design canvas | — | The approved design, before any UI code | Used for the design |
| Chrome without a window (Playwright) | — | Screenshots and scripted games while building the page | Used by Claude |
| Benchmark sets (Pascal Pons) | — | Published positions with exact scores, for tests and measurement | In use, local only (D18) |

## Commit history

| Commit | Message |
|---|---|
| `21d36f5` | Initial commit (README, .gitignore, LICENSE) |
| `96c541a` | Add requirements.txt with project dependencies |
| `47bbc6f` | Add initial Pygame window with async game loop |
| `d813f5b` | Remove Python prototype before TypeScript rewrite |
| `430f95e` | Add development journey document |
| `a3ae92b` | Set up Vite + TypeScript project skeleton |
| `b28a877` | Configure Vite base path for GitHub Pages |
| `e5445ae` | Add GitHub Actions workflow to deploy to Pages |
| `c2037e7` | Update journey: TypeScript setup and first deploy |
| `815a813` | Add Vitest and npm test script |
| `6c1c40f` | Add empty board with tests |
| `84b87ba` | Update journey: test tooling and first game logic |
| `7889976` | Add dropDisc and isLegalMove with tests |
| `f6d86d8` | Add win detection with tests |
| `f827ae2` | Add full-board detection with tests |
| `1e9de2f` | Add comments to board logic and tests |
| `9d8d9f1` | Add game state with turn tracking |
| `6b42417` | Add playMove with win, draw and game-over handling |
| `5e5b5a5` | Run unit tests in CI before building |
| `f8bdf37` | Update journey: game logic complete |
| `4d72b1a` | Add BigInt bitboard with drop and full-column check |
| `c8192e4` | Add winning-move detection to BigInt bitboard |
| `cbaebef` | Add position key to BigInt bitboard |
| `ae5612c` | Cross-check BigInt bitboard against the game rules |
| `9c2ef97` | Add clone to BigInt bitboard |
| `78af1de` | Add plain negamax search with hand-built positions |
| `816e9ef` | Fix negamax returning -0 instead of 0 for some draws |
| `91c1596` | Check negamax against published benchmark positions |
| `f5d0e9b` | Add alpha-beta pruning, checked against plain negamax |
| `de6fa2c` | Update journey: solver correctness |
| `439ebbf` | Count explored positions in both searches |
| `d9e4266` | Add npm run measure for search speed on End-Easy |
| `4ca8dd0` | Run the bitboard tests on a list of implementations |
| `b86f71f` | Add the bitboard on two 32-bit numbers, checked against BigInt |
| `c4f09fb` | Search any board through a shared Position interface |
| `4f49f79` | Rewrite README for the TypeScript solver |
| `f853a79` | Measure the search on both bitboards |
| `fb4764c` | Measure Middle-Easy as the baseline for speed-ups |
| `bfcedb7` | Cap the alpha-beta window at the best score still possible |
| `73fd225` | Try columns from the centre outwards |
| `2114f2a` | Add a transposition table, tested on its own |
| `5d7a491` | Use the transposition table in alpha-beta |
| `5aacb8b` | Solve with null-window searches; keep the full window as a reference |
| `2ef32f1` | Find the non-losing columns on the BigInt board |
| `cab5384` | Find the non-losing columns on the fast board too |
| `734515f` | Count the threats a move creates, on both boards |
| `fb1a41b` | Try safe moves only, the ones that make the most threats first |
| `2c26a81` | Measure the opening sets where the book will end |
| `4a1569c` | Import with file extensions so Node can run the solver directly |
| `08f815f` | Mirror a position's key, for the opening book |
| `0653f9d` | Choose the best move: fastest win or slowest loss, centre first |
| `6998d87` | Store and look up moves in the opening book, sharing mirror images |
| `2c8c3eb` | Build the opening book by walking every game, resumable |
| `f4c88c0` | Update journey: speed and the opening book |
| `e356ce5` | Update journey: building the opening books |
| `f6bbf73` | Add the opening books and the script that builds them |
| `9014574` | Check both opening book files in every test run |
| `12490b0` | Check a sample of the opening books against the solver |
| `dbf93bb` | Move the opening books next to the solver that imports them |
| `725d03a` | Choose the computer's column: the opening book first, then the search |
| `9ec886c` | Run the solver in a Web Worker, with a 40 MB table chosen by measurement |
| `c14894d` | Update journey: checking the books and the Web Worker |
| `b777ecf` | Add the page's texts in English and in Hebrew, masculine and feminine |
| `e81e300` | Add the game flow: who goes first, turns, the end of a game, and errors |
| `7b04bca` | Ask the solver worker through promises, matched to answers by id |
| `77ac6cb` | Lay out the page with the design's colours and self-hosted IBM Plex fonts |
| `bfeb133` | Draw the board with discs that fall behind its face, playable by mouse, touch and keyboard |
| `2bccea8` | Play against the solver in its worker, showing the computer thinking |
| `08b4b92` | Choose who goes first, end the game with its result, and play again |
| `2674195` | Add how to play, a language switch, and the Hebrew form of address, kept for the next visit |
| `2c32dfb` | Fail every later question once the solver worker has stopped, instead of waiting for ever |
| `4fec0eb` | Label the button after an error "New game", as the message says |
| `e43b229` | Remove a class the stylesheet never used |
| `fa7a0f3` | Ship only the Latin and Hebrew letters of the fonts |
| `3ece834` | Update journey: design and the game page |
| `ccd0540` | Fix thin seams across the board on scaled screens |
| `8c6b261` | Show the start explanation on two lines |
| `74a047a` | New texts for a draw and for a win |
| `41f7a99` | Fireworks when the player wins |
| `0d60745` | Give the computer at least one second per turn |
| `ab7abee` | Longer fireworks for a win, shorter ones for a draw |
| `4052d8f` | Open the window about the game on every visit, with a new about text |
| `c82e7d6` | Join the English message for a game the computer starts with "but" |
| `e5e108d` | Start every new player in Hebrew, addressed in the masculine |
| `f8ff07b` | Name the footer link after both parts of its window |
| `f37671d` | Update journey: review, polish, and the page goes live |
| `49244a3` | Reword the rules window: rules of the game, and the algorithm |
| `7ebaa1b` | Show the game's name at the top of the rules window |
| `0240d3a` | Check that the feminine version uses no masculine form of address |
| `00885d6` | New texts after a win and a draw |

The Python prototype remains in the history at `47bbc6f`.

---

## Roadmap

1. ~~**Setup (TypeScript):** remove the Python prototype → create a Vite + TypeScript project → run locally → first deploy to GitHub Pages, checked on desktop and phone.~~ Done 2026-11-09.
2. ~~**Game logic** with unit tests.~~ Done 2026-11-10.
3. **Solver:** correctness first (benchmark tests), then speed, then an opening book. *In progress: correctness done 2026-11-15; speed done 2026-11-20 (fast board, table, null windows, threat ordering); both opening books built 2026-11-20, checked and committed 2026-11-21; `chooseColumn` and the Web Worker done 2026-11-21. Still open: shorten the wait on a phone just after the book (postponed).*
4. ~~**Design:** visual style and a mockup for desktop and phone, approved before any UI code.~~ Done 2026-11-22.
5. ~~**UI:** implement the design, animations, responsive layout, touch input.~~ Built 2026-11-22, reviewed, polished and live the same day.
6. **Polish and README.**
