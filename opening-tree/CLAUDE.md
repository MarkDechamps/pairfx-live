# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
directory.

## What this is

A static, mobile-responsive opponent-prep tool ("Opening Tree"): enter an opponent's Lichess or
Chess.com username, and it fetches their public game history and shows it as a move tree —
starting position down — with how many of their games passed through each position and their
win/draw/loss record from there, once for the games where they played White and once for Black.
No backend, no accounts, nothing persisted. Scoped down from openingtree.com to exactly this
slice per the requester's own instruction; see `wayfinder/map.md` for the full destination and
what was deliberately left out (repertoire building, gap analysis, master-database comparison,
PGN upload).

## Commands

```bash
node --test             # run all unit tests (engine.js + client.js; DOM glue is untested, see below)
npm run serve            # python3 -m http.server 8000, then open http://localhost:8000/index.html
npm run vendor           # re-copy chess.js from node_modules into vendor/
```

Run a single test file: `node --test engine.test.js`.
Run a single test by name: `node --test --test-name-pattern="<pattern>"`.

There is no build step for the app itself.

## Architecture

**Strict separation of pure logic from DOM/network**, matching opening-selector's
`engine.js`/`app.js` split and chess-classroom's pure-module convention:

| Module | Tests | Owns |
|---|---|---|
| `engine.js` | `engine.test.js` | Platform-agnostic game records, tree building, filtering. Zero dependencies. |
| `client.js` | `client.test.js` | Fetching games from Lichess/Chess.com, with an injectable `fetchImpl` so request shape, pagination, and error handling are tested without the network. |
| `app.js` | (untested, DOM glue) | Form handling, state, and rendering. The only place `chess.js` is used — to turn a SAN path into a FEN for the board. |

