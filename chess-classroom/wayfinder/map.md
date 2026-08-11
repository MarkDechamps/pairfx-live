---
title: Chess Classroom — Two-Tab Demonstration Tool Spec
labels: [wayfinder:map]
status: closed
---

## Destination

A build-ready spec for **chess-classroom**: a two-tab chess demonstration tool for teachers —
a **teacher tab** (upload/manage a local library of PGN files, including multi-game files with
a picker; browse variations; read PGN-comment notes under the board and click them to jump the
position; draw ChessBase-style arrows/highlights; toggle Sync) and a **projector tab** (a plain
second browser tab/window the teacher opens, drags to the projector, and fullscreens
themselves — no app-level screen detection) — kept in sync live via a default-on Sync toggle
that, when re-enabled after being off, immediately snaps the projector to the teacher's current
position. The projector tab shows the board plus three teacher-checkbox-controlled overlays:
move number, last move, and drawn arrows. Built from existing chess UI/PGN libraries rather
than a from-scratch chess engine or board renderer. UI defaults to Dutch, with French and
English also supported.

## Notes

- Domain: browser-only, no backend — matches the rest of this repo (root PairFX,
  opening-selector). No accounts, no server-side storage; everything lives in the teacher's
  browser.
- Visual references named by the requester: ChessBase's arrow/highlight annotation
  convention; the game-viewer style used in Chessly (GothamChess)'s courses for the
  variations/notes panel.
- Use `/grilling` and `/domain-modeling` for grilling-type tickets; `/prototype` for
  prototype-type tickets; the `/research` skill (via a subagent) for research-type tickets.
- Consult the `frontend-design` skill when prototyping the two boards' visual identity and
  panel layout.
- Working vocabulary (subject to sharpening via domain-modeling as tickets resolve):
  **teacher tab** (the control surface, not shown to the room), **projector tab** (the
  room-facing board, opened as a plain second tab/window), **Sync** (the default-on toggle
  linking the two boards' positions), **note** (a PGN comment attached to a move, shown under
  the board, clickable to jump both boards there when synced), **variation** (a sideline in
  the loaded game, shown in the right-hand panel), **annotation** (a teacher-drawn arrow or
  square highlight on the board).
- Likely mechanism, to be confirmed rather than re-asked (ticket 0001): cross-tab live sync via
  `BroadcastChannel`, with browser storage (localStorage/IndexedDB) underneath for the PGN
  library and for a projector tab that (re)joins mid-session.
- No issue tracker was configured for this repo; using the local-markdown tracker convention
  documented in `wayfinder/README.md`. This is a separate wayfinder instance from
  `opening-selector/wayfinder/`.

## Decisions so far

- [Prototype the teacher tab layout](tickets/0002-prototype-teacher-tab-layout.md) — confirmed
  live: board + drawing-tool rail (left), notes card under the board, small projector-preview
  card, variations tree (right), library/upload/Sync controls in a top bar. No structural
  changes requested; see the prototype linked from the ticket.
- [Pick the chess-classroom library stack](tickets/0001-pick-library-stack.md) — chess.js
  (move validation) + `@mliebelt/pgn-parser` (variation-tree/comment parsing, hand-glued to
  chess.js) + cm-chessboard (board UI, used twice) + cm-chessboard's own
  Arrows/Markers/RightClickAnnotator extensions (ChessBase-style annotation, already matches
  the right-click-drag convention) + a hand-built DOM panel over the parsed tree (no
  off-the-shelf variation-tree widget fits zero-build) + `BroadcastChannel` for live sync,
  backed by IndexedDB (PGN library) and localStorage (a small live-updated "current position"
  pointer a projector tab reads on startup to catch up). Entirely `<script>`-tag/CDN usable, no
  build step. `@lichess-org/pgn-viewer` was the one candidate needing a build step and was
  rejected for that reason. Full findings and sourcing:
  [research/0001-pick-library-stack.md](research/0001-pick-library-stack.md).
- [Prototype the projector tab layout and its toggleable overlays](tickets/0003-prototype-projector-tab-layout.md) —
  zero chrome beyond the board and the three overlays (move number top-left, last move
  bottom-left, arrows drawn on the board); pure renderer of whatever the teacher tab sends;
  overlay visibility is a remembered preference, not per-session.
- [Design the annotation (arrows/highlights) drawing interaction](tickets/0004-design-annotation-drawing-interaction.md) —
  adopt cm-chessboard's built-in right-click-drag-arrow / right-click-highlight gesture as-is;
  annotations clear on move by default with a "keep" toggle; annotations follow the same
  sync/resync rules as moves.
- [Define variations/notes click-to-jump semantics and nested-variation display](tickets/0005-define-notes-variations-navigation.md) —
  click-to-jump reaches the exact position at any nesting depth when synced; variations render
  as an indented tree, auto-collapsing past ~2 ply; one shared "current move" pointer drives
  board+notes+variations highlighting regardless of what changed it.
- [Define the local PGN library UX](tickets/0006-define-pgn-library-ux.md) — auto-name from PGN
  headers (renameable), cap at 50 entries with warn-and-require-delete (no silent eviction),
  confirm-to-delete, multi-game picker shown once at upload with the picked game becoming the
  library entry. (Later revised — see chess-classroom's CLAUDE.md: a library entry now keeps the
  whole multi-game file, browsable at any time via a persistent games-in-this-file list, instead
  of discarding every game but the one picked at upload.)
- [Define the i18n approach](tickets/0007-define-i18n-approach.md) — per-language flat JSON
  dictionaries (nl/fr/en), a visible switcher always present (auto-detect only sets the
  first-run default), remembered across sessions.
- [Define whether in-lesson annotations/positions can be saved back out](tickets/0008-define-annotation-export.md) —
  out of scope for v1 (see Out of scope below); no PGN-export/serialization code needed for the
  first build.

## Not yet specified

- Whether the teacher can edit or add PGN comments/notes live during a demo, or notes are
  strictly read-only as authored in the source PGN.
- Any provision for a freeform/no-PGN-loaded mode (playing out moves live with no pre-loaded
  game). Still open — not to be confused with the "Lock PGN" checkbox (see chess-classroom's
  CLAUDE.md), which covers deviating from a PGN that *is* loaded, not playing with none at all.
- Mobile/tablet support for the teacher tab — only a teacher-laptop-plus-projector setup has
  been described so far.

## Out of scope

- Exporting/saving drawn annotations or reached positions back out (e.g. as an updated PGN) —
  ruled out for v1 while closing ticket 0008 to move to implementation. Not a permanent
  decision; revisit if it turns out to matter once teachers are actually using the tool.

## Destination reached

All tickets resolved (0001–0008); nothing left in the frontier before implementation. Fog
above is real but doesn't block a first build — see `../CLAUDE.md` (once written) for what
shipped in v1 versus what's still open.
