---
id: 0013
title: Build the opening search/lookup screen
labels: [wayfinder:prototype]
status: closed
assignee: claude
map: ../map-start-screen-search.md
blocked_by: [0011, 0012]
---

## Question

Build the second start-screen path: a name-only typeahead search box over the full opening
catalog (~3800 rows, already loaded client-side — no debounce needed) showing a dropdown of
matching names as the user types. Selecting one renders a detail card for that specific row,
reusing essentially the same layout as the wizard's `renderResultCard` (overview, reputation
notes, rating band, depth of theory, time controls) minus the rank badge and the
personalized-fit rationale, plus a total-hours-to-competency line built with `formatEstimate`
([Persist wizard answers across visits and reword the study-time estimate](0012-persist-wizard-answers.md))
against the user's stored study time, falling back to a neutral hours figure if none is
stored yet. No hard filters apply — this is lookup only, independent of rating, style, and
longevity. "Back" from the detail card clears to an empty search box, staying on this screen
(not returning to the start screen). Use the `/prototype` and `frontend-design` skills for
the dropdown and card layout.

## Resolution

`engine.js` gained `searchOpenings(query, openings, limit)` (TDD, `node --test`) — pure
substring match, case-insensitive, sorted by match position then name length/alpha so an
earlier or shorter match (e.g. "Sicilian Defense") outranks a longer one that merely contains
the query further in; capped at 20 results by default. `renderResultCard` was generalized into
`renderOpeningCard(opening, options)` — `rank`/`rationale`/`deeper` all optional — so the
wizard shortlist and this screen's detail card share one implementation instead of two.

`app.js`'s `renderSearchScreen` shows a text input (autofocused, with focus/caret explicitly
restored after each re-render since this app's usual full-DOM-rebuild-per-render pattern would
otherwise steal focus mid-keystroke) plus a live-filtered results list once there's a query;
picking a result stores it in `state.searchSelected` and swaps to `renderSearchDetail`, which
calls `renderOpeningCard` with `rationale: E.formatEstimate(opening.estimatedHoursToCompetency,
state.answers.studyTime)` — `state.answers.studyTime` comes from whatever
[Persist wizard answers across visits and reword the study-time estimate](0012-persist-wizard-answers.md)
loaded from storage, so this works even if the user has never run the wizard this session (falls
back to `formatEstimate`'s neutral form when nothing is stored). "Back" from the detail clears
`searchSelected`/`searchQuery`/`searchCaret` and stays on the search screen; from the empty
search box it returns to the start screen.

Not automated: no headless-browser tooling exists in this environment (no jsdom/Playwright/
Puppeteer, and none installed for this), so the DOM/interaction layer was verified by careful
manual trace rather than an actual browser run. Recommend a quick manual click-through before
relying on this in production.
