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
| `pgnLibrary.js` | `pgnLibrary.test.js` | Auto-naming — both of a library *entry* (`nameForEntry`) and of one *game* inside it (`nameForGame`) — the 50-entry cap (`LibraryFullError`, no silent eviction), rename/remove, and which game within a (possibly multi-game) entry is currently selected/shown (`showGameList`, `gameListChoices`, `clampGameIndex`). |
| `moveTree.js` | `moveTree.test.js` | Glues `@mliebelt/pgn-parser`'s output to `chess.js`: walks the parsed variation tree, replays each move to attach a FEN/from/to to every node, builds addressable paths (`pathKey`, e.g. `"5.v0.2.v0.0"` for a variation nested inside a variation) and a cursor (`createCursor`: `jumpTo`/`stepForward`/`stepBackward`) that is the one shared "current move" pointer driving the board, notes, and variations panel together. Also `continuationsFrom`/`findContinuationBySan` (matching a board move against the loaded tree), `isCollapsedByDefault`/`formatMoveLabel`, `splitPgnGames`/`parseGames` (splitting/parsing a raw multi-game file), `replaceGameInPgnText` (writing one game's text back into its own slot within a multi-game file without touching the others), and (for "Lock PGN" off) `addMove` (grows the tree with a move that deviated from it) plus `serializeGameTree` (turns a — possibly grown — tree back into PGN text for persistence). |
| `syncProtocol.js` | `syncProtocol.test.js` | The teacher/projector message shapes and catch-up-on-startup logic. `BroadcastChannel`/`localStorage` are injected (`{channel, storage}`), so this is tested with fake in-memory stand-ins — no browser needed. |

None of these four modules touch the DOM, `fetch`, `IndexedDB`, `BroadcastChannel`, or
`localStorage` directly — they take plain data/injected dependencies in and return plain data
out, which is what makes `node --test` sufficient for them.

**Everything DOM/API-facing is thin app-entry wiring, not logic**, and is deliberately not
unit-tested (there's nothing to meaningfully unit-test — it's glue):

- `app.js` — the teacher tab. Boots i18n, loads the PGN library from IndexedDB, creates the two
  `cm-chessboard` instances (main board + the small projector-preview board) with the
  `RightClickAnnotator` extension, wires DOM events (upload, rename, delete, library select, the
  per-game list clicks, variations-panel clicks, arrow-key stepping, overlay checkboxes, the Sync
  toggle) to the pure modules above, and calls
  `syncProtocol.createTeacherSync(...).publishPosition(...)` whenever the position/annotations
  change and Sync is on. `loadEntry(id, gameIndex)` reparses the open entry's raw `pgnText` into
  `state.currentEntryGames` on every call (feeding both the board and the per-game list), rather
  than trusting a cache — the text can change underneath it (a Lock-PGN-off deviation persisted
  via `persistGrownTree`).
- `projector.js` — the projector tab. Creates one `cm-chessboard` instance with `Markers` +
  `Arrows` (no `RightClickAnnotator` — the projector never accepts drawing input) and does
  nothing but render whatever `syncProtocol.createProjectorSync(...)` hands it. It never parses a
  PGN and never holds a move tree — the sync pointer is fully render-ready (a FEN + display
  text + squares), specifically so the projector doesn't need one.
- `idbLibraryStore.js` — a handful of promisified `IndexedDB` calls (`getAllLibraryEntries` /
  `putLibraryEntry` / `deleteLibraryEntry`). IndexedDB was picked over `localStorage` for the
  library because a school year's worth of PGNs could exceed `localStorage`'s ~5-10MB cap
  (`wayfinder/research/0001`).

