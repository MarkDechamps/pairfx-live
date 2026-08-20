---
id: 0001
title: PGN parsing (with RAV variations) and repertoire tree engine
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: []
---

## Question

Build `engine.js`: parse one or more uploaded PGN files (movetext with `(...)` RAV variations,
one or more games per file) into a Repertoire tree — a root Node plus SAN-keyed children, per
`CONTEXT.md`'s Node/Path language and ADR 0001 (identity = SAN path, no transposition merging).
Merge multiple games/files into the same Repertoire the way `opening-tree/engine.js` merges
game records into one tree, adapted for RAV variations rather than single-mainline games. Pure
logic, zero DOM/network dependency, TDD via `node --test`, matching opening-tree's test style.

## Resolution

Built via TDD (`engine.test.js` written first, 14 tests, all red before `engine.js` existed).
`splitPgnGames`/`parseHeaders` handle one-or-many games per file; `tokenizeMovetext` strips
comments/move-numbers/NAGs/results/annotation-glyphs (`e4!`, `Nf3?!`) down to a flat
moves-plus-parens stream; `mergeMovetextIntoTree`'s recursive-descent `playTokens` merges RAV
variations (including nested ones) by branching `(` from the position *before* the last move,
proven by dedicated nested-variation and resume-after-close tests. `childrenOf`/`nodeAtPath`
mirror `opening-tree/engine.js`'s shape for reuse by the browser UI (ticket 0004). 14/14 tests
green.
