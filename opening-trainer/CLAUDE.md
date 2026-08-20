# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
directory.

## What this is

A browser-local chess opening-repertoire trainer, modeled on ChessTempo's opening trainer
(manual §17.15, "Opening training settings"): upload your own PGN files, browse them as a move
tree per named, per-color **Repertoire**, and drill a branch/repertoire/all-of-a-color with a
spaced-repetition scheduler. No backend, no accounts — everything lives in the browser's own
IndexedDB. See `wayfinder/map.md` for the full destination and scope, `CONTEXT.md` for the
Repertoire/Node/Card glossary this codebase's naming follows, and `docs/adr/` for the two
hard-to-reverse calls (node identity, scheduler design) — read those before changing `engine.js`.

## Commands

```bash
node --test             # run all unit tests (engine.js + db.js; app.js is DOM glue, see below)
npm run serve            # python3 -m http.server 8000, then open http://localhost:8000/index.html
npm run vendor           # re-copy chess.js + cm-chessboard's piece sprite into vendor/
```

Run a single test file: `node --test engine.test.js`.
Run a single test by name: `node --test --test-name-pattern="<pattern>"`.

There is no build step for the app itself.

## Architecture

**Strict separation of pure logic from DOM/storage glue**, matching opening-tree's
`engine.js`/`app.js` split:

| Module | Tests | Owns |
|---|---|---|
| `engine.js` | `engine.test.js` | PGN parsing (with RAV variations), tree building, the Card/SRS lifecycle, Scope/Method resolution. Zero dependencies. |
| `db.js` | `db.test.js` | Repertoire CRUD against an injectable `{get, getAll, put, delete}` store interface; one real IndexedDB-backed adapter. |
| `app.js` | (untested, DOM glue) | Form handling, state, rendering. The only place `chess.js` is used — FEN generation and, for training, full legal-move input. |

**`engine.js`** parses uploaded PGN text (`splitPgnGames`, `parseHeaders`) and merges every
game's movetext — mainline *and* `(...)` RAV variations, nested arbitrarily deep — into one
Repertoire tree via a recursive-descent parser (`mergeMovetextIntoTree`/`playTokens`): a `(`
branches from the position *before* the most recently played move, i.e. it's a sibling of that
move, not a child of it. Node identity is the SAN path from the root (ADR 0001) — no FEN/
transposition merging, so `buildRepertoireTree`/`mergeMovetextIntoTree` stay a plain
string-keyed walk with zero chess-legality dependency, same as `opening-tree/engine.js`.
`childrenOf`/`nodeAtPath`/`resolveSquareClick` mirror opening-tree's shapes directly (the last
one ported verbatim) for the browsing board to reuse.

**Card lifecycle** (`initCard`/`gradeCard`/`isDue`) is a simplified SM-2 with binary
correct/incorrect grading, not a 0-5 quality scale (ADR 0002) — the board already knows
objectively whether a move matched, so there's no subjective recall-quality judgment to collect.
A Card lives on whichever Node it belongs to (embedded in the tree `db.js` persists, opaque to
that module) and only ever exists on a **Trainee Node** — a Node reached by a move of the
Repertoire's own color (`isTraineeMove`/`trainableNodesInScope`). The opponent's replies are
never quizzed and never need a live "auto-play" choice: a Training Session's board position is
just that entry's own stored path, replayed through `chess.js` in `app.js` the same way browsing
computes a FEN — the opponent's moves are already baked into the path from whichever real
uploaded game produced it.

**Scope/Method** (`nodesInScope`, `trainableNodesInScope`, `leastRecentFirst`, `pickNextDue`)
resolve `CONTEXT.md`'s Scope (branch / repertoire / all-of-color) and Method (review-in-order /
least-recent-unseen-first / spaced-repetition — ChessTempo's real three, per
`wayfinder/research/0001`). Review-in-order needed no function of its own — `nodesInScope`'s own
pre-order walk (self, then children in first-encountered order) already *is* that traversal.
Least-recent/unseen-first reorders that same list (every card-less entry first, then trained
ones oldest-due-first). Spaced-repetition is the only *dynamic* method: `pickNextDue` picks the
live most-overdue Card each turn (falling back to introducing a card-less "new" node), with an
`excludePath` so a just-lapsed card doesn't repeat on the very next turn.

**Well-known moves are auto-played rather than quizzed**, for the two non-spaced-repetition
Methods only (`autoPlaysWellKnownMoves` in `app.js`; `isWellKnown`/`WELL_KNOWN_REPS` in
`engine.js`) — ChessTempo's "Don't show start moves threshold" (`wayfinder/research/0001`).
`advanceSession` loops past any node whose Card has `WELL_KNOWN_REPS` (3) correct answers in a
row, tallying `session.autoPlayed` for the training header/summary, until it finds one that
still needs asking or runs out. Spaced-repetition is deliberately excluded — testing at
increasing intervals to verify retention is the entire point of that Method, so a well-known
Card due for review there is still tested normally, on schedule. `summarizeMastery` (new /
learning / known / due counts) surfaces the same "well known" line to two other places: the
repertoire list (mastery for the whole Repertoire) and the browse board pane (mastery for
whatever branch is currently in view — "how well do we know this line").

