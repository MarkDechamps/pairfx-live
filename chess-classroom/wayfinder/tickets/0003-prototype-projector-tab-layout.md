---
id: 0003
title: Prototype the projector tab layout and its toggleable overlays
labels: [wayfinder:prototype]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: [1]
---

## Question

Now that 0001 has picked a board library, build a rough mockup of the projector tab: a
fullscreen-friendly board with zero teacher controls, plus the three teacher-toggleable
overlays the requester asked for — move number, last move, and drawn arrows — each
independently switchable from the teacher tab.

Resolve exact placement/styling of the overlays so they're readable from the back of a
classroom, and confirm the projector tab needs nothing beyond what the sync mechanism chosen
in 0001 delivers to it (i.e. it's a pure renderer of whatever it receives, no independent
state or controls).

## Resolution

Prototype: [prototypes/0003-projector-tab-layout.html](../prototypes/0003-projector-tab-layout.html)
(published at https://claude.ai/code/artifact/2027de64-a1f2-4cef-b1bc-e6fb895df78b).

Confirmed by the requester (reviewed after the fact, on return): the layout, overlay
placement, and pure-renderer behavior below all stand as proposed. Additionally answered: the
overlay-visibility question this ticket surfaced — **overlay visibility is remembered**, not a
per-session choice (a teacher who hides "last move" once doesn't need to re-hide it every
lesson).

- **Zero chrome, confirmed**: the projector view is only the board plus the three overlays —
  no library/upload/variations/notes/Sync controls anywhere on this screen, matching the
  destination's "board-only" decision. The corner control panel in the prototype is explicitly
  a *test harness standing in for the teacher tab*, not a real part of this screen.
- **Overlay placement**: move number top-left, last-move label bottom-left, both as
  high-contrast pills over the wood-dark background (not over the board itself, so they never
  cover a piece) sized for back-of-room legibility. Arrows draw directly on the board via an
  SVG layer, per 0001's cm-chessboard `Arrows` extension.
- **Pure renderer, confirmed**: nothing on this screen has its own state — board position,
  overlay visibility, and the arrow all come from whatever the teacher tab last sent. The
  prototype's three checkboxes exist only to *simulate* what the teacher tab would send, so a
  reviewer can see the effect without a second real tab wired up yet.

- **Overlay visibility is remembered** across sessions (stored the same way as the rest of the
  app's local state), not reset per lesson.