**PGN library entry, concretely** (reversed from ticket 0006 — see "Judgment calls" below): each
IndexedDB-stored entry is `{id, name, pgnText, selectedGameIndex, createdAt}`. `pgnText` is the
**entire raw uploaded file**, unmodified at upload time, not one re-serialized picked-out game —
so a 3-game file's entry contains all 3 games' text. `selectedGameIndex` is which of those games
(0-based, as `MoveTree.parseGames`/`splitPgnGames` would split them) is currently loaded on the
board; it's updated (and persisted) both when the teacher clicks a different game in the
"games in this file" list and, defensively, whenever `Lib.clampGameIndex` has to correct an
out-of-range value (e.g. hand-edited storage). `name` is the *entry's* name (`Lib.nameForEntry`)
— which is not always the same string as what's shown next to the board for the currently-loaded
game (`Lib.gameListChoices`-derived, per game) — see the Judgment calls entry on this below. The
50-entry cap (`LIBRARY_CAP`) still counts **uploaded files**, not games — a 3-game upload still
costs exactly 1 of the 50 slots, same as a 1-game upload; `pgnLibrary.js`'s cap logic itself
(`isLibraryFull`/`addEntry`) is untouched by this feature.

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
- **"No open-ended free play" (superseded — see "Lock PGN" below).** The original v1 build only
  let the teacher advance the board by dragging/clicking a piece if the resulting move matched a
  move already in the loaded PGN tree (`moveTree.js: findContinuationBySan`); a deviating move was
  rejected outright (the piece snapped back), with no way to turn that off. That was flagged at
  the time as "worth a wayfinder ticket if teachers want it" — this got requested, and is now the
  "Lock PGN" feature documented below: the old always-on behavior is now the *default* (toggle on),
  but a teacher can turn it off to play, and permanently record, any legal move including ones that
  deviate from the loaded file. The gap this fills is still distinct from map.md's still-open
  "freeform/no-PGN-loaded mode" fog item (playing with *no* PGN loaded at all) — that remains
  unbuilt; this is about deviating from a PGN that *is* loaded.