**`db.js`** persists one record per Repertoire (`{id, name, color, tree, createdAt, updatedAt}`)
in a single IndexedDB object store. Every CRUD rule — blank-name/invalid-color rejection,
name-uniqueness scoped per color (a White and a Black repertoire may share a name), "touch
`updatedAt`" — is written against an injectable store interface and unit-tested with an
in-memory fake, the same shape as `opening-tree/client.js`'s injectable `fetchImpl` for the
network. `openIndexedDbStore()` is the one real adapter; it's browser-API glue and, like
`opening-tree/app.js`'s DOM code, isn't exercised by `node --test`.

**`app.js`** has four screens: the repertoire list (per-color tabs; create/rename/delete;
upload one or more PGN files into an existing or brand-new repertoire, merging their games'
variations straight into that repertoire's tree via `mergeMovetextIntoTree`); a browse screen
reusing opening-tree's board/piece/click-to-move pattern exactly, with move-list rows showing a
status badge (`moveBadge`: opponent's reply / not trained yet / due / learning / well known) instead of
opening-tree's win-rate bar, since a repertoire tracks Cards, not game outcomes; a training
settings screen (Method, board orientation, wrong-move handling); and the training session
itself. **Drill** (the per-branch button on the browse screen) skips the settings screen
entirely and starts a session directly — Branch scope, review-in-order, strict — matching
`CONTEXT.md`'s Drill definition and ChessTempo's own per-variation "Drill" button (research,
`wayfinder/map.md`'s Notes). The **list screen's "Train"/"Train all &lt;color&gt;"** buttons
open the real settings screen instead.

**Both boards accept drag-and-drop as well as click-to-move** — native HTML5 drag-and-drop
(`wireDragAndDrop`), not a hand-rolled pointer-tracking drag. It's wired as a second way to
supply the exact same "from square, to square" the click flow already resolves against
(`resolveSquareClick` / the legal-move lookup below): a piece's `dragstart` plays the role of
the first click (selects the source), and the target square's `drop` plays the role of the
second (calls the same `onclick` closure that square already has). Only a square with an actual
move out of it is `draggable`, matching what's clickable. One care point: nothing renders
synchronously inside `dragstart` — the browser is actively dragging that DOM node, and a
`render()` rebuild (`app.innerHTML = ""`) at that moment would tear it out and abort the
gesture; the render happens on `drop`/`dragend` instead, same as the click flow only reacts on
its second click.

**The training screen has its own flip-board button**, separate from the settings screen's
Board orientation choice (auto/white/black) — that choice is the session's fixed default
(`sessionBoardOrientation`); the flip button is a live, visual-only override on top of it for
this one session, same relationship browse's flip button has to its color-tab default. Neither
flip touches `session.current` or move input, just which orientation `renderTrainingBoard` draws.

The **training board accepts any `chess.js`-legal move**, not just tracked ones — unlike the
browsing board (which only ever offers moves this app has data for, via `resolveSquareClick`),
training has to let a genuinely wrong move happen for wrong-move handling to have something to
catch. A pawn reaching the last rank offers one legal move per promotion piece sharing the same
from/to; `resolveLegalMove` defaults to queen, the same kind of simplification opening-tree's
board never needed (it's browse-only, never asked to produce a *new* move). Strict wrong-move
handling reveals the correct move as a highlighted "hint" pair of squares and requires it to be
played to continue; lenient reveals it and offers a "Continue" button instead. Either way a
Card is graded exactly once per turn — `gradedThisTurn` is set inside `gradeCurrentCard` itself,
not at each call site, after a real bug (a wrong-then-correct turn double-grading, caught only
by actually running the app — see Judgment calls below) showed why that matters.

## The vendoring deviation

Same pattern as `opening-tree/CLAUDE.md`/`chess-classroom/CLAUDE.md` describe in full —
`package.json`/`node_modules` exist purely as a dev-time vendoring and testing mechanism,
`npm run vendor` (`scripts/vendor-libs.mjs`) copies files verbatim into the committed `vendor/`
directory, and the app imports only from `vendor/`, never `node_modules` or a CDN. Same two
devDependencies as opening-tree, for one extra reason on `chess.js`'s side: it still does FEN
generation for the board, but here it *also* drives the training board's legal-move input
(`chess.moves({verbose: true})`) — opening-tree's board is browse-only and never needed that.
`cm-chessboard` is vendored only for its piece-art SVG sprite, same as opening-tree.

## Piece art

Identical to `opening-tree`'s approach — `<svg><use href="#wk">` against the vendored Cburnett
sprite (`loadPieceSprite()`), no unicode glyphs, no mapping table (`chess.js`'s own
`{color, type}` piece shape spells out the sprite's element ids directly). See that app's
CLAUDE.md for the attribution/license detail; the footer credit line here matches it.

## Judgment calls made while implementing

- **A session's board position is always a full replay of that entry's own stored path**, never
  a live "auto-play the opponent" step. This fell out of choosing per-Card, per-Trainee-Node
  scheduling (see Architecture above) — an initial `pickOpponentReply` export was written before
  this became clear, then deleted again rather than shipped unused (`wayfinder/tickets/0005`).
- **A trainee node with more than one child** (the trainee prepared multiple tries for
  themselves at one position — unusual, but possible) becomes two independent Cards, each
  quizzing one specific move; neither turn accepts the sibling move as also-correct. Simple,
  and matches this app's per-Node Card model without new machinery; revisit only if real usage
  shows it's confusing.
- **Repertoire rename/delete use `window.prompt`/`window.confirm`** rather than a custom modal —
  deliberately minimal for v1. A nicer inline-editing UI is easy to add later without touching
  `db.js` or `engine.js`.
- **No promotion-piece picker.** `resolveLegalMove` defaults to queen when a click matches more
  than one legal move (i.e. an under-promotion). Fine for a repertoire trainer — under-promotion
  prep is rare — but a real gap if it ever isn't.
- **`WELL_KNOWN_REPS` (3) is a fixed constant, not a setting.** ChessTempo's real equivalent
  ("Don't show start moves threshold") is user-tunable; making it a setting here is legitimate
  future scope (`wayfinder/map.md`'s Not yet specified), not something this v1 needed to ship.
- **There is no "random" training Method, and there never should be one.** An earlier version
  of this app invented a shuffle for the third Method before the real ChessTempo manual text
  became available; the real third option is "Least recent/unseen first"
  (`leastRecentFirst`/`wayfinder/research/0001`), a deterministic ordering, not a shuffle. If a
  future session is tempted to add randomness back in (e.g. "make review-in-order less
  monotonous"), that's new scope, not a restoration of something that was correct before.
- **Correction to an earlier version of this note — testing drag-and-drop needs a *real* mouse
  gesture, not dispatched `DragEvent`s.** A first pass at drag support (`draggable="true"` set
  directly on the piece `<svg>`) was "verified" by dispatching synthetic
  `dragstart`/`dragenter`/`dragover`/`drop`/`dragend` events via `element.dispatchEvent(new
  DragEvent(...))` — that passed, because dispatching a `DragEvent` directly only tests that
  `wireDragAndDrop`'s *listeners* react correctly; it completely bypasses the browser's actual
  native drag-initiation logic; a real mouse gesture (`mousedown` → `mousemove` → `mouseup`,
  via Playwright's `page.mouse.*` or a real `page.dragAndDrop()`) never fired `dragstart` at
  all for that `<svg>`. **`draggable="true"` on an SVG element doesn't reliably start a native
  drag in Chromium for a real mouse gesture, even though the attribute is accepted without
  complaint** — this is why `wireDragAndDrop` sets `draggable` on the wrapping square `<div>`
  instead (an HTML element) and uses `dataTransfer.setDragImage(pieceEl, ...)` to keep the
  *visual* drag ghost as just the piece. If drag-and-drop is touched again, verify with a real
  mouse gesture, not a dispatched event — the dispatched-event version will falsely pass even
  if dragging is completely broken for an actual user.
- **Bug caught only by running the app, not by the test suite**, worth flagging since `app.js`
  is deliberately untested: `gradedThisTurn` was checked before grading a Card but never *set*,
  so a wrong-then-correct turn silently graded twice (once incorrect, once correct). Fixed by
  moving the flag-set into `gradeCurrentCard` itself. If a future change to the training flow
  ever needs a second grading call site, this is exactly the kind of bug `app.js` being untested
  means the test suite won't catch — a manual click-through (or the headless-Chromium driver
  script used to catch this one) is worth re-running after any change near `handleAttempt`/
  `gradeCurrentCard`/`advanceSession`.

## Fixtures / manual QA

No committed fixture data — `engine.test.js`/`db.test.js` build their own inline fixtures (small
hand-written PGNs, an in-memory fake store), same convention as `opening-tree`. For manual QA:
`npm run vendor && npm install && npm run serve`, then upload a PGN with at least one `(...)`
variation into a fresh repertoire and confirm the move list shows both branches before trusting
anything deeper (settings screen, training). This app was verified end-to-end once already —
create repertoire → upload a variation PGN → browse (board/move-list/breadcrumb/flip) → Drill →
wrong move (hint) → correct retry → next turn → end session → summary — via a headless-Chromium
Playwright script (no `chromium-cli` in this sandbox, so a small ad-hoc driver script was
written instead; see the `run` skill if repeating this) with zero console errors.
