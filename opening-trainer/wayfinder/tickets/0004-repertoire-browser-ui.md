---
id: 0004
title: Repertoire browser UI (upload, board, tree navigation)
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: [1, 2]
---

## Question

Build `index.html` + `styles.css` + the browsing half of `app.js`: repertoire
management (create/select/rename/delete, per color), PGN upload (file picker + drag/drop,
choosing which repertoire a file's games join), and a tree-browsing board reusing
`opening-tree`'s exact board/piece pattern (vendored `chess.js` for SAN-path-to-FEN replay,
`cm-chessboard`'s SVG piece sprite, hand-rolled click-to-move, move-list rows as the equivalent
navigation). DOM glue — untested, matching opening-tree's `app.js` convention.

## Resolution

Built `app.js`/`index.html`/`styles.css`. Repertoire list (per-color tabs, create, rename,
delete, PGN upload into an existing or brand-new repertoire) plus a browse screen reusing
opening-tree's board/piece/click-to-move pattern verbatim (`resolveSquareClick`, ported into
`engine.js` in this ticket with its own tests) — move-list rows now show a status badge per
move (opponent's reply / not trained yet / due / learned) instead of opening-tree's win-rate
bar, since a repertoire tracks Cards, not game outcomes. DOM glue, deliberately untested per
convention — but actually *run*: `npm run vendor`, `npm install`, then driven end-to-end with a
headless-Chromium Playwright script (no `chromium-cli` available in this sandbox, so a small
driver script filled in) through create → upload a PGN with a RAV variation → browse (board,
move list, breadcrumb, flip) with zero console errors. Screenshots confirmed the board renders
pieces correctly and the dark theme matches the other sub-apps.
