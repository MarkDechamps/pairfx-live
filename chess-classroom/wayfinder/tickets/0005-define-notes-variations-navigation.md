---
id: 0005
title: Define variations/notes click-to-jump semantics and nested-variation display
labels: [wayfinder:grilling]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: []
---

## Question

Define exactly what happens when the teacher clicks a note (a PGN comment) or a variations
panel entry:

- Does it move both boards straight to that exact position when Sync is on, including into a
  deeply nested sideline?
- How are nested variations rendered in the right-hand panel — a flat list per depth, an
  indented tree, collapsed by default below some depth?
- Does the currently-active note/variation entry stay highlighted as the game advances via
  other means (clicking the board itself, arrow-key stepping)?

## Resolution

Confirmed by the requester as proposed (reviewed after the fact, on return).

- **Click-to-jump reaches the exact position, at any depth.** Clicking a note or a variations
  entry — mainline or a deeply nested sideline — moves both boards straight there when Sync is
  on. This is the whole point of "clickable notes" as originally described; there's no reason
  to special-case depth. When Sync is off, it only moves the teacher board (consistent with the
  free-clicking behavior already settled for the Sync toggle).
- **Nested variations render as an indented tree**, branching inline at the move where the
  sideline splits off (as the 0002 prototype already shows for the Berlin/Open Spanish
  sidelines) — this matches how ChessBase and lichess studies already display variations, so
  teachers don't have to learn a new convention. Sidelines nested more than ~2 ply deep default
  to collapsed, expandable on click, to avoid a wall of text on heavily annotated files —
  matching the progressive-disclosure feel of the Chessly/GothamChess course viewer named as a
  reference.
- **One current-move pointer drives everything.** Whatever last changed the position — clicking
  a note, a variations entry, the board itself, or stepping with arrow keys — updates the same
  single "current move" state, which is what keeps the board highlight, the notes text, and the
  active variations entry all in sync with each other. (The 0002 prototype implements exactly
  this pattern already, just triggered only from variations clicks so far.)
