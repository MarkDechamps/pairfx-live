---
id: 0005
title: Training mode UI — settings screen and session runner
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: [3, 4]
---

## Question

Build the training half of `app.js`: the settings screen (Scope × Method + board-orientation +
the strict-wrong-move toggle from `CONTEXT.md`), the per-node "Drill" entry point
(branch scope, review-in-order, per `CONTEXT.md`'s Drill definition), and the session runner —
present a position, accept the trainee's move via the same board/move-list input as browsing,
enforce strict wrong-move handling (revert + retry on a mismatch against the repertoire's
Node), grade the Card via `engine.js`'s `gradeCard`, and show a session summary at the end.

## Resolution

Refined the domain model first: added the **Trainee Node** distinction to `CONTEXT.md` (only a
move of the Repertoire's own color is ever quizzed; the opponent's move is whatever the entry's
own stored path already replays, not a live/random choice — an initial `pickOpponentReply`
export was written, then deleted again once this became clear, rather than shipped unused) and
added `isTraineeMove`/`trainableNodesInScope` to `engine.js` via TDD (47/47 tests green).

`app.js`'s Drill button (browse screen) starts a session directly — Branch scope,
review-in-order, strict — with no settings screen, matching `CONTEXT.md`'s Drill definition.
The list screen's "Train" / "Train all &lt;color&gt;" buttons open a real settings screen
(Method: spaced-repetition/review-in-order/random; board orientation: auto/white/black;
wrong-move handling: strict/lenient) before starting. The session runner recomputes each turn's
position by replaying that entry's own stored path through `chess.js` (so opponent moves are
already "played" in the position shown, no separate auto-play step needed) and accepts *any*
`chess.js`-legal move as an attempt — unlike the browsing board, which only ever offers tracked
moves — so a genuinely wrong attempt is possible for wrong-move handling to catch.

**Bug caught by actually running the app, not by the test suite** (`app.js` is deliberately
untested DOM glue — see ticket 0004): `gradedThisTurn` was checked before grading but never
*set*, so a wrong-then-correct turn double-graded (once incorrect, once correct) instead of
once. Fixed by setting it inside `gradeCurrentCard` itself rather than at each call site, so it
can't be forgotten again. Re-verified end-to-end afterward: wrong attempt → strict hint
highlight on the correct squares → correct retry advances → next turn → end session → summary
shows the right correct/total — zero console errors throughout.
