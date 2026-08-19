---
id: 0001
title: Data sourcing and tree-building architecture for opponent opening prep
labels: [wayfinder:research]
status: closed
assignee: claude
map: ../map.md
blocked_by: []
---

## Question

`openingtree.com` inspired this build, but the requester narrowed scope to one slice of it:
given an opponent's Lichess **or** Chess.com username, show what they actually play (as White
and as Black) as a move tree with win/draw/loss stats per move, filterable, for opponent prep —
no personal-repertoire builder, no gap analysis, no master-database comparison.

Open questions before building:
- Can both platforms' game-history APIs be called directly from a browser (CORS), matching this
  repo's zero-backend convention, or does this need a proxy?
- What shape does each API return games in, and what does a client need to parse to get a SAN
  move list, color, and result per game?
- Is there a lighter-weight path than "download every game and replay it" — e.g. Lichess's own
  opening-explorer "by player" aggregation endpoint?

## Resolution

**Both APIs are directly browser-fetchable — no backend/proxy needed**, confirmed by live
`curl` checks against production, not documentation alone:

- **Lichess** — `GET https://lichess.org/api/games/user/{username}` (`Accept:
  application/x-ndjson`) responds `access-control-allow-origin: *`, confirmed via both a GET and
  an `OPTIONS` preflight. One request returns up to `max` games as newline-delimited JSON, each
  line shaped like `{rated, speed, perf, createdAt, players: {white: {user: {name}, rating},
  black: {...}}, winner, opening: {eco, name}, moves: "e4 e5 Nf3 ..."}` — `moves` is already a
  plain space-separated SAN string, no PGN parsing needed. Query params `perfType` (comma-list)
  and `rated` (bool) filter server-side; `moves=true&opening=true` must be requested explicitly.
  Rate limit is real (hit a `429` during testing after a handful of rapid requests) — the client
  must make exactly one export request per lookup, not one per filter change.
- **Chess.com** — `GET https://api.chess.com/pub/player/{username}/games/archives` (list of
  monthly archive URLs) and `GET .../games/{yyyy}/{mm}` (one month's games) both respond
  `access-control-allow-origin: *`, confirmed live. Each game object has a `pgn` field (full PGN
  text, headers + movetext with `{[%clk ...]}` comments after every move), plus top-level
  `time_class` (bullet/blitz/rapid/daily), `rated`, and `white`/`black` objects with `username`,
  `rating`, `result` (`"win"` for the winner, a specific reason string — `resigned`,
  `checkmated`, `agreed`, `stalemate`, etc. — for everyone else, so the outcome is derived by
  checking which side's `result` equals `"win"`; neither side being `"win"` means a draw). This
  API has no server-side filtering — the client fetches whole months and filters client-side,
  walking archives most-recent-first with a cap so a very active account doesn't mean downloading
  its entire history.
- **Lichess's `explorer.lichess.org/player` aggregation endpoint was tried and rejected**: it
  returned `401 Authorization Required` in a live test even for a real, active username. Whatever
  its intended access model is, it's not a plug-and-play unauthenticated fit — not worth
  designing around for a v1. The games-export + client-side tree-build approach (what the real
  openingtree.com project does, per its own description: "downloads chess games in form of a pgn
  from any source... constructs an opening tree") is the proven path and is what this build uses
  for both platforms uniformly.
- **No chess-move-legality library is needed for tree building.** Both platforms already emit
  standard SAN (`Nf3`, `O-O`, `exd5`, `e8=Q+`) — merging games into a tree is a plain string-keyed
  walk, no replay required. `chess.js` (already vetted for this repo in
  `chess-classroom/wayfinder/research/0001-pick-library-stack.md`) is still used, but only in the
  DOM layer, to turn a SAN path into a FEN for the on-screen board — never in the pure tree-building
  logic.
- **Variant/rules filtering**: both platforms mix in non-standard variants (Lichess: chess960,
  crazyhouse, etc. via `variant`; Chess.com: `rules`). Records are dropped at parse time unless
  `variant === "standard"` (Lichess) / `rules === "chess"` (Chess.com) — mixing e.g. Crazyhouse
  games into a standard-chess opening tree would silently corrupt the stats.

Net decision: one fetch per lookup per platform (no per-filter refetching), parse into a
platform-agnostic `{moves, color, outcome, speed, rated, playedAt}` record shape, build both the
White-repertoire and Black-repertoire trees from that same fetched set client-side, and let every
filter (speed, rated) re-derive the tree from the already-fetched records rather than hitting the
network again.
