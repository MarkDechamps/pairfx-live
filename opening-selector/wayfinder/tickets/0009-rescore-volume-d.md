---
id: 0009
title: Re-research and re-score ECO volume D families
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map-opening-catalog-research.md
blocked_by: [0005]
---

## Question

Per the process in [Catalog re-scoring schema and process design](0005-catalog-rescoring-schema-and-process.md),
re-investigate every ECO-D-rooted family in `FAMILY_TAGS`
(`scripts/build_opening_catalog.py`): re-derive the four style axes,
`ratingBand`, `depthOfTheory` baseline, and `estimatedHoursToCompetency`
baseline via genuine reasoning; research-back `healthAtHigherLevels` and a new
`reputationNotes` field via `/research` subagent(s) with cited sources; author
an `overview` field; identify and resolve any sub-variations that should be
promoted to their own individual investigation. Update the build script's data
tables, regenerate `opening-catalog.json`, and sync the corresponding entries
in `opening-sample.json`.

## Resolution

All 15 volume-D families re-investigated and given `overview`/`reputationNotes`
in `FAMILY_OVERVIEW`/`FAMILY_REPUTATION`, with several `FAMILY_TAGS` values
genuinely revised on reflection rather than left as bulk-inherited defaults
(e.g. Blackmar-Diemer Gambit's `healthAtHigherLevels` dropped -1→-2 reflecting
how rarely it's seen above club level; Slav Defense's `ratingBand`/depth bumped
2→3 given how deep mainline theory actually runs; Semi-Slav Defense Accepted's
style sharpened considerably).

**3 sub-variations promoted** to `NOTABLE_SUBVARIATIONS` (named lines whose
research confirmed genuine divergence from their otherwise solid/positional
family):
- `Queen's Gambit Declined: Albin Countergambit` — a real countergambit
  (2...e5!?), sharper and more provocative than the calm QGD around it; known
  for the Lasker Trap underpromotion tactic.
- `Blackmar-Diemer Gambit Accepted: Ryder Gambit` — the BDG's most extreme,
  all-in branch (5.Qxf3), considered unsound at serious level but a real
  practical weapon below it.
- `Semi-Slav Defense: Botvinnik Variation` — one of the most forced,
  theory-dense systems in chess (forcing lines past move 30), still a fully
  current top-level weapon despite the memorization demands.

**Sample sync**: `opening-sample.json`'s Queen's Gambit and Slav Defense
entries (the two of the 14 hand-picked sample openings that fall under this
volume's families) received matching `overview`/`reputationNotes`.

**Verification**: all 30 family-parametrized tests for these 15 families pass
(`pytest scripts/test_build_opening_catalog.py`); families outside this volume
remain red, as expected until their own tickets resolve.
