---
id: 0007
title: Surface a Training Session's variation/branch switches
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: [5]
---

## Question

At a Scope broader than one branch (repertoire / all-of-color), finishing one variation makes
`advanceSession` move on to the next one in scope — a different branch, sometimes a completely
different opening, with no indication anything happened beyond the board position changing. The
well-known-move auto-play `advanceSession` already does (ticket-less, see `wayfinder/map.md`'s
"Decisions so far") jumps forward silently by design, but that's always a deeper step along the
very line already being drilled, not a jump to an unrelated one — the two need to be told apart,
not conflated. Detect the "we've moved to a different variation" transition specifically, and
give it a visible, in-keeping-with-existing-style indication above the training board without
adding noise to the well-known auto-play stepping.

## Resolution

Added a pure `isVariationSwitch(previousPath, nextPath)` to `engine.js` (TDD, 6 new tests): false
whenever `previousPath` is an exact prefix of `nextPath` (same moves so far, just deeper — the
well-known auto-play case and ordinary same-line progression alike), true otherwise (diverging at
a shared ancestor into a sibling variation, an unrelated opening entirely, or even just a
shallower path). This is a pure function of the two paths, so it needed no awareness of *why* the
session moved — auto-play or not — to correctly tell the two apart.

`advanceSession` (`app.js`) now sets `session.newVariation` right where it settles on the next
node to quiz, comparing against `session.current.path` *before* overwriting it (guarded so the
very first turn of a session, with no previous node to have switched away from, is never flagged).
Recomputed unconditionally on every settle — true or false — so it always reflects the transition
that just happened rather than needing separate clearing logic.

Reused this app's existing informational-banner idiom (`.notice-banner`'s
border-color-info/background-secondary look, already used for the upload's skipped-FEN-chapters
notice) rather than inventing a new one, as a new `.training-new-variation` element rendered in
`renderTrainingSession`, above the wrong/prompt feedback line: "New line — this is a different
variation than the one you just finished." Not reused `state.notice` itself — that banner is
dismissible and persists until the user closes it or a new notice replaces it, which fits an
upload-time warning but not a per-turn, self-clearing signal; a session-scoped field recomputed
every turn fits this transition better than a shared, manually-dismissed one.

Verified with a headless-Chromium Playwright driver (no `chromium-cli` in this sandbox — see
`CLAUDE.md`'s Fixtures/manual QA note) against a repertoire seeded with two variations (an e4
line with one node pre-marked well known, and an unrelated d4 line) trained at "review in order",
repertoire scope: turn 1 (first-ever turn) shows no banner; the well-known auto-play skip lands on
a turn that still continues the e4 line — no banner; finishing the e4 line and landing on d4 — an
actual switch — shows the banner; the very next turn (continuing the d4 line) shows it's already
cleared. Zero console errors throughout; screenshots confirm the banner doesn't disturb the
training layout.