**`engine.js`** turns each platform's raw API shape into one common record — `{moves: string[]
(SAN), color: "white"|"black", outcome: "win"|"draw"|"loss", speed, rated, playedAt}` — via
`lichessGameToRecord`/`chessComGameToRecord`, then `buildTree(records)` merges every record's
move sequence into a single tree keyed by SAN at each ply, with `{total, wins, draws, losses,
children}` at every node. `childrenOf(node)` returns the next moves sorted by popularity with
win/draw/loss rates attached; `nodeAtPath(root, path)` walks a SAN sequence down from the root.
No chess-legality/replay library is used here — both platforms already emit standard SAN, so
merging games into a tree is a plain string-keyed walk (see
`wayfinder/tickets/0001-data-sourcing-and-tree-architecture.md`).

**`client.js`** makes exactly one request to Lichess (`GET /api/games/user/{username}`, NDJSON)
and one-request-per-recent-month to Chess.com (`GET /pub/player/{username}/games/archives` then
each monthly archive, newest-first, capped at `maxMonths`) per lookup. Both are called directly
from the browser — no proxy — since both are confirmed CORS-open (ticket 0001). A month that
fails to fetch on Chess.com is skipped rather than failing the whole lookup. `UserNotFoundError`
distinguishes "no such account" from other failures so `app.js` can show a clearer message.

**`app.js`** fetches once per lookup (`LICHESS_MAX_GAMES = 500`, `CHESSCOM_MAX_MONTHS = 24`) and
keeps every fetched record in `state.records`. Switching the color tab, toggling a speed filter,
or changing rated-only re-derives the tree from that same in-memory set (`filterRecords` +
`buildTree`) — it never refetches. Changing any filter or the color tab resets the browsed
`state.path` back to the root, since the tree underneath it just changed shape. The board is
rendered by replaying `state.path` through vendored `chess.js` to get a FEN, then drawing an 8x8
grid from `chess.js`'s own `.board()` output with Unicode chess glyphs — no board-UI library is
vendored, since this app only ever needs a read-only board (no drag-to-move input, no annotation
drawing), unlike chess-classroom's `cm-chessboard` use case.

## The vendoring deviation

Same pattern as `chess-classroom/CLAUDE.md` describes in full — `package.json`/`node_modules`
exist purely as a dev-time vendoring and testing mechanism, `npm run vendor`
(`scripts/vendor-libs.mjs`) copies chess.js's built ESM dist verbatim into the committed
`vendor/` directory, and the app imports only from `vendor/`, never from `node_modules` or a
CDN. This app vendors chess.js alone (no `@mliebelt/pgn-parser`, no `cm-chessboard`) — it has no
PGN-variation parsing or drag/annotation UI to support.

## Judgment calls made while implementing

- **One fetch per lookup, then everything else is client-side.** Openingtree.com-style tools
  could refetch on every filter change; this one deliberately doesn't, both for responsiveness
  and because Lichess's export endpoint is rate-limited per IP — repeated requests per filter
  tweak would make that limit bite quickly during normal use.
- **Default color tab is whichever color has more fetched games**, not always White — an
  opponent who's mostly played Black historically shouldn't land on an empty White tree first.
- **Board orientation follows the color tab** (White tab shows the board White-side-up, Black
  tab flips it) rather than always White-side-up, since the tree being browsed is specifically
  "what they play as this color."
- **`maxPly = 40` in `buildTree`** — a prep tool has no use for a single very long game
  extending one branch of the tree 150 plies deep with no branching; capped well past any
  realistic "opening" depth without being unbounded.
- **Lichess's `explorer.lichess.org/player` endpoint (native per-player aggregation) was tried
  and rejected during research** (ticket 0001) in favor of the games-export + client-side
  tree-build approach — it returned `401` in a live test and isn't a documented
  unauthenticated-friendly path. If Lichess's own player-explorer ever becomes easily usable
  unauthenticated, it would remove the need to build the White/Black trees by hand for Lichess
  lookups specifically (Chess.com has no equivalent, so its games-export path would stay either
  way).
- **Confirmed, not just suspected: this sandbox's default `curl`/headless-Chromium User-Agent
  gets silently treated as bot traffic by Lichess's edge on the games-export path.** Every
  username tried through it — including real, active accounts — came back `404 "Not found"`.
  Swapping in an ordinary desktop-Chrome User-Agent string, with everything else about the
  request identical, turned that same call into a genuine `429` ("Please only run 1 request(s)
  at a time") instead — proof the account and endpoint were fine all along, and that the 404 was
  UA-based bot mitigation, not a real "not found." This should **not** affect real users: browser
  `fetch()` cannot override the `User-Agent` header, so a genuine visitor's browser always sends
  its own real, non-headless UA when this app calls the Lichess API client-side — the
  app's own `client.js`/`app.js` code path is identical either way, and `client.test.js` covers
  its request shape and error handling directly (including the 404-vs-429 distinction) without
  depending on live Lichess access at all. Flagged here because it means **a clean, successful
  live run of the Lichess path could not be produced from this sandbox** — repeated attempts kept
  landing on the still-open 429 window rather than a 200 (this sandbox's shared egress IP was
  already rate-limited before this feature's own testing added to it). Only Chess.com's path was
  verified end-to-end with an actual 200 and real data from automated tooling here (11,900+ games
  fetched and rendered for a real account, screenshots in the session — Lichess's own equivalent
  screenshot is a rate-limit message, not a rendered tree). If a real user reports "no public
  Lichess account found" for an account that does exist, or a persistent rate-limit message,
  those are the two things to check first — not the parsing/tree-building logic, which is
  identical to the already-verified Chess.com path and independently unit-tested.

## Fixtures / manual QA

No committed fixture data — every test in `engine.test.js`/`client.test.js` builds its own
inline fixtures (Lichess NDJSON lines, Chess.com game objects) shaped from real, live API
responses captured during `wayfinder/tickets/0001`'s research, not guessed. For manual QA,
Chess.com's `hikaru` is a reliable large-history account to try; for Lichess, current guidance
per the smoke-test note above is to verify from an actual browser tab, not `curl`.
