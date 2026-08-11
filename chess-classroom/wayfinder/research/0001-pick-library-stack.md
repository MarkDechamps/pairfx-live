# Research: Library stack for chess-classroom

Findings for ticket [0001-pick-library-stack.md](../tickets/0001-pick-library-stack.md).
Research conducted 2026-08-11. All sources below were fetched directly — via `curl` against
npm's registry JSON API and GitHub's REST API (for structured, machine-readable facts:
versions, licenses, dependencies, publish/push timestamps), via `curl` against raw GitHub
content and CDN-served dist files (for README/source-code ground truth), and via the WebFetch
tool against GitHub/MDN/WHATWG pages (for prose documentation) — on that date. Nothing here is
a secondhand summary of a blog post; where a finding rests on a small-model WebFetch summary
rather than a raw-text grep I performed myself, that is called out explicitly.

## Sources checked

| # | Source | URL | Checked | Result |
|---|--------|-----|---------|--------|
| 1 | chess.js — npm registry JSON | https://registry.npmjs.org/chess.js | 2026-08-11 | Fetched (200). v1.4.0, BSD-2-Clause, dual `main`(CJS)/`module`(ESM), no dependencies. |
| 2 | chess.js — GitHub repo (via WebFetch) | https://github.com/jhlywa/chess.js | 2026-08-11 | Fetched. README is a thin pointer to the docs site. |
| 3 | chess.js — README.md raw | https://raw.githubusercontent.com/jhlywa/chess.js/master/README.md | 2026-08-11 | Fetched (200), read in full (50 lines). |
| 4 | chess.js — package.json raw | https://raw.githubusercontent.com/jhlywa/chess.js/master/package.json | 2026-08-11 | Fetched (200). Confirms `module: dist/esm/chess.js`, no `dependencies`. |
| 5 | chess.js — docs site (rendered) | https://jhlywa.github.io/chess.js/ | 2026-08-11 | Fetched (200), HTML scanned for `loadPgn`/comment API. |
| 6 | chess.js — docs markdown source | https://raw.githubusercontent.com/jhlywa/chess.js/master/website/docs/index.md | 2026-08-11 | Fetched (200), read the full `.loadPgn()`/`.getComment()`/`.getComments()` sections directly (1053 lines total). |
| 7 | chess.js — GitHub latest-release API | https://api.github.com/repos/jhlywa/chess.js/releases/latest | 2026-08-11 | Fetched (200). `v1.4.0`, published 2025-06-14. |
| 8 | chess.js — compiled ESM dist file | https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js | 2026-08-11 | Fetched (200), grepped for `import` statements — none found (self-contained single file, 107 KB). |
| 9 | @mliebelt/pgn-parser — npm registry JSON | https://registry.npmjs.org/@mliebelt/pgn-parser | 2026-08-11 | Fetched (200). v1.4.19, Apache-2.0, depends only on `@mliebelt/pgn-types`. |
| 10 | @mliebelt/pgn-parser — GitHub repo metadata | https://api.github.com/repos/mliebelt/pgn-parser | 2026-08-11 | Fetched (200). `pushed_at: 2026-08-11` (today), 78 stars. |
| 11 | @mliebelt/pgn-parser — README raw | https://raw.githubusercontent.com/mliebelt/pgn-parser/master/README.md | 2026-08-11 | Fetched (200), read in full (94 lines). |
| 12 | @mliebelt/pgn-types — npm registry JSON | https://registry.npmjs.org/@mliebelt/pgn-types | 2026-08-11 | Fetched (200). Latest 1.0.4. |
| 13 | @mliebelt/pgn-types — TypeScript definitions | https://cdn.jsdelivr.net/npm/@mliebelt/pgn-types@1.0.4/lib/index.umd.d.ts | 2026-08-11 | Fetched (200), read in full — this is the authoritative shape of the parsed PGN tree (`PgnGame`, `PgnReaderMove`, `variations`, `commentMove`/`commentAfter`, `nag`, `commentDiag.colorArrows`/`colorFields`). |
| 14 | pgn-parser (unscoped, kevinludwig) — npm registry JSON | https://registry.npmjs.org/pgn-parser | 2026-08-11 | Fetched (200). v2.2.1, MIT. |
| 15 | pgn-parser (unscoped) — GitHub repo metadata | https://api.github.com/repos/kevinludwig/pgn-parser | 2026-08-11 | Fetched (200). Last pushed 2025-03-31, 40 stars. |
| 16 | pgn-parser (unscoped) — README raw | https://raw.githubusercontent.com/kevinludwig/pgn-parser/master/README.md | 2026-08-11 | Fetched (200), read in full (61 lines), incl. worked example output showing `ravs`/`comments`. |
| 17 | cm-pgn — npm registry JSON | https://registry.npmjs.org/cm-pgn | 2026-08-11 | Fetched (200). v5.0.0, MIT, depends on `chess.mjs`. |
| 18 | cm-pgn — GitHub repo (via WebFetch) | https://github.com/shaack/cm-pgn | 2026-08-11 | Fetched. Summarized by WebFetch's page-reading model, not a raw grep — treated as slightly lower-confidence than items verified by direct source read (flagged in write-up). |
| 19 | cm-pgn — GitHub repo metadata | https://api.github.com/repos/shaack/cm-pgn | 2026-08-11 | Fetched (200). `pushed_at: 2026-07-24`, 41 stars. |
| 20 | chess.mjs — npm registry JSON | https://registry.npmjs.org/chess.mjs | 2026-08-11 | Fetched (200). v2.3.2, BSD-2-Clause, description: "It's just the ES6 module version of chess.js". |
| 21 | chessground — npm registry JSON | https://registry.npmjs.org/chessground | 2026-08-11 | Fetched (200). Legacy unscoped name, v9.2.1, GPL-3.0-or-later (superseded by scoped package, see #23). |
| 22 | chessground — GitHub repo (via WebFetch) | https://github.com/lichess-org/chessground | 2026-08-11 | Fetched. Confirmed drawable/shapes feature description and GPL clause in prose. |
| 23 | @lichess-org/chessground — package.json raw | https://raw.githubusercontent.com/lichess-org/chessground/master/package.json | 2026-08-11 | Fetched (200). Current scoped package name, v10.1.1, `"type": "module"`, GPL-3.0-or-later, zero runtime `dependencies`. |
| 24 | chessground — GitHub repo metadata | https://api.github.com/repos/lichess-org/chessground | 2026-08-11 | Fetched (200). `pushed_at: 2026-07-03`, 1357 stars, not archived. |
| 25 | chessground — README raw | https://raw.githubusercontent.com/lichess-org/chessground/master/README.md | 2026-08-11 | Fetched (200), read in full (127 lines) — GPL clause and drawing feature list read verbatim. |
| 26 | chessground — compiled dist file | https://cdn.jsdelivr.net/npm/@lichess-org/chessground@10.1.1/dist/chessground.js | 2026-08-11 | Fetched (200), grepped `import` lines — all relative (`./api.js`, `./config.js`, etc.), no bare specifiers. |
| 27 | cm-chessboard — npm registry JSON | https://registry.npmjs.org/cm-chessboard | 2026-08-11 | Fetched (200). v8.12.19, MIT, `module` entry point, no `dependencies`. |
| 28 | cm-chessboard — GitHub repo (via WebFetch) | https://github.com/shaack/cm-chessboard | 2026-08-11 | Fetched. Confirmed Arrows/Markers extensions exist and CDN usage. |
| 29 | cm-chessboard — GitHub repo metadata | https://api.github.com/repos/shaack/cm-chessboard | 2026-08-11 | Fetched (200). `pushed_at: 2026-07-22`, 301 stars, not archived. |
| 30 | cm-chessboard — extensions directory listing | https://api.github.com/repos/shaack/cm-chessboard/contents/src/extensions | 2026-08-11 | Fetched (200). Lists `arrows`, `markers`, `right-click-annotator`, `persistence`, `accessibility`, `promotion-dialog`, etc. |
| 31 | cm-chessboard — Arrows.js source | https://raw.githubusercontent.com/shaack/cm-chessboard/master/src/extensions/arrows/Arrows.js | 2026-08-11 | Fetched (200), read in full (172 lines). |
| 32 | cm-chessboard — Markers.js source | https://raw.githubusercontent.com/shaack/cm-chessboard/master/src/extensions/markers/Markers.js | 2026-08-11 | Fetched (200), read first 40 of 224 lines (marker type enum, constructor). |
| 33 | cm-chessboard — RightClickAnnotator.js source | https://raw.githubusercontent.com/shaack/cm-chessboard/master/src/extensions/right-click-annotator/RightClickAnnotator.js | 2026-08-11 | Fetched (200), read first 50 of 226 lines, including the header comment documenting the ChessBase/lichess-style color-modifier scheme. |
| 34 | cm-chessboard — RightClickAnnotator commit history | https://api.github.com/repos/shaack/cm-chessboard/commits?path=src/extensions/right-click-annotator | 2026-08-11 | Fetched (200). Commits from 2026-05-19 through 2026-07-20, one explicitly "like lichess" — active, recent maintenance. |
| 35 | npm search: "chessboard.js" | https://registry.npmjs.org/-/v1/search?text=chessboard.js | 2026-08-11 | Fetched (200) — used to establish that the plain `chessboardjs` npm name is squatted by an unrelated package, not oakmac's chessboard.js. |
| 36 | chessboardjs (squatted npm name) — registry JSON | https://registry.npmjs.org/chessboardjs | 2026-08-11 | Fetched (200). Points to `deanius/chessboardjs`, last published 2015 — confirmed not the real library. |
| 37 | npm search: "chessboard" | https://registry.npmjs.org/-/v1/search?text=chessboard | 2026-08-11 | Fetched (200) — used to locate oakmac's actual published package names. |
| 38 | @chrisoakman/chessboardjs — registry JSON | https://registry.npmjs.org/@chrisoakman/chessboardjs | 2026-08-11 | Fetched (200). v1.0.0 (2019-06-11), MIT, `dependencies: {jquery: ">=3.4.1"}`. |
| 39 | oakmac/chessboardjs — GitHub repo metadata | https://api.github.com/repos/oakmac/chessboardjs | 2026-08-11 | Fetched (200). `pushed_at: 2024-04-17`, 2131 stars (high historical popularity, but a much older/higher-star repo than its currently maintained successor). |
| 40 | @chrisoakman/chessboard2 — registry JSON | https://registry.npmjs.org/@chrisoakman/chessboard2 | 2026-08-11 | Fetched (200). v0.5.0 (2023-05-29), ISC, no dependencies. |
| 41 | oakmac/chessboard2 — GitHub repo metadata | https://api.github.com/repos/oakmac/chessboard2 | 2026-08-11 | Fetched (200). `pushed_at: 2024-02-17` — over two years stale as of this research date. |
| 42 | oakmac/chessboard2 — GitHub repo (via WebFetch) | https://github.com/oakmac/chessboard2 | 2026-08-11 | Fetched. Status description ("getting close to an initial v2 release", "pre-1.0"). |
| 43 | chessboard2 — README raw | https://raw.githubusercontent.com/oakmac/chessboard2/master/README.md | 2026-08-11 | Fetched (200), read in full (120 lines) — CDN usage confirmed, arrow/circle support confirmed only as an open TODO item (`removeArrow`/`removeCircle` still unimplemented per the TODO list), not a shipped, documented feature. |
| 44 | react-chessboard — npm registry JSON | https://registry.npmjs.org/react-chessboard | 2026-08-11 | Fetched (200). v5.12.0, MIT, `peerDependencies: {react: ^19, react-dom: ^19}`, depends on `@dnd-kit/*`. |
| 45 | react-chessboard — GitHub repo metadata | https://api.github.com/repos/Clariity/react-chessboard | 2026-08-11 | Fetched (200). `pushed_at: 2026-08-03`, 536 stars — actively maintained, but React-only by its own peer-dependency declaration. |
| 46 | @lichess-org/pgn-viewer — npm registry JSON | https://registry.npmjs.org/@lichess-org/pgn-viewer | 2026-08-11 | Fetched (200). v2.6.2, GPL-3.0-or-later, `dependencies: {@lichess-org/chessground, chessops, snabbdom}`, `exports` map with `"import"` only (ESM). |
| 47 | @lichess-org/pgn-viewer — GitHub repo metadata | https://api.github.com/repos/lichess-org/pgn-viewer | 2026-08-11 | Fetched (200). `pushed_at: 2026-07-25`, 152 stars. |
| 48 | @lichess-org/pgn-viewer — README raw | https://raw.githubusercontent.com/lichess-org/pgn-viewer/master/README.md | 2026-08-11 | Fetched (200), read in full (150 lines) — Goals/Non-Goals list, GPL clause, "As an NPM package" is the only documented install path. |
| 49 | @lichess-org/pgn-viewer — compiled dist entry point | https://unpkg.com/@lichess-org/pgn-viewer@2.6.2/dist/main.js | 2026-08-11 | Fetched (200), read in full (17 lines) — confirmed it contains a bare-specifier `import ... from 'snabbdom'` plus relative imports to further un-bundled internal modules; not directly loadable by a browser's native module resolver from a raw-file CDN. |
| 50 | MDN — BroadcastChannel | https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel | 2026-08-11 | Fetched. Confirms same-origin scope, Baseline "widely available" since March 2022, API shape (`postMessage`, `onmessage`, `close`), sender excluded from delivery. |
| 51 | WHATWG HTML Living Standard — BroadcastChannel / web messaging | https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts | 2026-08-11 | Fetched. Confirms same-origin (storage-key) restriction and "remove source from destinations" delivery semantics normatively. |
| 52 | MDN — Storage quotas and eviction criteria | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | 2026-08-11 | Fetched. Confirms Web Storage (`localStorage`/`sessionStorage`) is capped around 5–10 MiB per origin across browsers, versus IndexedDB/Cache API/OPFS which are managed by a much larger, browser-specific quota system (up to a percentage of disk space). |

