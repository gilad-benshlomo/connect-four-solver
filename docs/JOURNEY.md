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

**Proposed, not yet decided — how to measure speed** (to be confirmed at the start of the next session):
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
- Update the repo description and README (both still mention Python). Credit Pascal Pons's tutorial and benchmark positions (D15), and explain where to download the benchmark files into `benchmarks/` (D18).
- Consider asking Pascal Pons for permission to include the benchmark files in the repo (D18).
- The test helpers `play`, `seededRandom` and `playableColumns` are repeated in several test files; move them into one shared file (a separate refactoring commit).
- When the two-number bitboard arrives, replace the `BigIntPosition` type in `negamax.ts` with a shared position interface (D16).
- The tutorial's other example, `4455` (score 18, a win with the 4th disc), needs a deep search from move 4; keep it as a test for the speed stage.
- Design a social preview image for the repo (shown when the link is shared on LinkedIn).
- Bump GitHub Actions versions once releases targeting Node 24 are available (current run shows Node 20 deprecation warnings; harmless for now).
- GitHub notes that `ubuntu-latest` is moving to Ubuntu 26. The workflow uses only Node, npm and Vite, so no change is expected.

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

The Python prototype remains in the history at `47bbc6f`.

---

## Roadmap

1. ~~**Setup (TypeScript):** remove the Python prototype → create a Vite + TypeScript project → run locally → first deploy to GitHub Pages, checked on desktop and phone.~~ Done 2026-11-09.
2. ~~**Game logic** with unit tests.~~ Done 2026-11-10.
3. **Solver:** correctness first (benchmark tests), then speed, then an opening book. *In progress: correctness on end-of-game positions done 2026-11-15 (BigInt bitboard, negamax, alpha-beta, all 1,000 End-Easy positions). Next: how to measure speed (proposal in the 2026-11-15 log), then the two-number bitboard.*
4. **Design:** visual style and a mockup for desktop and phone, approved before any UI code.
5. **UI:** implement the design, animations, responsive layout, touch input.
6. **Polish and README.**