- **"Lock PGN" checkbox — where a deviating move attaches in the tree.** When Lock PGN is off and
  a played move doesn't match `findContinuationBySan`, `moveTree.js: addMove(gameTree, node,
  moveResult)` decides where it goes, using the exact same path/pathKey/entryPointKey shape
  `buildLine` already establishes for PGN-authored moves, so the result is indistinguishable from
  a node that was in the file all along: (1) if the cursor is at the end of its line (a leaf, no
  continuation recorded yet — e.g. the loaded PGN just ends there), the move simply extends that
  same `lineNodes` array one ply further; (2) if the cursor's position already has a recorded
  continuation (the mainline continuation, and/or one or more existing sidelines), the move is
  attached as a *new* sideline on that continuation's node, alongside whatever's already there —
  the same slot a hand-authored `(...)` variation in the PGN text would occupy. Both cases are
  covered by `moveTree.test.js`.
- **"Lock PGN" checkbox — the grown tree is persisted, not session-only.** A move added while
  unlocked is serialized back to PGN text (`moveTree.js: serializeGameTree`, reconstructing
  `%cal`/`%csl` from `arrows`/`markers` so existing annotations round-trip losslessly) and written
  back to the library entry via `putLibraryEntry` (`app.js: persistGrownTree`), the same way
  rename already updates a stored entry. Read as the intended behavior from the requester's own
  wording ("added in the pgn, as one would expect") — a teacher building up a repertoire file
  session over session, one lesson at a time, is exactly the scenario this feature is for, and
  losing that on an accidental reload would defeat the point.
- **"Lock PGN" checkbox — its checked state is remembered, but via a plain localStorage key, not
  the overlay-prefs sync machinery.** The three overlay-visibility checkboxes (ticket 0003) are
  remembered *and* broadcast to the projector, because overlay visibility is itself something the
  projector needs to know to render correctly. Lock PGN is different: it only gates what the
  *teacher* board accepts as input — the projector never accepts input at all (confirmed
  elsewhere in this file) and has no use for this preference. So it's remembered the same way the
  language and last-opened-library-entry preferences already are: a direct
  `localStorage.getItem`/`setItem` under its own key (`chess-classroom:lockPgn`) in `app.js`, read
  once at boot, with no `syncProtocol.js` involvement. Defaults to **on** (checked) when no stored
  preference exists yet, preserving the pre-existing behavior for anyone who never touches the
  checkbox.
- **Last-move highlight renders via cm-chessboard's own `markerSquare` sprite** (a `Markers`
  extension marker type, tinted with the prototype's `--last-move` gold via CSS), not a
  pixel-identical reproduction of the 0002/0003 prototypes' CSS `box-shadow` inset. Same color,
  same purpose, visually close but not a pixel match — cm-chessboard doesn't expose an "add a
  CSS box-shadow to this square" primitive, and building one from scratch wasn't worth it for a
  cosmetic difference this small.
- **Rename/delete-confirm use native `prompt()`/`confirm()`**, not custom modal dialogs. (This
  bullet originally carved out an exception for the multi-game upload picker, which *did* get a
  real modal per ticket 0006. That modal is gone — see the "multi-game library entries" bullets
  below — so there is no longer any modal dialog anywhere in the app; rename/delete-confirm are
  now simply the *only* two confirmation-style interactions, and both use native dialogs.) A
  pragmatic v1 scoping call, not a spec requirement either way.
- **Multi-game library entries: reverses ticket 0006's "picked game becomes the library
  entry."** The requester asked for a persistent, always-available way to browse *every* game in
  an uploaded multi-game PGN (a "games in this file" list, clickable at any time), not just a
  one-time picker at upload. That's incompatible with 0006's original resolution of discarding
  every game except the one picked — so a library entry now stores the **whole raw uploaded
  file** (`pgnText`) plus which game within it is currently selected (`selectedGameIndex`), and
  the one-time picker modal is gone entirely (see "PGN library entry, concretely" above for the
  exact shape). Loading a different game from the same file is now just a click, with no
  re-upload. The 50-entry cap is unchanged in spirit and still means 50 *uploaded files* — see
  above; that part of ticket 0006's resolution still holds.
- **Box 1 (which library entry) is the existing `#librarySelect` dropdown — not a new panel.**
  The feature request described "1 box with the pgn" identifying which uploaded file is active.
  The existing library dropdown in the top bar already does exactly this (it's literally "which
  uploaded PGN is active," unchanged by this feature), so no new UI was built for it — adding a
  second, separate "which file" control right next to a `<select>` that already answers the same
  question would just be visual duplication. If a more prominent/different box-1 treatment turns
  out to matter in practice (e.g. teachers not noticing the existing dropdown is doing this job),
  that's a small, isolated follow-up — it wouldn't touch box 2 or the data model at all.
- **Box 2 (the "games in this file" list) hides itself entirely for a single-game entry**,
  rather than always rendering with one (non-)choice. Most uploads will be single games, and a
  list box with exactly one item, nothing else to pick, and nothing to scroll would be pure
  visual noise in that — the common — case; it also means the multi-game case is what makes box 2
  appear at all, which reads as a discoverable "oh, this file has more than one game" signal
  rather than a permanently-present near-empty panel. (`pgnLibrary.js: showGameList`; toggled via
  `app.js: renderGameList`.)
- **A move added while Lock PGN is off is written back into its own slot within the entry's
  file, not used to overwrite the whole entry.** Before this feature, `persistGrownTree`
  (`app.js`) replaced an entry's entire `pgnText` with `serializeGameTree`'s output, because an
  entry held exactly one game. Now that an entry can hold several, doing that would silently
  discard every other game sharing the entry the moment the teacher deviated from just one of
  them — clearly wrong, and the trickiest part of this whole feature to get right. Fixed via
  `moveTree.js: replaceGameInPgnText(pgnText, gameIndex, newGameText)`: splits the entry's raw
  text back into its per-game chunks (`splitPgnGames`), swaps out only the chunk at
  `gameIndex`/`state.currentGameIndex`, and rejoins — every other game's chunk is left exactly as
  `splitPgnGames` found it. Verified end-to-end (not just unit-tested): deviating from one game in
  a 3-game fixture with Lock PGN off, reloading the page, and reselecting that same game from box
  2 shows the deviation persisted, while the other two games in the same file remain unchanged.

## Language note

UI defaults to Dutch (`locales/nl.json`), French and English also fully supported
(`locales/fr.json`, `locales/en.json`) — see `wayfinder/tickets/0007-define-i18n-approach.md`.
All three are flat `{ "key": "translated string" }` dictionaries kept in sync by hand; add a key
to all three files together, not just one.

## Fixtures

`fixtures/ruy-lopez-demo.pgn` — a short Ruy Lopez used for manual/visual QA: a top-level
sideline (the Berlin Defence), a sideline nested inside that sideline, PGN comments on several
moves, and one embedded `%cal`/`%csl` annotation. Upload it through the real teacher-tab upload
flow to exercise the whole pipeline end to end. Being single-game, it's also the fixture for
confirming box 2 (the "games in this file" list) correctly hides itself.

`fixtures/multi-game-demo.pgn` — three short, distinct synthetic games (Italian, Scandinavian,
Caro-Kann; not from any real source) added for this feature's QA: confirms box 2 lists all three,
that clicking each one loads it onto the board, and (with Lock PGN off) that a deviating move
persists into its own game's slot on reload without disturbing the other two games sharing the
same library entry.
