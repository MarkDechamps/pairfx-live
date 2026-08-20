---
id: 0006
title: Repo wiring — package.json, vendor script, nav link, CLAUDE.md
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: [4, 5]
---

## Question

Wire `opening-trainer/` into the repo the way `opening-tree/` is wired: its own `package.json`
(devDependencies `chess.js`/`cm-chessboard`, `npm run vendor`/`serve`/`test` scripts) and
`scripts/vendor-libs.mjs` copying into a committed `vendor/`, a nav link added to the root
`index.html`'s header alongside the other three sub-apps, and an `opening-trainer/CLAUDE.md`
documenting the architecture at the same depth as `opening-tree/CLAUDE.md`.

## Resolution

`package.json`/`scripts/vendor-libs.mjs`/`.gitignore` set up early (needed real vendored
`chess.js`/`cm-chessboard` to actually run and verify the app while building tickets 0004-0005),
mirroring `opening-tree/package.json` exactly. Root `index.html`'s header nav now links to
Opening Trainer alongside the other three sub-apps. Root `CLAUDE.md` updated: the app list now
includes Opening Tree and Opening Trainer (Opening Tree predates this session but had never been
added there), and the wayfinder paragraph now names all four sub-app wayfinder instances instead
of two. `opening-trainer/CLAUDE.md` written at the same depth as `opening-tree/CLAUDE.md`,
including the domain refinement and the real bug caught during ticket 0005 (see that file's
"Judgment calls").
