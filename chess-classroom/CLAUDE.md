# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
directory.

## What this is

A static, two-tab chess demonstration tool for teachers ("Chess Classroom"): a **teacher tab**
(`index.html`) to upload/manage a local library of PGN files, browse variations, read
PGN-comment notes, draw ChessBase-style arrows/highlights, and control a **projector tab**
(`projector.html`) — a plain second browser tab the teacher drags to the classroom projector —
kept live in sync via `BroadcastChannel`. No backend, no accounts; everything lives in the
teacher's browser. Built via wayfinder (`wayfinder/map.md` + `wayfinder/tickets/0001`–`0008`,
all closed) — read those tickets before changing product behavior; this file covers the
resulting architecture, not the product decisions themselves.

## Commands

```bash
node --test            # run all pure-logic unit tests (no framework, Node's built-in runner)
python3 -m http.server 8000   # serve the app (fetch() of locales/*.json needs http://, not file://)
npm run vendor          # re-copy chess.js/pgn-parser/cm-chessboard from node_modules into vendor/
```

Run a single test file: `node --test moveTree.test.js`.
Run a single test by name: `node --test --test-name-pattern="click-to-jump"`.

There is no build step for the app itself — open `http://localhost:8000/index.html` after
starting the server above.

## The vendoring deviation — read this before touching package.json

Root PairFX and `opening-selector/` both have **zero** runtime third-party dependencies and no
`package.json`. This is the first app in the repo that needs real ones: `chess.js` (move
legality), `@mliebelt/pgn-parser` (variation-tree/comment/annotation parsing), and
`cm-chessboard` (board rendering + ChessBase-style annotation drawing) — see
`wayfinder/research/0001-pick-library-stack.md` for why these three and what each one doesn't
cover.

To keep the zero-build-step convention while not depending on a CDN being reachable during a
live classroom demo, `package.json`/`node_modules` exist **purely as a dev-time vendoring and
testing mechanism**:

- `npm install` pulls the three packages as `devDependencies` (never shipped as-is).
- `npm run vendor` (`scripts/vendor-libs.mjs`) copies each package's already-built,
  browser-loadable files verbatim — no transformation — into the committed `vendor/` directory:
  chess.js's self-contained ESM dist, pgn-parser's UMD build, and cm-chessboard's ESM `src/`
  tree plus its CSS/SVG `assets/`.
- The app (`index.html`, `app.js`, `projector.html`, `projector.js`) imports **only** from
  `vendor/`, via plain `<script>` / `<script type="module">` tags — never from `node_modules`,
  never from a CDN.
- Unit tests import the real packages from `node_modules` directly (e.g.
  `import { Chess } from "chess.js"`) rather than the vendored copies, since tests run under
  Node, not a browser — `vendor/chess-js/chess.js` and `node_modules/chess.js/dist/esm/chess.js`
  are the same file content, just reached two different ways for two different runtimes.
- `node_modules/` is gitignored as usual. `vendor/` **is committed** — the app must run from a
  fresh clone with nothing but a static file server, no `npm install` required at demo time.

If a library version bumps in `package.json`, run `npm install && npm run vendor` and re-check
the diff in `vendor/` before committing it.

`@mliebelt/pgn-parser`'s UMD build is loaded as a classic (non-module) `<script>` tag in both
HTML files, which attaches `window.PgnParser`; `app.js`/`moveTree.js` read `window.PgnParser.parse`
rather than importing it, since a UMD build has no ES module exports to import.

## Architecture

**Strict separation of pure logic (no DOM) from DOM rendering/wiring**, mirroring
`opening-selector`'s `engine.js`/`app.js` split — but here it's several small modules instead
of one `engine.js`, because there are several genuinely independent concerns:

| Module | Tests | Owns |
|---|---|---|
| `i18n.js` | `i18n.test.js` | Language detection (first-run default vs. persisted choice), dictionary lookup with Dutch fallback, `{placeholder}` interpolation. |
| `pgnLibrary.js` | `pgnLibrary.test.js` | Auto-naming from PGN headers, the 50-entry cap (`LibraryFullError`, no silent eviction), rename/remove, multi-game upload picker choice-building. |
| `moveTree.js` | `moveTree.test.js` | Glues `@mliebelt/pgn-parser`'s output to `chess.js`: walks the parsed variation tree, replays each move to attach a FEN/from/to to every node, builds addressable paths (`pathKey`, e.g. `"5.v0.2.v0.0"` for a variation nested inside a variation) and a cursor (`createCursor`: `jumpTo`/`stepForward`/`stepBackward`) that is the one shared "current move" pointer driving the board, notes, and variations panel together. Also `continuationsFrom`/`findContinuationBySan` (matching a board move against the loaded tree) and `isCollapsedByDefault`/`formatMoveLabel`. |
| `syncProtocol.js` | `syncProtocol.test.js` | The teacher/projector message shapes and catch-up-on-startup logic. `BroadcastChannel`/`localStorage` are injected (`{channel, storage}`), so this is tested with fake in-memory stand-ins — no browser needed. |

None of these four modules touch the DOM, `fetch`, `IndexedDB`, `BroadcastChannel`, or
`localStorage` directly — they take plain data/injected dependencies in and return plain data
out, which is what makes `node --test` sufficient for them.

**Everything DOM/API-facing is thin app-entry wiring, not logic**, and is deliberately not
unit-tested (there's nothing to meaningfully unit-test — it's glue):

