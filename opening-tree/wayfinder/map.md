---
title: Opening Tree — Opponent Prep Spec
labels: [wayfinder:map]
status: closed
---

## Destination

A static, mobile-responsive webapp — **opening-tree** — inspired by openingtree.com but scoped
to exactly the slice the requester asked for: enter an opponent's **Lichess or Chess.com
username**, fetch their public game history, and browse it as a move tree (starting position
down) showing, at every node, how many of their games passed through it and their win/draw/loss
record from there — once for the games where they played White, once for Black. This is
specifically an opponent-prep tool: "what does this person actually play, and how do they score
with it" — not a personal-repertoire builder, not a gap-analysis tool, not a comparison against a
master database. Filterable by speed (bullet/blitz/rapid/...) and rated-only, refetched once per
lookup and re-filtered client-side after that.

## Notes

- Domain: browser-only, no backend — matches the rest of this repo (root PairFX, opening-selector,
  chess-classroom). No accounts, no server-side storage.
- Requester's own scoping (given before this map was drafted): "only the opening tree so you can
  prepare against opponents via their lichess and chess.com handle functionality is necessary" —
  narrower than openingtree.com's full feature set, and the reason the "Out of scope" list below
  is longer than what a from-scratch clone would exclude.
- No issue tracker was configured for this repo; using the local-markdown tracker convention
  documented in `wayfinder/README.md`. This is a separate wayfinder instance from
  `opening-selector/wayfinder/` and `chess-classroom/wayfinder/`.
- Board rendering reuses chess-classroom's already-vetted `chess.js` for FEN generation only
  (see ticket 0001) — no board-UI library is vendored, since this app needs a read-only board,
  not drag-to-move input or annotation drawing.

## Decisions so far

- [Data sourcing and tree-building architecture](tickets/0001-data-sourcing-and-tree-architecture.md) —
  both Lichess's games-export API and Chess.com's public archive API are directly
  browser-fetchable (CORS confirmed live against production), so no backend/proxy is needed;
  one export request per platform per lookup, parsed into a shared `{moves, color, outcome,
  speed, rated, playedAt}` record shape, with every filter re-deriving the tree from that
  already-fetched set instead of refetching. Full findings:
  [research/0001](../wayfinder/tickets/0001-data-sourcing-and-tree-architecture.md).
- Scope, decided directly by the requester rather than via a grilling ticket (see Notes): opponent
  lookup by Lichess/Chess.com handle only, both colors' trees, frequency + win/draw/loss stats per
  move. No repertoire builder, no gap analysis, no master-database comparison for v1.

## Not yet specified

- Exact default "how many games / how far back" values and whether they should be
  user-adjustable in v1, versus fixed sensible constants — left as an implementation judgment
  call rather than a spec decision, given the requester's "go" to implement directly. See the
  subproject `CLAUDE.md` for what shipped.

## Out of scope

- Personal repertoire building/saving, gap analysis against your own prepared lines, and
  master-game-database comparison — all core openingtree.com features, explicitly excluded by
  the requester's scoping note above. Not ruled out forever; a future map if they turn out to be
  wanted later.
- PGN-file upload as a third data source (openingtree.com supports this) — the requester's ask
  was specifically the "via their lichess and chess.com handle" path.

## Destination reached

Scope was set directly by the requester and the one open technical question (data sourcing/CORS
feasibility) is resolved by ticket 0001 — nothing left blocking implementation. See
`../CLAUDE.md` (once written) for what shipped in v1 versus what's still fog.
