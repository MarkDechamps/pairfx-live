---
id: 0008
title: Define whether in-lesson annotations/positions can be saved back out
labels: [wayfinder:grilling]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: []
---

## Question

0004 left this open, and it's now sharp enough to ticket: can a teacher save what they drew or
reached during a lesson back out of chess-classroom, or is it session-only/ephemeral?

Specifically:
- Can a teacher export the currently-loaded game as a PGN that includes their drawn
  annotations, round-tripped as `%cal`/`%csl` comments (which `@mliebelt/pgn-parser` already
  reads on the way in per 0001's research, but nothing in the stack writes them back out)?
- If yes, does export replace the library entry in place, save as a new one, or just download a
  file?
- If no, is that a permanent product decision or just not needed for a first version?

## Resolution

Resolved by the requester's decision to move straight to implementation: **out of scope for
v1 — session-only/ephemeral.** Annotations and reached positions are not exported or written
back to the PGN library in the first build. This is a scoping call for v1, not a permanent
product decision — revisit if teachers ask for it after using the tool. No PGN-writing/
serialization code is needed for the first implementation as a result.
