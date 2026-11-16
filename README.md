# connect-four-solver

A perfect-play Connect Four solver in TypeScript, built to run in the browser: negamax with alpha-beta pruning on bitboards, verified against published benchmark positions. The approach follows Pascal Pons's tutorial (see [Credits](#credits)); the code is written from scratch.

**Live site:** https://gilad-benshlomo.github.io/connect-four-solver/ (the playable game is coming; for now the page is a placeholder)

## Status

Work in progress.

Done:
- Game rules: the board, legal moves, win and draw detection, and a game state that refuses illegal sequences.
- Two bitboards behind one interface: a readable BigInt version kept as the reference, and a fast version split over two 32-bit numbers, since JavaScript bitwise operators work on 32 bits and the board needs 49.
- The search: plain negamax as the reference, and negamax with alpha-beta pruning. Both return exact scores, so the solver can prefer the fastest win and the longest loss.
- A separate speed measurement (`npm run measure`) that reports time per position, positions explored and positions per second.

Next:
- Move ordering, a transposition table and an opening book, so the solver is fast enough from the very first move.
- Running the solver in a Web Worker, so the page never freezes while it thinks.
- The game interface, designed for both desktop and phone.

## How correctness is checked

- **Hand-built positions** with scores worked out by hand: wins, losses, draws, and the edge cases between them.
- **Independent implementations checked against each other** on thousands of seeded random games: the game board against both bitboards, the two bitboards against each other (same answers and same keys in every position), and the pruned search against the plain one (same scores, never more positions explored).
- **Published benchmark positions** with known exact scores: the search must match all 1,000 End-Easy positions on both bitboards.
- **Deliberate breaks:** after a test passes, the code is broken on purpose to confirm that the test fails, with the failing tests predicted in advance.

The tests run on every push in GitHub Actions, before the build; a failing test stops the deployment.

## Tech stack

- [TypeScript](https://www.typescriptlang.org/), no framework
- [Vite](https://vite.dev/) for the dev server and the production build
- [Vitest](https://vitest.dev/) for unit tests and measurements
- GitHub Actions and GitHub Pages for testing and deployment

## Running locally

Requires [Node.js](https://nodejs.org/) 24.

```bash
npm ci              # install the exact dependency versions from package-lock.json
npm run dev         # start the dev server
npm test            # run the unit tests
npm run build       # type-check and build the site into dist/
npm run measure     # measure the search speed (needs the benchmark files below)
```

## Benchmark files

The published benchmark positions are not included in this repository: the tutorial publishes them with a copyright notice and no licence, so they are not redistributed here. To run the tests and measurements that use them:

1. Open the [test protocol page](http://blog.gamesolver.org/solving-connect-four/02-test-protocol/) of the tutorial.
2. Download `Test_L3_R1` (End-Easy). `Test_L2_R1` (Middle-Easy) is optional; it is not used yet.
3. Put the files in a folder named `benchmarks` at the root of the project. The folder is listed in `.gitignore`.

Without the files, the tests that read them are skipped (as they are in GitHub Actions), and every other test still runs.

## Credits

The solving approach follows Pascal Pons's tutorial [Solving Connect 4: how to build a perfect AI](http://blog.gamesolver.org/solving-connect-four/01-introduction/): negamax with alpha-beta pruning, the bitboard layout with a helper row, the scoring scheme, and the benchmark positions used to check the solver. His code is not used here; this repository is written from scratch in TypeScript for the browser.

## Development journey

[docs/JOURNEY.md](docs/JOURNEY.md) is a running log of how the project was planned and built: every decision with its reasons, every commit, which tests caught each deliberate break, the measurements, and the lessons learned along the way.

## License

[MIT](LICENSE)