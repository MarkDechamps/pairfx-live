---
id: 0012
title: Persist wizard answers across visits and reword the study-time estimate
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map-start-screen-search.md
blocked_by: []
---

## Question

Every wizard answer (color, first move(s), rating, study time, depth, time control(s), style
axes, longevity) should persist in local storage and pre-fill its step as a default on the
next visit, while remaining fully changeable — one uniform "default, not locked" rule for
every field, no special-casing color vs. the rest that rarely change.

Separately, `engine.js`'s `formatEstimate` currently renders "about N days/weeks at your
pace." Reword it to name the actual stored study-time option and the total hours, e.g. "≈24
hours total — about 3 weeks at 1 hour a day," since a returning user may not recall what they
picked. This is reused as-is by the search screen's detail card
([Build the opening search/lookup screen](0013-build-search-screen.md)), which needs a
neutral fallback (no "at ... a day" clause) for a user who has never touched the wizard and
so has no stored study time.

## Resolution

Built test-first (`node --test`, red before green):

- `engine.js` gained `STORAGE_KEY`, `loadPersistedAnswers(storage)`, and
  `savePersistedAnswers(storage, answers)` — pure functions of an injected storage object (so
  they're testable with an in-memory fake, and `app.js` passes the real `window.localStorage`),
  whitelisting exactly the 8 persistable fields.
- `formatEstimate` now takes an optional `studyTimeValue`: with one, it renders e.g. "≈80 hours
  total — about 15 weeks at 30-60 minutes a day."; without one (the search screen's fallback
  when nothing is stored yet), a neutral "≈24 hours total to competency." `STUDY_TIME_OPTIONS`
  gained a `paceLabel` per option for the sentence form (distinct from the tile `label`).
- `app.js`: `loadAnswersFromStorage()` seeds `state.answers` from storage at boot (and again on
  "Start over", replacing the old `state.answers = {}` wipe) and marks any persisted style axis
  as `styleTouched` so it shows pre-selected rather than looking untouched;
  `persistAnswers()` is called at every one of the 4 answer-mutation sites (choice tiles,
  first-move/time-control multi-select, style scale). No per-step defaulting code was needed —
  a step already renders pre-selected whenever `state.answers[key]` is defined.

Tests: `engine.test.js` — 3 new `formatEstimate` cases (pace-aware short/long, neutral fallback)
and 5 new persistence cases (empty storage, corrupt JSON, round-trip, key whitelisting).
