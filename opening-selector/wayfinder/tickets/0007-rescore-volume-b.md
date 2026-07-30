---
id: 0007
title: Re-research and re-score ECO volume B families
labels: [wayfinder:task]
status: open
assignee: claude
map: ../map-opening-catalog-research.md
blocked_by: [0005]
---

## Question

Per the process in [Catalog re-scoring schema and process design](0005-catalog-rescoring-schema-and-process.md),
re-investigate every ECO-B-rooted family in `FAMILY_TAGS`
(`scripts/build_opening_catalog.py`): re-derive the four style axes,
`ratingBand`, `depthOfTheory` baseline, and `estimatedHoursToCompetency`
baseline via genuine reasoning; research-back `healthAtHigherLevels` and a new
`reputationNotes` field via `/research` subagent(s) with cited sources; author
an `overview` field; identify and resolve any sub-variations that should be
promoted to their own individual investigation. Update the build script's data
tables, regenerate `opening-catalog.json`, and sync the corresponding entries
in `opening-sample.json`.
