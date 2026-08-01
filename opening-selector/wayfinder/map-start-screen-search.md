---
title: Opening Selector Start Screen & Search — Map
labels: [wayfinder:map]
status: closed
---

## Destination

A redesigned start screen for the opening selector, splitting into two entry paths: the
existing guided wizard, and a new opening search/lookup screen. Every wizard answer (color,
first move(s), rating, study time, depth, time control(s), style axes, longevity) persists in
local storage across visits and pre-fills its step as a default, while remaining fully
changeable; "Start over" at the end of a wizard shortlist returns to the start screen rather
than to the first question. The search screen offers a name-only typeahead dropdown over the
full opening catalog; selecting a match renders a detail card of everything the catalog knows
about that specific row (overview, reputation notes, rating band, depth of theory, time
controls, and total hours to competency phrased against the user's stored study-time
preference, e.g. "about 3 weeks at 1 hour a day," falling back to a neutral hours figure if
none is stored yet) — no hard filters, pure lookup. Back from the detail card clears to an
empty search box, staying on the search screen. This same explicit-pace phrasing also
replaces the wizard's own "...at your pace" rationale text.

## Notes

- Domain: chess-opening recommendation UI, building on the closed [Chess Opening Advisor —
  Spec Map](map.md)'s schema and engine (`engine.js`/`app.js`), independent of the closed
  [Opening Catalog Re-Research — Map](map-opening-catalog-research.md)'s data work.
- **Execution-carrying**, same override as the catalog re-research map: ticket resolutions
  are the actual shipped feature (code changes), not design decisions on paper.
- Use the `/prototype` skill (with `frontend-design` for visual choices) for the two
  UI-shaped tickets below; use `/grilling` if a resolution surfaces a decision this map
  didn't anticipate.
- No issue tracker configured for this repo; using the local-markdown convention in
  `wayfinder/README.md`. Tickets carry a `map:` field since more than one map now shares the
  flat `tickets/` folder.

## Decisions so far

- [Persist wizard answers across visits and reword the study-time estimate](tickets/0012-persist-wizard-answers.md) —
  all 8 wizard fields now round-trip through local storage via `engine.js`'s
  `loadPersistedAnswers`/`savePersistedAnswers`; `formatEstimate` names the actual stored pace
  and total hours instead of saying "at your pace," with a neutral fallback when nothing is
  stored yet.
- [Build the start screen (wizard vs search entry point)](tickets/0011-build-start-screen.md) —
  `app.js` now has a `state.mode` (start/wizard/search) checked at the top of `render()`;
  wizard's own back button (step 0) and "Start over" both return to the start screen instead
  of resetting in place. Built directly (no HITL `/prototype` session — user was AFK), reusing
  the existing dark-theme conventions; worth a design pass with the user later.
- [Build the opening search/lookup screen](tickets/0013-build-search-screen.md) — name-only
  typeahead (`engine.js`'s `searchOpenings`) over the full catalog, detail card via a
  generalized `renderOpeningCard` shared with the wizard shortlist. Not verified in an actual
  browser — no headless-browser tooling in this environment; verified by manual code trace
  only.

## Not yet specified

(none surfaced during grilling — the three tickets below cover the full destination)

## Out of scope

- Auto-skipping the start screen for returning users (e.g. remembering which path they used
  last time) — ruled out while charting; the start screen is the app's front door on every
  visit.
- ECO-code or move-based search, and fuzzy/typo-tolerant matching — ruled out in favor of
  plain name-substring search.
- Any filtering or ranking on the search screen (by rating, style, etc.) — ruled out; it's a
  filter-free lookup, not a second recommendation pass.
- A persisted list of favorite/starred openings — the request was to look up "a" favourite
  opening by search, not to build a favorites-list feature.
