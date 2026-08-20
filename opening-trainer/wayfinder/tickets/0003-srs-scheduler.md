---
id: 0003
title: Spaced-repetition scheduler (simplified SM-2, binary grading)
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: [1]
---

## Question

Extend `engine.js` with the Card lifecycle per ADR 0002: `initCard()`, `gradeCard(card, correct)`
(binary correct/incorrect, not a 0-5 quality scale), and scope/method resolution per
`CONTEXT.md`'s Scope/Method language — `nodesInScope(tree, scope)` and, for each Method,
`orderForSession(nodes, method)` (fixed pre-order walk for review-in-order, that walk shuffled
once for random, and a live "most-overdue-first, fall back to introducing new nodes" picker for
spaced-repetition). Pure logic, TDD via `node --test`.

## Resolution

Built via TDD (tests appended to `engine.test.js` first, 39 total, all red before these exports
existed). `initCard`/`gradeCard`/`isDue` implement the simplified SM-2 from ADR 0002 (ease
clamped to `[1.3, 3.0]`, interval capped at 365 days, a lapse resets `reps` and the interval to
0). `nodesInScope(root, path)` resolves the Scope (branch when `path` is given, whole repertoire
when it's omitted) as a flat pre-order list — which turned out to *be* the review-in-order
Method already, no separate function needed. `shuffle` (injectable RNG) gives the random
Method. `pickNextDue` is the spaced-repetition Method's live picker, with an `excludePath` so a
just-lapsed card doesn't repeat on the very next turn. "all-of-color" scope (union across
several repertoires' trees) is left to `app.js`: `nodesInScope` only knows about one tree, and
combining several is a one-line `flatMap` at the call site, not more engine logic. 39/39 tests
green.
