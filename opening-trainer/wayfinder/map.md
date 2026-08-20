---
labels: [wayfinder:map]
---

## Destination

A working v1 of **Opening Trainer**, a new static sub-app (sibling to `opening-tree/`,
`opening-selector/`, `chess-classroom/`): upload PGN files into named, per-color repertoires,
browse each repertoire as a move tree (opening-tree's board/click-to-move UX, reused), and drill
a branch/repertoire/all-of-color with a ChessTempo-§17.15-style training-settings screen
(scope × method), backed by spaced-repetition state persisted in the browser's IndexedDB.

## Notes

- Domain: chess opening-repertoire training, static front-end, no backend. Glossary and the two
  hard-to-reverse calls live in `../CONTEXT.md` and `../docs/adr/` (node identity = SAN path, no
  transposition merging in v1; simplified binary-graded SM-2 scheduler) — read those before
  touching `engine.js`.
- **This effort's Notes override the plan-only default**: the requester was away from keyboard
  for the whole charting session, explicitly delegated destination/scope decisions to the agent
  (one tight grilling round, all answers "take the recommended choice"), and then explicitly
  asked for the map to carry into a real build this same session, using TDD and vertical slices,
  applying clean-code principles. So this map's tickets are `task` tickets the charting session
  itself resolves by building, not decisions left for a separate session — see Decisions so far.
- Skills every session should consult: `tdd` (each ticket below is one red-green-refactor
  vertical slice); read `../../opening-tree/CLAUDE.md` first for the board/piece-rendering
  pattern being reused (vendored `chess.js` 1.4.0 for SAN-replay-to-FEN only + `cm-chessboard`'s
  SVG piece sprite for art only, hand-rolled click-to-move board, no board-UI library, no
  PGN-variation parsing inside `chess.js`).
- ChessTempo's manual §17.15 ("Opening training settings") — the requester's named reference —
  was **not reachable as a primary source this session**: every `chesstempo.com` path (manual,
  blog, forum) returned Cloudflare's active bot-challenge (`cf-mitigated: challenge`) to both
  `WebFetch` and a browser-UA `curl`, all session. The training-settings design below is
  reconstructed from secondary sources (search-indexed forum thread titles/snippets, e.g.
  "Opening Trainer Settings", "randomness and subbranches", third-party review snippets
  confirming "Drill" → review-in-order, "train branch" → default method, multi-repertoire
  support, transposition handling, depth/scope restriction) plus ordinary spaced-repetition
  domain knowledge — not a verbatim transcript of the manual. Flagged wherever confidence is
  lower; a later session with real browser access to chesstempo.com could tighten this.
- Standing preference confirmed by requester mid-session: **TDD, vertical slices, clean code**
  for the build itself.

## Decisions so far

- [PGN parsing (with RAV variations) and repertoire tree engine](./tickets/0001-pgn-parsing-and-tree-engine.md):
  built via TDD (14/14 tests green) — `engine.js` merges any number of uploaded PGN files' games
  (mainline + nested variations) into one SAN-path-keyed tree.
- [IndexedDB storage layer for repertoires and card state](./tickets/0002-indexeddb-storage-layer.md):
  built via TDD (12/12 tests green) — one object store, injectable `{get, getAll, put, delete}`
  interface, real `openIndexedDbStore` adapter left untested by design (browser-API glue).
- [Spaced-repetition scheduler (simplified SM-2, binary grading)](./tickets/0003-srs-scheduler.md):
  built via TDD (39/39 tests green) — Card lifecycle plus Scope/Method resolution in `engine.js`;
  review-in-order turned out to be `nodesInScope`'s own pre-order, no extra function needed.
- [Repertoire browser UI (upload, board, tree navigation)](./tickets/0004-repertoire-browser-ui.md):
  built and actually run end-to-end (headless-Chromium Playwright driver, no console errors) —
  list/create/rename/delete/upload + a browse screen reusing opening-tree's board pattern.
- [Training mode UI — settings screen and session runner](./tickets/0005-training-mode-and-settings-screen.md):
  built, refined the domain model along the way (Trainee Node — only your own color's moves get
  quizzed), and one real bug (double-grading a turn) was caught by running the app and fixed.
- [Repo wiring — package.json, vendor script, nav link, CLAUDE.md](./tickets/0006-repo-wiring-and-docs.md):
  opening-trainer is fully wired into the repo (nav link, root CLAUDE.md updated, own CLAUDE.md
  written) — the map's destination is reached.
- [Data model: multiple named repertoires per color](../CONTEXT.md): closer to ChessTempo than
  opening-tree's single-merged-tree; requester took the recommended choice.
- [Training settings depth: full scope×method settings screen in v1](../CONTEXT.md#language):
  not deferred; requester took the recommended choice.
- [Wrong-move handling: strict](../CONTEXT.md#language) (must play the repertoire's move before
  the line continues); requester took the recommended choice.
- [Session scope: chart + build a working v1 now](./tickets/): requester took the recommended
  choice; this map's tickets are execution slices, not open decisions (see Notes).
- [Node identity is the SAN path, not the FEN](../docs/adr/0001-node-identity-is-san-path-not-fen.md):
  no automatic transposition merging in v1, matching `opening-tree/engine.js`'s existing
  convention.
- [Simplified SM-2 scheduler, binary correct/incorrect grading](../docs/adr/0002-simplified-sm2-scheduler-binary-grading.md):
  no 0-5 quality self-rating, since the board already knows objectively whether the move matched.

- **ChessTempo manual §17.15 primary source captured** (`wayfinder/research/0001-chesstempo-manual-17.15-17.23.md`):
  the requester pasted the real manual text mid-session. It corrected one invented detail —
  the third training Method was a shuffle-based "random" that doesn't exist in the real
  settings; replaced with the real "Least recent/unseen first" (`leastRecentFirst`, TDD,
  49/49 tests green) — and confirmed one default already matched by luck (a new Card's first
  correct answer schedules 1 day out, same as ChessTempo's "Initial Correct Scheduled time").
- **Drag-and-drop added to both boards** (native HTML5 DnD, `wireDragAndDrop` in `app.js`),
  alongside click-to-move rather than replacing it — reuses the exact same move-resolution
  logic, no `engine.js` changes needed. Verified with real dispatched `DragEvent`s (Playwright's
  `dragAndDrop()` helper doesn't reliably trigger native DnD against this app's SVG pieces —
  see `CLAUDE.md`'s Judgment calls); click-to-move re-verified as a regression check.

## Not yet specified

- Automatic transposition merging across move orders (ruled out for v1 by ADR 0001; could
  become its own future map if it turns out to matter in practice).
- Handling of PGN comments/NAGs/clock annotations on import — v1 parses moves and variations
  only; whether annotations are worth surfacing later isn't specified.
- Import/export of a repertoire's Card (SRS) state as its own file (backup/portability beyond
  "re-upload the PGNs"), separate from the PGN-upload flow.
- Repertoire management polish beyond create/rename/delete (e.g. merging two repertoires,
  splitting a branch into a new repertoire).
- Any mobile/touch-specific interaction polish for the board beyond what click-to-move already
  gives for free.
- Real ChessTempo features confirmed by `wayfinder/research/0001` but not built into this v1:
  move previews (arrows showing the correct move before/after an attempt), pause-at-end-of-line,
  leadup/reinforcement tuning for branch training, opening-tree line management (disable/delete/
  copy lines, with the transposition-truncation warning that implies), repertoire shortcuts,
  an opening-explorer panel, an engine-analysis panel, and move comments/annotations. All
  legitimate, all beyond this v1's destination — a candidate list for a future map, not this
  one.

## Out of scope

- Accounts, sync, or any backend — matches every other app in this repo.
- Engine analysis/evaluation of moves or positions.
- Playing against a live/online opponent — this is a repertoire-drilling tool against your own
  uploaded prep, not a play-a-bot feature.
- Sharing/publishing a repertoire between different users or devices.
- Matching every ChessTempo screen/feature 1:1 (e.g. its tactics trainer, its rating system) —
  scoped specifically to the opening-repertoire-trainer slice per the requester's own framing.
