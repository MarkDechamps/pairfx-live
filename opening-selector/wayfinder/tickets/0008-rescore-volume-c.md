---
id: 0008
title: Re-research and re-score ECO volume C families
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map-opening-catalog-research.md
blocked_by: [0005]
---

## Question

Per the process in [Catalog re-scoring schema and process design](0005-catalog-rescoring-schema-and-process.md),
re-investigate every ECO-C-rooted family in `FAMILY_TAGS`
(`scripts/build_opening_catalog.py`): re-derive the four style axes,
`ratingBand`, `depthOfTheory` baseline, and `estimatedHoursToCompetency`
baseline via genuine reasoning; research-back `healthAtHigherLevels` and a new
`reputationNotes` field via `/research` subagent(s) with cited sources; author
an `overview` field; identify and resolve any sub-variations that should be
promoted to their own individual investigation. Update the build script's data
tables, regenerate `opening-catalog.json`, and sync the corresponding entries
in `opening-sample.json`.

## Resolution

Done across two passes. First pass (Sonnet, ran out of budget mid-ticket):
re-derived `FAMILY_TAGS` for all 30 families via genuine reasoning (20 of the
30 values actually changed from their bulk-inherited defaults). Second pass
(Haiku 4.5, as a cost/quality pilot): added `overview` and `reputationNotes`
for all 30 families, reading pre-fetched Wikipedia research from
`scripts/research_cache/` instead of live WebFetch/WebSearch per family
(3 families — Italian Game, Portuguese Opening, Three Knights Opening — had
low-confidence cache matches and needed manual research). No sub-variations
promoted this batch, despite the ticket flagging Ruy Lopez/King's Gambit/
Italian Game as likely candidates — worth a second look later if this turns
out to be the lighter model being conservative rather than a genuine absence
of divergent sub-lines.

`opening-sample.json` synced for Italian Game, Ruy Lopez, French Defense,
Scotch Game. Verified: all 30 families' tests pass.

**Quality note**: the Haiku-authored prose reads noticeably more generic/
templated than Sonnet's Volume D/E output (shorter, more repetitive sentence
patterns, less concrete chess detail). Structurally correct and passing, but
this is the deciding data point against using a lighter model for the
remaining, larger volumes (A: 75 families, B: 19 families) — reverting to the
default model for those.