- `app.js` — the teacher tab. Boots i18n, loads the PGN library from IndexedDB, creates the two
  `cm-chessboard` instances (main board + the small projector-preview board) with the
  `RightClickAnnotator` extension, wires DOM events (upload, rename, delete, library select,
  variations-panel clicks, arrow-key stepping, overlay checkboxes, the Sync toggle) to the pure
  modules above, and calls `syncProtocol.createTeacherSync(...).publishPosition(...)` whenever
  the position/annotations change and Sync is on.
- `projector.js` — the projector tab. Creates one `cm-chessboard` instance with `Markers` +
  `Arrows` (no `RightClickAnnotator` — the projector never accepts drawing input) and does
  nothing but render whatever `syncProtocol.createProjectorSync(...)` hands it. It never parses a
  PGN and never holds a move tree — the sync pointer is fully render-ready (a FEN + display
  text + squares), specifically so the projector doesn't need one.
- `idbLibraryStore.js` — a handful of promisified `IndexedDB` calls (`getAllLibraryEntries` /
  `putLibraryEntry` / `deleteLibraryEntry`). IndexedDB was picked over `localStorage` for the
  library because a school year's worth of PGNs could exceed `localStorage`'s ~5-10MB cap
  (`wayfinder/research/0001`).

**Sync protocol, concretely**: two independent records, each with its own `localStorage` key and
`BroadcastChannel` message type — `POINTER` (`{fen, moveLabel, lastMove, orientation, arrows,
markers}`, written on every move/jump/draw while Sync is on) and `OVERLAYS` (the three checkbox
states, written/broadcast **regardless** of Sync, since overlay visibility is a remembered
display preference, not part of "the lesson position" — ticket 0003). A late-joining or reloaded
projector tab reads both synchronously from `localStorage` at startup (`BroadcastChannel` has no
message history), then listens for live messages. Toggling Sync back on doesn't need a separate
"push" — `app.js`'s `render()` already publishes whenever `syncOn` is true, so flipping it back
on and re-rendering is the resync.

## Judgment calls made while implementing (things the requester should know about)

The wayfinder tickets settled product behavior at a conceptual level; a few concrete details
weren't specified and needed a decision during implementation:

- **"Sidelines auto-collapse past ~2 ply" (ticket 0005) was read as *within* a sideline, not
  nesting depth.** Implemented as: a sideline's first 2 plies render expanded, the rest of that
  same line collapses behind a "show more" link (`moveTree.js: isCollapsedByDefault`). An
  alternative reading — collapsing a variation-nested-inside-a-variation regardless of its own
  length — was also plausible from the ticket's wording; if that's not the intended behavior,
  it's a one-function change.
- **The drawing-tool rail's meaning changed from the 0002 prototype.** The prototype mocked up
  three left-click "select a tool, then click to draw" buttons (arrow/marker/eraser). Ticket
  0004 — resolved *after* that layout prototype — settled on cm-chessboard's native right-click-
  drag gesture instead (no tool selection needed at all). The rail now holds one real action
  (clear all annotations) plus a hover tooltip explaining the right-click + modifier-key
  convention, rather than three non-functional buttons left over from the older mockup.
- **`%cal`/`%csl` PGN color letters → cm-chessboard color names**: G→success(green),
  R→danger(red), B→info(blue), Y→warning(orange). PGN's Yellow has no matching cm-chessboard
  color; orange was the closest available.
- **No open-ended free play.** The teacher can advance the board by dragging/clicking a piece,
  but only if the resulting move matches a move already in the loaded PGN tree
  (`moveTree.js: findContinuationBySan`) — a move that deviates from the loaded file is rejected
  (the piece snaps back). This was a judgment call filling a real gap: map.md's "Not yet
  specified" section explicitly leaves "a freeform/no-PGN-loaded mode" open, so building
  unrestricted free play would have been scope creep on an acknowledged fog item rather than an
  implementation of settled spec. Worth a wayfinder ticket if teachers want it.
- **Last-move highlight renders via cm-chessboard's own `markerSquare` sprite** (a `Markers`
  extension marker type, tinted with the prototype's `--last-move` gold via CSS), not a
  pixel-identical reproduction of the 0002/0003 prototypes' CSS `box-shadow` inset. Same color,
  same purpose, visually close but not a pixel match — cm-chessboard doesn't expose an "add a
  CSS box-shadow to this square" primitive, and building one from scratch wasn't worth it for a
  cosmetic difference this small.
- **Rename/delete-confirm use native `prompt()`/`confirm()`**, not custom modal dialogs (the
  multi-game picker *does* get a real modal, since ticket 0006 calls it out specifically). A
  pragmatic v1 scoping call, not a spec requirement either way.

## Language note

UI defaults to Dutch (`locales/nl.json`), French and English also fully supported
(`locales/fr.json`, `locales/en.json`) — see `wayfinder/tickets/0007-define-i18n-approach.md`.
All three are flat `{ "key": "translated string" }` dictionaries kept in sync by hand; add a key
to all three files together, not just one.

## Fixtures

`fixtures/ruy-lopez-demo.pgn` — a short Ruy Lopez used for manual/visual QA: a top-level
sideline (the Berlin Defence), a sideline nested inside that sideline, PGN comments on several
moves, and one embedded `%cal`/`%csl` annotation. Upload it through the real teacher-tab upload
flow to exercise the whole pipeline end to end.
