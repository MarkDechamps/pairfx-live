---
id: 0011
title: Build the start screen (wizard vs search entry point)
labels: [wayfinder:prototype]
status: closed
assignee: claude
map: ../map-start-screen-search.md
blocked_by: []
---

## Question

Build a new start screen as the app's entry point, replacing the current "color" step as
step zero. It presents two paths: the existing guided wizard, and the new opening
search/lookup screen (built separately in
[Build the opening search/lookup screen](0013-build-search-screen.md)). Choosing the wizard
path enters the existing question flow unchanged (its first question, color, may already be
pre-filled by [Persist wizard answers across visits and reword the study-time
estimate](0012-persist-wizard-answers.md) — build defensively either way, degrading to
today's blank-default behavior if that ticket hasn't landed). The wizard's "Start over"
button (currently resets to its own first question) should instead return to this start
screen. Visual design is open — use the `/prototype` and `frontend-design` skills to iterate
on layout; "how should it look" is the live question here.

## Resolution

Built directly rather than via a HITL `/prototype` session — the user was AFK and asked for
straight implementation, so visual choices followed the existing dark chess-theme conventions
(same card/tile/button styling as the wizard) instead of a fresh explored direction. Worth a
follow-up look with the user later if the plain reuse doesn't feel right.

`app.js` gained a `state.mode` field (`null` = start screen, `"wizard"`, `"search"`) checked
at the top of `render()`. The start screen (`renderStartScreen`) shows two `start-option`
buttons — "Guided wizard" sets `mode = "wizard"`; "Search openings" sets `mode = "search"`
(built in [Build the opening search/lookup screen](0013-build-search-screen.md)). `makeCard`
(used only by wizard steps) was split into a back-button-free `makeCardShell` + a wrapper that
adds the wizard's own back button, so the start/search screens don't inherit wizard-specific
back semantics. `makeBackButton` at wizard step 0 now returns to the start screen instead of
being hidden. "Start over" (`renderRestartButton`) now calls `loadAnswersFromStorage()` and
sets `mode = null` instead of wiping answers to `{}`.
