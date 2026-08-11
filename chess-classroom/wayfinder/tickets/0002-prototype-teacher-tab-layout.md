---
id: 0002
title: Prototype the teacher tab layout
labels: [wayfinder:prototype]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: []
---

## Question

Build a rough, clickable-enough mockup of the teacher tab: the board (with move input) on one
side, the variations panel on the right, PGN-comment notes under the board, PGN-library/upload
controls, and the Sync toggle — arranged so the teacher can operate all of it without hunting
mid-lesson.

Take visual/interaction cues from the Chessly (GothamChess) course viewer for how the
notes/variations panel reads — named by the requester as a liked reference. Resolve:

- Overall panel arrangement (what's fixed, what scrolls).
- How the currently-active move is highlighted consistently across the board, the variations
  panel, and the notes panel at the same time.
- Where the Sync toggle and the annotation/drawing tools live so they're always reachable
  without covering the board.

This ticket doesn't need the final board library chosen in 0001 — a plain HTML/CSS mockup is
enough to react to.

## Resolution

Prototype: [prototypes/0002-teacher-tab-layout.html](../prototypes/0002-teacher-tab-layout.html)
(published at https://claude.ai/code/artifact/66373ee7-5332-44e2-9b58-20c539b5a42c).

Confirmed live with the requester: the overall arrangement — board plus a drawing-tool rail on
its left edge, a move badge and PGN-comment notes card directly under the board, a small
"projector preview" card, a variations tree on the right, and library/upload/Sync controls in
a top control bar — **works as a starting point**. No structural changes requested. Details
(exact styling, final visual identity) remain open for later passes; this ticket only settled
the panel arrangement and the cross-panel active-move highlighting behavior, which the
prototype demonstrates directly (clicking a variation node updates the board highlight, the
notes text, and — gated by the Sync toggle — the projector preview in the same interaction).
