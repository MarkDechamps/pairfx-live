# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Five independent, static front-end apps in one repo, cross-linked from the same nav bar:

- **PairFX** (repo root: `index.html`, `js/`, `css/`) — a chess tournament pairing manager.
  No build step, no bundler, no framework. Plain `<script defer>` tags loading global classes,
  `localStorage` for persistence.
- **Opening Selector** (`opening-selector/`) — a separate static app (a chess-opening
  recommender) with its own `CLAUDE.md`. Read that file when working under `opening-selector/`
  — its architecture, commands, and conventions are unrelated to PairFX and are not repeated
  here.
- **Chess Classroom** (`chess-classroom/`) — a two-tab chess demonstration tool for teachers
  (a teacher tab plus a projector tab kept in live sync), with its own `CLAUDE.md`. Read that
  file when working under `chess-classroom/` — its architecture, commands, and conventions are
  unrelated to PairFX and are not repeated here.
- **Opening Tree** (`opening-tree/`) — an opponent-prep tool: fetches a Lichess/Chess.com
  username's public games and shows them as a move tree. Its own `CLAUDE.md`; unrelated to
  PairFX.
- **Opening Trainer** (`opening-trainer/`) — a browser-local opening-repertoire trainer: upload
  your own PGNs, browse them as a move tree, and drill a branch with spaced repetition
  (ChessTempo-style training settings). Its own `CLAUDE.md`; unrelated to PairFX.

Opening Selector, Chess Classroom, Opening Tree, and Opening Trainer were all built using
**wayfinder**, a local-markdown spec/ticket workflow that lives entirely inside each app's own
`wayfinder/` directory (`opening-selector/wayfinder/`, `chess-classroom/wayfinder/`,
`opening-tree/wayfinder/`, `opening-trainer/wayfinder/` — `map*.md` destinations,
`tickets/NNNN-slug.md` child tickets — see any of these apps' `wayfinder/README.md` for the
convention). These are four separate wayfinder instances, not a shared one. PairFX itself was
not built this way and has no `wayfinder/` directory — don't go looking for tickets or maps for
root-level PairFX work; that process only applies inside the four sub-apps above. If you're
asked to extend one of them (new criteria/rescoring/screens for Opening Selector; new product
behavior for Chess Classroom; new lookup/tree behavior for Opening Tree; new training behavior
for Opening Trainer), check that app's `wayfinder/tickets/` first — decisions and rationale
live there, not just in code comments. Opening Trainer additionally keeps a `CONTEXT.md`
glossary and `docs/adr/` (domain-modeling's convention, not wayfinder's) for its Repertoire/
Node/Card language and its two hard-to-reverse calls — read those before touching its
`engine.js`.

The rest of this file covers the root PairFX app only.

## Commands

```bash
npm test              # run all Jest tests
npm run test:coverage # with coverage report (80% threshold, see jest.config.js)
npm run test:watch    # watch mode
npm start             # serve via start.ps1 (Windows/PowerShell)
```

Run a single test file: `npx jest tests/services/PairingService.test.js`
Run a single test by name: `npx jest -t "constraint"`

There's no dev server requirement for manual testing — `index.html` can be opened directly, or
served with `python -m http.server 8000` / VS Code Live Server (see `QUICKSTART.md`).

## Architecture

**No modules, no bundler.** `index.html` loads every file as a plain global-scope `<script>`,
in dependency order (models → services → UI managers → `app.js`); classes attach to `window`
implicitly and reference each other by bare global name. Script tags carry a manual cache-bust
query string (`?v=20251212i`) — bump it when editing a file, or browsers may serve a stale
cached copy.

Layering (see `FILE-STRUCTURE.md` for the full dependency diagram):
- `js/models/` — `Player`, `Match`, `Tournament`. Plain data + `toJSON`/`fromJSON`, no
  dependencies on services or UI.
- `js/services/` — `PairingService` (the constraint-based pairing algorithm) and
  `StorageService` (`localStorage` CRUD + JSON import/export). Depend only on models.
- `js/ui/` — `TournamentManager`, `PlayerManager`, `PairingManager`. Own DOM rendering and
  event wiring for their slice of the UI; depend on services and models.
- `js/app.js` — wires everything together on `DOMContentLoaded` into a single global `app`
  object (`app.storageService`, `app.pairingManager`, etc.) and shows the initial screen.

**Pairing algorithm** (`PairingService`): for the lowest-ranked available player, finds an
opponent satisfying, in order:
- Constraint X (hard): not played within the last X rounds (`checkRecentOpponentConstraint`).
- Constraint Y (hard): score difference ≤ Y (`checkPointDifferenceConstraint`).
- Class constraint (soft, optional): prefer different `klas`, fall back to same class if no
  other option exists.
- Color assignment is based on the white/black count imbalance per player (strong preference
  at 2+ games difference, soft preference at 1, random at parity).
Manually pairing exactly 2 selected players bypasses constraints X and Y entirely.

**Persistence**: each tournament is its own `localStorage` entry keyed
`pairfx_tournament_{uuid}`, plus a `pairfx_tournament_list` index of `{id, name, date, counts}`.
Every mutation saves immediately — there is no explicit save action or dirty-state tracking.

## Tests — read this before trusting a green run

**The unit test files under `tests/models/` and `tests/services/`, and
`tests/integration.test.js`, do not import the real source in `js/`.** Each test file
re-declares its own inline copy of the classes under test (e.g. `tests/models/Player.test.js`
has its own `class Player { ... }` at the top, duplicated again with variations in
`tests/services/PairingService.test.js`, `tests/integration.test.js`, etc.). This means:
- Editing `js/services/PairingService.js` does **not** change what those tests exercise —
  the test's own duplicated class is what actually runs.
- A green `npm test` after a source change does not confirm the source change works; it only
  confirms the duplicated logic (if you remembered to update it too) is internally consistent.
- When fixing a bug or changing behavior in `js/models/` or `js/services/`, grep for the
  matching class re-declaration in `tests/` and update it in lockstep, or the tests will
  silently stop covering reality.

The one exception is `tests/app-initialization.test.js`, which does `require('../js/app.js')`
against a mocked DOM/global environment and so does test the real file.

`test/test-scenario.html` (singular `test/`, distinct from the `tests/` Jest folder) is a
manual, human-driven 20-step click-through checklist — not automated.

## Language note

UI strings, CSV/JSON field names the user sees, and the QUICKSTART/README docs are in Dutch
(`voornaam`, `naam`, `klas`, `afwezig`, etc.). Match this when adding user-facing strings or
model fields — don't translate existing Dutch fields to English.
