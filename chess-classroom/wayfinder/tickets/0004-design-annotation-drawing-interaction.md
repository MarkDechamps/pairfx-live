---
id: 0004
title: Design the annotation (arrows/highlights) drawing interaction
labels: [wayfinder:prototype]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: [1]
---

## Question

Now that 0001 has picked a board library, design the ChessBase-style annotation interaction:

- What gesture draws an arrow vs. a square highlight? (ChessBase's own convention is
  right-click-drag for an arrow, right-click a square for a highlight — confirm whether that
  translates cleanly to a web/trackpad context or needs adapting.)
- Does a drawn annotation clear automatically on the next move (ChessBase's default) or
  persist until manually cleared — and is that teacher-configurable?
- When Sync is on, do annotations mirror to the projector immediately, gated by the "arrows"
  overlay checkbox from ticket 0003? What happens to annotations across a Sync
  toggle-off/toggle-on-again cycle (they follow the position snap decided for moves — confirm
  the same applies to annotations)?

## Resolution

Confirmed by the requester as proposed (reviewed after the fact, on return).

- **Gesture: adopt cm-chessboard's default, no adaptation needed.** 0001's research found
  cm-chessboard's `RightClickAnnotator` extension already implements right-click-drag for an
  arrow and right-click a square for a highlight — the exact ChessBase convention the
  requester asked for, out of the box. This translates fine to a laptop trackpad (right-click
  is a standard two-finger-tap/gesture on every platform this would run on) so no adaptation is
  needed; question effectively answered by the library choice.
- **Persistence: clear on move, teacher-configurable.** Proposing ChessBase's own default
  (annotations clear when the position advances) since that matches what teachers already
  expect coming from ChessBase, with a "keep annotations" toggle for the rarer case of wanting
  a mark to survive a move (e.g. marking a long-term weak square across several moves of
  discussion).
- **Sync scope: annotations follow the same rules as moves.** When Sync is on, a drawn
  annotation mirrors to the projector immediately, gated by the "arrows" overlay checkbox from
  0003 (a teacher can hide arrows on the projector even while still using them for their own
  reference). Across a Sync toggle-off/on cycle, annotations snap over with the position — same
  "toggling on jumps immediately" rule settled for moves, kept consistent rather than
  introducing a second rule just for drawings.
- **Not covered by any library (flagged by 0001), still open**: whether a drawn annotation
  round-trips into the PGN on export (as a `%cal`/`%csl` comment, which pgn-parser already
  reads on the way in) — i.e. can a teacher save their in-lesson markup back out, or is it
  session-only. This overlaps the "Not yet specified" fog item about saving positions/
  annotations back out; not resolved by this ticket.
