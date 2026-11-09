# Development Journey — Connect Four Solver

A running log of how this project was planned and built: the steps, the tools, the decisions, and what changed along the way. It is updated at the end of every work session.

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
- Started this journey document.
- Next: add this document to the repo and set up the TypeScript project.

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

## Commit history

| Commit | Message |
|---|---|
| `21d36f5` | Initial commit (README, .gitignore, LICENSE) |
| `96c541a` | Add requirements.txt with project dependencies |
| `47bbc6f` | Add initial Pygame window with async game loop |
| `d813f5b` | Remove Python prototype before TypeScript rewrite |

The Python prototype remains in the history at `47bbc6f`.

---

## Roadmap

1. **Setup (TypeScript):** remove the Python prototype → create a Vite + TypeScript project → run locally → first deploy to GitHub Pages, checked on desktop and phone.
2. **Game logic** with unit tests.
3. **Solver:** correctness first (benchmark tests), then speed, then an opening book.
4. **Design:** visual style and a mockup for desktop and phone, approved before any UI code.
5. **UI:** implement the design, animations, responsive layout, touch input.
6. **Polish and README.**
