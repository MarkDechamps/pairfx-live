---
id: 0004
title: Opening data schema
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [0001, 0003]
---

## Question

Given the available data (ticket 0001) and what the recommendation logic needs to filter or
score on (ticket 0003), what fields does each opening entry in the dataset carry?

Produce the schema (field names, types, examples) and populate it with a representative
sample of 10-20 openings covering a spread of styles/ratings/study-time so the schema can be
validated end-to-end.

## Resolution

Full schema and sample data: [assets/opening-sample.json](../assets/opening-sample.json).

**Fields per opening entry:**
- `eco`, `name`, `color` (`White`|`Black`), `pgn` — structural facts, sourced per ticket 0001
  (`lichess-org/chess-openings`, Wikipedia ECO table as fallback).
- `depthOfTheory` (hard filter) — enum `Shallow`|`Moderate`|`Deep`. One value per entry; an
  opening family spanning multiple depths gets multiple sample entries at different ECO
  codes rather than a range on one entry.
- `timeControls` (hard filter) — array of eligible values from `Bullet/Blitz`, `Rapid`,
  `Classical/Correspondence`.
- `ratingBand` (soft-scored) — integer 1-5 matching the user rating taxonomy (1=Beginner ...
  5=Master), compared via distance against the user's own band.
- `style.{tacticalVsPositional, riskTolerance, dynamicVsStatic, forgivingVsPunishing}`
  (soft-scored) — each an integer -2..+2, same encoding/sign convention as the corresponding
  user-facing scale (see `_fieldConventions` in the JSON for exact polarity per axis).
- `healthAtHigherLevels` (soft-scored, drives Longevity) — integer -2..+2, not a boolean —
  a strict yes/no was rejected because no one would confidently assign a flat "no."
- `estimatedHoursToCompetency` — not filtered/scored directly; divided by the user's daily
  study-time budget to personalize the rationale line.

**Sample data:** 14 hand-authored openings (agent-authored using standard chess-theory
knowledge, per the user's direction — not independently spot-checked line-by-line in this
session), spanning all 5 ECO volumes (A-E), both colors, and the full range of each field
(e.g. Scandinavian Defense = Shallow theory/beginner-friendly vs. Najdorf Sicilian = Deep
theory/demanding; Caro-Kann = static/solid vs. King's Indian = dynamic/tactical).

**Parked idea (not part of this map):** dynamically generating actual theory/study content
for the player at their requested depth (an opening-teaching feature, distinct from
recommending which opening to study) — logged in the map's Out of scope section as a future
effort.
