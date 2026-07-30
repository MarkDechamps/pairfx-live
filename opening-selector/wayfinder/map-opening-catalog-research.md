---
title: Opening Catalog Re-Research — Map
labels: [wayfinder:map]
status: open
---

## Destination

A re-researched `wayfinder/assets/opening-catalog.json` (and matching
`opening-sample.json`) where every opening family's tags and text are grounded
in real investigation instead of the current bulk family-to-row inheritance:
genuinely re-derived style/rating/depth/hours tags, research-backed
`healthAtHigherLevels` and a new `reputationNotes` field (cited sources for
both), and a new `overview` field explaining what each opening is and how it
plays. This map is execution-carrying — its destination is the actual updated
data, not a spec about updating it.

## Notes

- Domain: chess-opening data quality/content, building on top of the closed
  [Chess Opening Advisor — Spec Map](map.md)'s schema (ticket
  [Opening data schema](tickets/0004-opening-data-schema.md)).
- Use `/grilling` and `/domain-modeling` for grilling-type tickets; use the
  `/research` skill (via a subagent) for the research-backed pieces of each
  volume ticket (`healthAtHigherLevels`, `reputationNotes`).
- No issue tracker was configured for this repo; using the local-markdown
  tracker convention documented in `wayfinder/README.md`. Tickets carry a
  `map:` field pointing back to this file, since more than one map's tickets
  now share the flat `tickets/` folder.
- **Execution-carrying override:** unlike the closed spec map, this map's
  ticket resolutions include real work product (research + authored text +
  data-table/script edits + regenerating the catalog JSON), not just
  decisions. See [Catalog re-scoring schema and process design](tickets/0005-catalog-rescoring-schema-and-process.md)
  for why.
- Source of the current family-level tagging this map is improving on:
  `scripts/build_opening_catalog.py` (`FAMILY_TAGS`), see that file's own
  docstring and the catalog's `_provenance` field for the honesty caveats that
  prompted this effort.

## Decisions so far

- [Catalog re-scoring schema and process design](tickets/0005-catalog-rescoring-schema-and-process.md) —
  tiered per-family investigation (named sub-variations + research-surfaced
  divergence get promoted to their own investigation; everything else inherits
  its family's tags/text verbatim); hybrid rigor (reasoned analysis for style/
  rating/depth/hours, research-backed with cited sources for
  `healthAtHigherLevels` and reputation); two new fields per family —
  `overview` and `reputationNotes`; both `opening-catalog.json` and
  `opening-sample.json` upgraded; work batched into 5 tickets by ECO volume
  (A-E), each independent, all blocked on this design ticket.

## Not yet specified

- Individual investigations for promoted sub-variations (named lines, or ones
  a volume's family research finds genuinely diverge from their family) — not
  ticketed yet; they surface as each ECO-volume ticket is resolved and
  actually uncovers which sub-variations qualify.

## Out of scope

(none yet)
