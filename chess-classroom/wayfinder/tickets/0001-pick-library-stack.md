---
id: 0001
title: Pick the chess-classroom library stack
labels: [wayfinder:research]
status: closed
assignee: research-subagent
map: ../map.md
blocked_by: []
---

## Question

Pick the concrete library stack chess-classroom is built on, covering:

- **Chess rules/PGN parsing**: move validation, and parsing a PGN file into a move tree
  (mainline + nested variations + per-move comments).
- **Board rendering**: drag/click move input, usable for both the teacher board and the
  projector board.
- **Variation-tree / notes browsing UI**: something close enough to adapt for a right-hand
  variations panel and an under-the-board notes (PGN-comment) panel — doesn't need to be
  purpose-built for this, but shouldn't require building a move-tree renderer from scratch.
- **Freehand annotation**: drawing arrows and square highlights on the board, ChessBase-style.
- **Cross-tab live sync**: confirm `BroadcastChannel` as the mechanism (vs. an alternative),
  and what — if anything — localStorage/IndexedDB is used for underneath (the multi-PGN
  library, and letting a projector tab that opens or reloads mid-session catch up to the
  teacher's current position).

Prefer well-maintained, dependency-light options that fit a plain static app — no required
backend — matching the rest of this repo (root PairFX and opening-selector are both
build-step-free, plain `<script>`-tag apps). If the best-fit stack requires a build step (e.g.
bundling an npm package that isn't usable via a plain `<script>` tag), say so explicitly and
recommend the lightest viable setup, since that would be a first for this repo.

Produce a short recommendation: the specific libraries (with versions/links), why each was
picked over alternatives, and — importantly — what each one does *not* cover, so those gaps
are visible to the tickets that depend on this one (0003, 0004).

## Resolution

Full findings: [../research/0001-pick-library-stack.md](../research/0001-pick-library-stack.md).

Recommended stack, all zero-build-step / `<script>`-tag or CDN-ESM usable:

- **Move validation**: [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 (BSD-2-Clause).
  Confirmed it validates moves and holds per-position PGN comments, but does **not** parse
  variations/RAV — mainline only.
- **PGN → move tree (variations + comments)**: [@mliebelt/pgn-parser](https://github.com/mliebelt/pgn-parser)
  1.4.19 (Apache-2.0), ships a browser-ready UMD build. Its output type also captures embedded
  ChessBase/lichess `%cal`/`%csl` arrow-and-highlight annotations from PGN comments. Needs to be
  glued to chess.js by hand (neither library talks to the other).
- **Board UI (used twice per page)**: [cm-chessboard](https://github.com/shaack/cm-chessboard)
  8.12.19 (MIT), dependency-free ESM, drag+click move input.
- **Variations/notes panel**: no off-the-shelf widget fits without a build step
  (`@lichess-org/pgn-viewer` is the one candidate that does this but requires bundling/an ESM
  CDN resolver like esm.sh, and is GPL and read-only) — hand-build a small DOM renderer over the
  pgn-parser tree instead; the hard part (parsing) is already done.
- **Freehand annotation**: cm-chessboard's own `Arrows` + `Markers` + `RightClickAnnotator`
  extensions already implement ChessBase/lichess-style right-click-drag arrows and
  right-click square highlights with color modifiers — no separate library needed.
- **Cross-tab live sync**: `BroadcastChannel` confirmed as the right mechanism (same-origin,
  Baseline since March 2022) over the alternatives (`storage` event, `SharedWorker`,
  `window.open`+`postMessage`), but it has no message history — a late-joining/reloaded
  projector tab needs state from somewhere else. Persistence split in two: **IndexedDB** for the
  multi-PGN library (localStorage's ~5-10MB cap is a real risk there), **localStorage** for a
  tiny, synchronously-readable "current position" pointer a projector tab reads at startup to
  catch up, kept live-updated via BroadcastChannel while tabs are open.

Gaps explicitly *not* covered by any library (for tickets 0003/0004 to design): the
chess.js/pgn-parser glue code; the variation-tree/notes panel UI itself; annotation persistence
policy (clear-on-move vs. sticky) and PGN round-trip serialization of drawn annotations; and the
actual reconnect/catch-up protocol for a late-joining or reloaded projector tab.