## Findings per area

### 1. Chess rules / PGN parsing

**chess.js does move validation, not variation parsing.** Reading the actual `.loadPgn()`
documentation section in the docs markdown source (`website/docs/index.md`, source #6)
directly: `loadPgn(pgn, [options])` "load[s] the moves of a game" into the engine's single
current line; the options are only `newlineChar` and `strict` (SAN strictness). Nowhere in the
1053-line docs file — and nowhere in the README (source #3) — is there any mention of
parenthesized recursive variations (RAV) being parsed into a tree. What chess.js *does* support
is per-position **comments**: `.getComment()` / `.getComments()` / `.setComment()` /
`.removeComment(s)`, keyed to the FEN of the position reached along the single loaded line
(confirmed by reading the worked examples at lines 294–326 and 868–910 of the docs source
directly). So chess.js is a real, current (v1.4.0, published 2025-06-14 per source #7),
dependency-free, dual CJS/ESM (confirmed self-contained — the compiled `dist/esm/chess.js` has
zero `import` statements, source #8), BSD-2-Clause move-generation/validation engine — but it
is **not** a variation-tree PGN parser.

**@mliebelt/pgn-parser is a real variation-tree PGN parser**, and the exact shape of what it
produces is settled directly from its companion types package rather than prose: the
`@mliebelt/pgn-types` TypeScript definitions (source #13, read in full) define
`PgnReaderMove` as having `variations: PgnReaderMove[]` (nested, arbitrarily deep — each
variation move can itself carry more `variations`), `commentMove` / `commentAfter` (comment
text before/after the move), `nag: string[]`, and — notably — `commentDiag: GameComment` where
`GameComment` has `colorArrows?: string[]` and `colorFields?: string[]`. This last part matters
for area 4 below: it means parsing a PGN with `@mliebelt/pgn-parser` already extracts any
embedded `[%cal ...]` (arrows) / `[%csl ...]` (square highlights) annotation commands — the de
facto ChessBase/Lichess PGN comment convention for stored annotations — into structured fields,
with no bespoke mini-parser needed for that syntax. The package's own README (source #11)
states plainly: "There is a UMD version of the library available which works both in node and
in the browser... it is not necessary anymore to build a version of that library with
browserify" — i.e. it is explicitly designed to be `<script>`-tag-usable with zero bundler.
License is Apache-2.0 (source #9). Maintenance: the GitHub repo's `pushed_at` is literally
today, 2026-08-11 (source #10), and it has been published on npm as recently as 2025-10-04.

**Two other PGN-with-variations parsers were checked and are viable but weaker fits:**
- The unscoped `pgn-parser` package (kevinludwig, MIT, source #14–16) also parses RAV
  variations and comments — its own README's worked example (source #16, read in full) shows
  `ravs: [{ moves: [...] }]` and `comments: [{text: ...}]` in its output — but it has no
  documented ChessBase-annotation (`%cal`/`%csl`) extraction, and its GitHub repo was last
  pushed 2025-03-31 (source #15), noticeably less recently touched than `@mliebelt/pgn-parser`.
- `cm-pgn` (shaack, MIT, v5.0.0, source #17) builds a `History` of moves with `variations[]`,
  `comments[]`, and `nags`, per its README (source #18 — this specific summary came from
  WebFetch's page-reading model rather than a raw-text grep I performed myself, so treat the
  exact field names as slightly less certain than the `@mliebelt/pgn-types` findings above,
  though the shape is consistent with the library's known design). It depends on `chess.mjs`
  (source #20) — confirmed via its own npm description to be literally "the ES6 module version
  of chess.js" by the same author, so using cm-pgn effectively pulls in a second,
  differently-maintained fork of chess.js rather than reusing area 1's own chess.js pick. Its
  GitHub repo is actively maintained (`pushed_at: 2026-07-24`, source #19) and it comes from the
  same author (shaack) as the `cm-chessboard` pick in area 2, which is a real argument for it if
  single-author API consistency is valued over `@mliebelt/pgn-parser`'s stronger annotation
  extraction and marginally more active repo.

**Gap, flagged for downstream tickets:** neither library talks to the other. `chess.js`
validates legal moves from a FEN/position; `@mliebelt/pgn-parser` turns PGN text into a tree of
notation strings with variations/comments/annotations. The app has to walk the parsed tree and
feed each node's move notation into a `chess.js` instance (via `.load(fen)` + `.move(san)`) to
get the resulting FEN, in order to actually put a position on a board or check legality if the
teacher deviates from a loaded line live. This glue code is ticket 0003/0004 territory, not
something either library provides.

### 2. Board rendering

Four real board-UI candidates were checked as requested, plus the recommended pick's
annotation capability (which overlaps with area 4).

- **chessground** (`@lichess-org/chessground`, current version 10.1.1 — note the older,
  unscoped `chessground` npm name, source #21, is stuck at 9.2.1 and superseded by the scoped
  package, source #23). GPL-3.0-or-later (confirmed both via `package.json`'s `license` field
  and the README's own prose, source #25: "When you use Chessground for your website, your
  combined work may be distributed only under the GPL. **You must release your source code** to
  the users of your website."). Native drawing support is real and specific: the README lists
  "SVG drawing of circles, arrows, and custom user shapes on the board" and "Arrows snap to
  valid moves. Freehand arrows can be drawn by dragging the mouse off the board and back while
  drawing an arrow." (source #25, read verbatim). Despite being TypeScript source with a
  `pnpm run compile`/`bundle` build pipeline in the repo, the **published npm package already
  ships a compiled, ready-to-run ESM `dist/chessground.js`** whose internal `import` statements
  are all relative (`./api.js`, `./config.js`, etc., confirmed by grepping the actual file
  fetched from jsdelivr, source #26) — meaning it *is* usable via a plain
  `<script type="module">` pointed at a CDN URL, with zero local bundler, despite being
  TypeScript-authored. Actively maintained (`pushed_at: 2026-07-03`, 1357 stars, source #24).
- **cm-chessboard** (MIT, v8.12.19, source #27). Explicitly "ES6 module based... without
  dependencies" per its own npm description; the registry entry has a `module` entry point and
  no `dependencies` key at all (source #27). Supports both click and drag move input via
  `enableMoveInput()` (confirmed via source #28's WebFetch read of the README). Actively
  maintained: GitHub `pushed_at: 2026-07-22` (source #29), and — separately — the
  `right-click-annotator` extension specifically had commits as recent as 2026-07-20 (source
  #34). See area 4 below for its drawing capability, which is extensive.
- **chessboard.js / chessboard2** (oakmac). The classic `chessboard.js` is only published to
  npm under the scoped name `@chrisoakman/chessboardjs` (the unscoped `chessboardjs` name on
  npm is squatted by an unrelated 2015 package from a different author — confirmed by search,
  sources #35–36) — v1.0.0, MIT, but it **depends on jQuery ≥3.4.1** (source #38), and its
  GitHub repo, while high-star (2131, source #39), was last pushed 2024-04-17 — i.e. it is the
  legacy line, effectively in maintenance mode, not active development. Its intended successor,
  **chessboard2** (`@chrisoakman/chessboard2`, ISC, v0.5.0, source #40), is dependency-free and
  ships a CDN-ready UMD build with Subresource-Integrity hashes (confirmed by reading its README
  directly, source #43) — but the same README's own "Development Status"/TODO section places it
  pre-1.0 ("getting close to an initial v2 release" as of its last real update), and its GitHub
  repo's `pushed_at` is 2024-02-17 (source #41) — over two years stale as of this research date.
  Its README's TODO list still carries unchecked items for `removeArrow`/`removeCircle`
  functions (source #43), meaning arrow/circle support is present but acknowledged
  by its own author as unfinished/unpolished, not a mature, documented feature.
- **react-chessboard** (MIT, v5.12.0, source #44). Actively maintained (`pushed_at:
  2026-08-03`, source #45) but its own `package.json` declares `react` and `react-dom` `^19` as
  **`peerDependencies`**, and it depends on `@dnd-kit/core`/`@dnd-kit/modifiers` (source #44) —
  i.e. it is a React component, not a standalone board. Using it in a plain-script,
  no-framework app would mean bringing in React + a JSX-capable build step (Babel/esbuild/vite)
  purely to render a chess board, which directly conflicts with this repo's established
  zero-build-step convention. Ruled out on that basis alone, independent of its quality.

**Pick: cm-chessboard.** It is the only candidate that is simultaneously (a) genuinely
dependency-free and ESM-native with no compile step required even in principle, (b) MIT
licensed (no combined-work licensing question at all, unlike chessground's GPL), (c) actively
maintained as of this week, and (d) — per area 4 — ships an official extension that already
implements ChessBase/lichess-style right-click arrow-and-highlight drawing, which chessboard2
only has as an unfinished TODO and chessboard.js/react-chessboard don't have at all.
chessground was the closer second choice (equally strong native drawing, arguably more
polished/famous, used in production by lichess.org itself) — it was set aside specifically
because of the GPL-3.0 combined-work clause the README states outright, which is an
unforced complication when an MIT alternative (cm-chessboard) covers the same ground
including annotation. GPL is not a hard blocker for this repo (all of this repo's apps are
already fully source-visible plain-script apps, and lichess.org itself runs on GPL chessground)
— it's flagged as a real, deliberate trade-off, not a licensing violation risk.

**Gap, flagged for downstream tickets:** cm-chessboard renders and lets a user interact with a
single position; it has no concept of a PGN, a variation tree, or "which move are we on" — that
state has to be tracked by the app and pushed into the board via its API (`setPosition`,
`movePiece`, etc.) as the teacher/projector navigate the parsed PGN tree from area 1. Nothing
here decides two-boards-on-one-page layout/CSS — that's ticket 0003.

### 3. Variation-tree / notes browsing UI

No board-agnostic, dependency-free, drop-in "render this move tree as a clickable list" widget
was found as a standalone package — this is stated plainly because the ticket explicitly asked
that this gap be visible rather than silently assumed away. The one genuine off-the-shelf
candidate that does bundle a variation-tree + comments UI is:

**@lichess-org/pgn-viewer** (GPL-3.0-or-later, v2.6.2, source #46). Its own README (source #48,
read in full) lists exactly this area's goals: "browse through a game," "variation tree," "PGN
comments," plus accessibility (ARIA, keyboard nav). It is explicitly a **read-only viewer**,
though — its own "Non Goals" section states "custom user moves" is out of scope (source #48) —
which cuts against the teacher tab's need to interactively play/deviate on the board while
following notes. More importantly for the "no build step" constraint: its published
`dist/main.js` (fetched directly from unpkg, source #49) is **not a self-contained bundle**. It
opens with `import { attributesModule, classModule, init } from 'snabbdom';` — a bare specifier
— plus relative imports into further un-bundled internal modules that in turn need `chessops`
and `@lichess-org/chessground` resolved. A browser's native ES-module loader cannot resolve a
bare `'snabbdom'` specifier from a `<script type="module" src="...">` pointed at a raw CDN file
the way it resolved chessground's relative imports (area 2, source #26) — this package needs
either a bundler, an import map naming every one of its transitive dependencies, or routing
through a resolving ESM proxy CDN (e.g. `esm.sh`, which rewrites bare imports to fully-qualified
URLs at serve time). This is the one area where **the ticket's "flag it explicitly" instruction
applies**: pgn-viewer is the only candidate across all 5 areas that cannot be vendored as one
plain file or loaded by bare `<script>`/CDN `<script type="module">` the way the rest of the
stack can.

**Recommendation:** don't adopt pgn-viewer. Render the variations panel and the notes panel as
plain hand-written DOM/JS driven directly off the tree `@mliebelt/pgn-parser` already produced
in area 1 — walk `moves[]`, recurse into each move's `variations[]`, print `commentMove`/
`commentAfter` text under the board. This satisfies the ticket's own framing ("doesn't need to
be purpose-built... shouldn't require building a move-tree renderer from scratch") because the
hard part — turning PGN text into a walkable tree — is already done by the parser; what's left
is an ordinary recursive-render-to-DOM function, not a parser or a tree data structure, which is
appropriately scoped app code rather than a missing library.

**If a heavier prebuilt widget is wanted anyway** despite the GPL/no-bundler cost: the lightest
viable setup for `@lichess-org/pgn-viewer` would be an ESM `<script type="module">` importing
from `https://esm.sh/@lichess-org/pgn-viewer@2.6.2` (esm.sh resolves the bare `snabbdom`/
`chessops`/`chessground` specifiers to fully-qualified CDN URLs itself, so no `node_modules`
install or local bundler is needed) — still a materially different mechanism than every other
pick in this document (all of which work from a directly-vendored or jsdelivr/unpkg-served
file), which is why it's called out rather than silently substituted in.

**Gap, flagged for downstream tickets:** whatever panel gets built has to define its own click
target semantics (click a variation move → jump both the tree cursor and the board;
click a comment → same) — none of that interaction logic exists in the parser output, which is
inert data.

### 4. Freehand annotation

**cm-chessboard already ships this, close to ready-made.** Its extensions directory (source
#30) includes `arrows`, `markers`, and — the most directly relevant one — `right-click-annotator`,
whose source file's own header comment (source #33, read directly) states:

> Combines Arrows and Markers to draw/toggle arrows and circle markers with right-click +
> modifiers. Colors: Green: Right-click · Blue: Alt, Cmd or AltGr + Right-click ·
> Red: Shift + Right-click · Orange: Shift + Alt + Right-click. Redrawing the same arrow or
> marker removes it.

That is the ChessBase/lichess annotation convention (right-click-drag for an arrow, right-click
a square for a highlight, modifier keys for color, click-again to erase) already implemented,
not approximated — and its commit history (source #34) shows it being actively tuned as
recently as 2026-07-20, with one commit message literally reading "accept Meta and AltGr as the
blue modifier, **like lichess**." `Arrows.js` and `Markers.js` (sources #31–32, read directly)
back this with a real SVG-based implementation (`addArrow`/`getArrows`/`removeArrows` on the
board instance, an `ARROW_TYPE`/`MARKER_TYPE` palette of semantic colors) rather than a stub.
License: MIT, same as the base library.

The other candidate with native drawing, **chessground**, is equally real (README quote in area
2) but carries the same GPL trade-off already discussed there. **chessboard2**'s arrow/circle
support is unfinished per its own TODO list (area 2). **chessboard.js**, **react-chessboard**,
and **@lichess-org/pgn-viewer** have no annotation-drawing feature mentioned anywhere in their
READMEs.

**Recommendation:** use cm-chessboard's `Arrows` + `Markers` + `RightClickAnnotator`
extensions directly for the drawing interaction itself.

**Gap, flagged explicitly for ticket 0004:** drawing the shapes is solved; *policy* around them
is not, and none of it exists in any library:
- Whether an annotation persists across moves or auto-clears on the next move (ChessBase's
  default per map.md) is app logic to add on top of `addArrow`/`removeArrows` — the extension
  has no opinion on when to call which.
- Nothing in the stack **writes** PGN comments back out. `@mliebelt/pgn-parser` (area 1) can
  *read* existing `[%cal ...]`/`[%csl ...]` annotation commands out of a PGN's comments into
  `colorArrows`/`colorFields`, but there is no corresponding serializer anywhere in this stack
  for turning a teacher's live-drawn cm-chessboard arrows back into that PGN comment syntax, if
  map.md's still-open "can annotations be saved back out" question is answered "yes."
- Mapping cm-chessboard's own color semantics (green/blue/red/orange via click modifiers) onto
  whatever UI affordance the teacher tab actually exposes (keyboard modifiers may not be
  discoverable/usable for a teacher focused on a lesson) is a UX decision for ticket 0004, not
  something the extension prescribes.

### 5. Cross-tab live sync

**BroadcastChannel is confirmed as the right mechanism**, matching what map.md already assumed,
checked directly against MDN (source #50) and the WHATWG HTML Living Standard itself (source
#51) rather than taking the assumption on faith:
- API shape: `new BroadcastChannel(name)`, `postMessage(message)`, `close()`,
  `onmessage`/`onmessageerror` — confirmed on both MDN and in the spec's own interface
  definition.
- Scope: same-origin only. The spec's own normative language (source #51) requires the
  destination's "storage key" to equal the sender's — i.e., cross-origin delivery is
  structurally impossible, and delivery explicitly excludes the sender ("remove source from
  destinations").
- Browser support: MDN (source #50) lists it as **Baseline "widely available"** since
  March 2022 — safe to rely on unconditionally for a teacher-controlled, presumably
  modern-browser setup.
- **Confirmed limitation, directly relevant to the ticket's "reload mid-session" requirement:**
  BroadcastChannel has no message history or replay. It is a live pub/sub channel only — a tab
  that opens or reloads *after* a message was sent will simply never see it, because delivery
  only happens to listeners subscribed at send time. Neither MDN nor the spec describes any
  buffering behavior. This is exactly why the ticket (and map.md) already anticipated needing
  storage underneath it.

**Alternatives, compared as the ticket requested:**
- **`storage` event**: fires on other same-origin tabs when `localStorage` changes, but not on
  the writing tab itself, and it's a side effect of a storage write rather than a purpose-built
  messaging API — no message "type," just whatever you serialize into the changed key/value
  pair, and it would still need `localStorage` itself as the actual transport. It's really "use
  localStorage as a message bus," which BroadcastChannel does more directly and without needing
  a storage write for every single sync tick (e.g. a live cursor-drag preview wouldn't need to
  hit disk-backed storage on every pixel).
- **SharedWorker**: also same-origin, but requires a separate worker script and explicit
  connection/port lifecycle management from every tab — meaningfully more moving parts than
  this two-tab (teacher + projector) scenario needs. Not investigated further at spec/MDN level
  since BroadcastChannel already clearly satisfies the requirement more simply; flagged here so
  it's visible this wasn't a deep dive, just a proportionate pass.
- **`postMessage` via a `window.open()` reference**: works only as long as the opening tab holds
  the window handle it got back from `window.open()`. If the teacher's tab reloads, or the
  projector tab is reopened by some means other than the teacher's own "open projector" action
  (bookmark, browser history, manually typing the URL in a second window), the handle is gone
  and the two tabs can never re-link. BroadcastChannel has no such handle-lifetime coupling —
  any same-origin tab can join a named channel at any time, which is a direct, better structural
  fit for "a projector tab that opens or reloads mid-session."

**What sits underneath it, and why two different stores:**
- **IndexedDB for the multi-PGN library.** MDN's storage-quotas page (source #52, fetched
  directly) states Web Storage (`localStorage`/`sessionStorage`) is capped "to 10 MiB of data
  maximum on all browsers" (and more specifically ~5 MiB per kind per origin on many browsers),
  throwing `QuotaExceededError` past that limit — a real risk for a teacher's PGN library
  accumulating over a school year — whereas IndexedDB is managed by each browser's own
  storage-management system with quotas "up to 60% of total disk size" in Chromium-based
  browsers (per the same page), explicitly meant for "storing large data structures... and
  indexing them for high-performance searching." A library of PGN files (multi-game files
  included) is exactly that shape: a set of independently-addressable records, not one blob.
- **localStorage for the small "current position" pointer used for catch-up.** A late-joining
  or reloaded projector tab needs to read *some* durable state the instant it starts — before
  any BroadcastChannel message could possibly arrive, since by definition no sender is
  broadcasting again just because a new listener showed up. A tiny, synchronously-readable
  record (e.g. `{gameId, path/moveIndex, boardOrientation, overlay toggles}`) written to
  `localStorage` on every position change satisfies this cheaply; `localStorage`'s size limit is
  a total non-issue for a payload this small, and its synchronous API is actually a plus for
  "read this before first paint" startup code, in contrast to the async `IndexedDB` API — worth
  using IndexedDB's strength (capacity) for the bulky, static-per-lesson PGN library, and
  localStorage's strength (trivial synchronous read) for the ever-changing tiny "where are we
  right now" pointer.
- **BroadcastChannel remains the live-update path** for tabs that are already open: on every
  teacher move/navigation, write the new pointer to `localStorage` *and* `postMessage` it over
  the channel, so already-open tabs update instantly (no polling/storage-event round trip
  needed) while newly-opened/reloaded tabs bootstrap correctly from `localStorage` before any
  message would exist for them to receive.

**Gap, flagged for ticket 0003:** none of this decides the actual reconnection protocol (does a
late-joining projector tab request a fresh snapshot, or just read localStorage once at
startup and then rely on future broadcasts? what happens if the teacher tab itself is the one
that reloads?) — that handshake design is exactly what ticket 0003 ("prototype the projector
tab") needs to work out; this research only confirms the primitives to build it from.

## Final recommendation

| Area | Pick | Version (checked 2026-08-11) | License | Script-tag/CDN usable with zero build step? |
|---|---|---|---|---|
| Move validation | [chess.js](https://github.com/jhlywa/chess.js) | 1.4.0 | BSD-2-Clause | Yes — ESM dist is self-contained (source #8) |
| PGN → move tree (variations + comments) | [@mliebelt/pgn-parser](https://github.com/mliebelt/pgn-parser) | 1.4.19 | Apache-2.0 | Yes — ships a UMD build, README states so explicitly (source #11) |
| Board UI (×2 instances) | [cm-chessboard](https://github.com/shaack/cm-chessboard) | 8.12.19 | MIT | Yes — ESM, zero dependencies, jsdelivr CDN path confirmed |
| Variations/notes panel | Hand-built DOM/JS over the pgn-parser tree | n/a | n/a | Yes — no library gap, just app code |
| Freehand annotation | cm-chessboard's `Arrows` + `Markers` + `RightClickAnnotator` extensions | bundled with cm-chessboard 8.12.19 | MIT | Yes — same package |
| Cross-tab live sync | `BroadcastChannel` (Web API, no library) | Baseline since March 2022 | n/a | Yes — native browser API |
| Multi-PGN library persistence | `IndexedDB` (Web API, no library) | n/a | n/a | Yes — native browser API |
| Current-position pointer / late-join catch-up | `localStorage` (Web API, no library) | n/a | n/a | Yes — native browser API |

Every pick above is loadable via a plain `<script>` tag / `<script type="module">` from a CDN
(jsdelivr/unpkg) or a vendored single file, matching the root PairFX app's and opening-selector's
existing zero-build-step convention — **no new build tooling is required for this stack.** The
one library seriously considered that would have forced a build step —
`@lichess-org/pgn-viewer` — was explicitly not picked, for the reasons in area 3 above; if a
future ticket revisits that decision, the lightest viable path is importing it from
`https://esm.sh/@lichess-org/pgn-viewer@2.6.2` rather than installing a local bundler.

**What this stack does not cover** (restated here for tickets 0003 and 0004 specifically):
- No library validates a move *and* knows about variations at the same time — chess.js and
  pgn-parser must be glued together by app code (area 1).
- No library renders a variation tree or a comments panel as a UI component — that panel is
  hand-built app code walking pgn-parser's output (area 3).
- No library decides annotation persistence policy (clear-on-move vs. sticky) or serializes
  drawn annotations back into PGN `%cal`/`%csl` comment syntax — cm-chessboard only draws/erases
  shapes on command (area 4).
- No library or web API provides "catch-up" as a finished feature — BroadcastChannel is
  send/receive only with no history, so the localStorage-pointer-plus-IndexedDB-library
  bootstrap sequence for a late-joining projector tab is a protocol ticket 0003 still has to
  design (area 5).
