---
title: Chess Opening Advisor — Spec Map
labels: [wayfinder:map]
status: closed
---

## Destination

A spec for an interactive chess-opening recommender page — the criteria taxonomy (style,
rating, study time, and others still to be determined), the branching question-flow logic
(LLM-like: one question leads to the next based on prior answers), and the data schema for
openings (populated with a small representative sample, not the full 365chess.com catalog) —
covering both White and Black as two runs of the same flow. Ready to hand off for
implementation. Visual/UI design is explicitly out of scope.

## Notes

- Domain: chess-opening recommendation logic, not chess engine analysis.
- Use `/grilling` and `/domain-modeling` for grilling-type tickets.
- Use the `/research` skill (via a subagent) for research-type tickets.
- No issue tracker was configured for this repo; using the local-markdown tracker convention
  documented in `wayfinder/README.md`.
- 365chess.com/chess-openings is the reference the user has in mind for "the universe of
  openings" — not yet confirmed as the actual data source (see ticket 0001).

## Decisions so far

- [Data sourcing options for the opening dataset](tickets/0001-data-sourcing-options.md) —
  use the `lichess-org/chess-openings` GitHub dataset (CC0) as primary source, Wikipedia's ECO
  table as fallback; avoid 365chess.com as a data source (its prose/stats are its own compiled
  product, not open data); style/complexity/rating tags aren't structured data anywhere and
  must be hand-authored.
- [Criteria taxonomy for the recommender](tickets/0002-criteria-taxonomy.md) — 6 criteria:
  Rating (band, FIDE-anchored at the top two tiers, qualitative below), Study time (daily
  budget), Depth of knowledge tolerance, Style (4 independent 5-point scales: tactical/
  positional, risk tolerance, dynamic/static, forgiving/punishing), Time control(s)
  (multi-select), and Longevity.
- [Question-flow and recommendation logic design](tickets/0003-question-flow-recommendation-logic.md) —
  scoring/filtering engine (not a decision tree); color asked first, run twice (once per
  color); style questions adapt by rating band (simplified for Beginner/Intermediate, full 4
  axes for Advanced+); Time control is always a hard filter, Depth of knowledge is a hard
  filter only for Advanced+ (low bands can "play whatever," e.g. an under-prepared Najdorf is
  fine below that level but excluded above it); Rating/Style/Longevity are soft-scored, Study
  time personalizes the rationale instead; output is a top-3 shortlist per selected time
  control.
- [Opening data schema](tickets/0004-opening-data-schema.md) — full field list (structural
  facts, `depthOfTheory`/`timeControls` as hard filters, `ratingBand`/style axes/
  `healthAtHigherLevels` as soft-scored -2..+2 or 1-5 integers, `estimatedHoursToCompetency`
  for rationale personalization) plus a 14-opening hand-authored sample spanning ECO A-E,
  both colors, and the full range of every field — [assets/opening-sample.json](assets/opening-sample.json).

## Not yet specified

(none — all four tickets resolved, destination reached)

## Out of scope

- Visual/UI design (layout, styling, look-and-feel) — ruled out during destination-scoping.
  Use the `frontend-design` skill separately when building.
- Populating the full opening catalog beyond the representative sample — downstream
  data-entry/execution work, not part of the spec destination.
- Community advice/scoring — users rating openings themselves, surfaced alongside or blended
  into recommendations. Raised while resolving the criteria taxonomy ticket; ruled out as a
  distinct feature (own data model, aggregation, moderation) deserving a future map of its own,
  not an expansion of this spec's destination.
- Generating actual theory/study content for the player at their requested depth (an
  opening-teaching feature). Raised while resolving the opening data schema ticket; distinct
  from recommending *which* opening to study, deserving its own future map.
