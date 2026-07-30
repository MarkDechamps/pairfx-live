---
id: 0005
title: Catalog re-scoring schema and process design
labels: [wayfinder:grilling]
status: closed
assignee: claude
map: ../map-opening-catalog-research.md
blocked_by: []
---

## Question

`wayfinder/assets/opening-catalog.json` currently gets its soft-scored tags
(`ratingBand`, `style.*`, `healthAtHigherLevels`, `depthOfTheory`,
`estimatedHoursToCompetency`) by bulk-copying ~150 hand-authored family entries
(`FAMILY_TAGS` in `scripts/build_opening_catalog.py`) onto ~3,800 individual
rows via a mechanical move-length/depth derivation — not individually reasoned
per row, not spot-checked (see the catalog's own `_provenance` note). The user
wants genuinely better scores and added explanation of what each opening is and
why it earns its tags. What's the schema and process for doing that?

## Resolution

**Unit of investigation — tiered per family (not per row):** ~150 families get
individually investigated. Every sub-variation under a family inherits that
family's tags/text verbatim (option (a) in ticket discussion) *unless* it's
promoted to its own investigation. A sub-variation is promoted when it (a)
carries a distinct proper name beyond its family (mechanical shortlist from the
lichess-org naming convention, e.g. "Sicilian Defense: Najdorf") *and/or* (c)
the family's own research surfaces that it genuinely diverges in character
(e.g. a generally positional family with one famous sharp gambit line) — a
judgment call made during family research, not a separate mechanical pass.
Pure popularity/prevalence data (would require an external stats source) was
considered and rejected as a promotion criterion — no licensed structured
source for this exists (per ticket 0001's research) and it would reopen a data-
sourcing question that isn't needed here.

**Rigor — hybrid:** the four style axes, `ratingBand`, `depthOfTheory` baseline,
and `estimatedHoursToCompetency` baseline are re-derived via genuine reasoned
chess-domain analysis per family (same method as today's `FAMILY_TAGS`, just
done individually with real thought instead of inherited/copied defaults).
`healthAtHigherLevels` and the new `reputationNotes` field are **research-
backed** — a `/research` subagent fetches and cites real sources (the family's
Wikipedia article, master-game commentary, etc.) before these are written,
since these are the claims most likely to be wrong from memory alone and most
consequential if wrong (they get surfaced to end users as practical advice).

**New fields, per family (and per promoted sub-variation):**
- `overview` (string) — what the opening is, how it plays, folding in why it
  earns its style/rating tags. Prose, not further subdivided.
- `reputationNotes` (string) — practical/reputation color kept separate from
  `overview` (e.g. "solid choice below 2200, considered slightly passive at GM
  level," "currently a trendy try at the top level," "a known trap for the
  underprepared"). This is the field the user specifically asked to make sure
  gets surfaced.

Non-promoted rows inherit their family's `overview`/`reputationNotes` verbatim
— no per-row templating. This is an accepted honesty tradeoff, not a flaw to
hide: a user drilling into an obscure sub-variation sees text describing the
family it shares its character with.

**Scope — both files:** `opening-catalog.json` (~3,800 rows, ~150 families)
and `opening-sample.json` (14 hand-picked openings) both get the schema
upgrade. The sample's openings are a subset of families being redone anyway,
so upgrading them is nearly free and keeps the two files schema-consistent
(rejected leaving the sample as-is, since that would fork the schema between
the two files).

**Execution-carrying map:** unlike the original spec map, this map's
destination *is* the actual upgraded data, not a spec about it — the user
confirmed they want the scores actually improved, not a design for improving
them later. Work is batched by ECO volume (5 tickets: A, B, C, D, E), reusing
a grouping the data already has (`lichess-org/chess-openings`' own
`a.tsv`...`e.tsv` split, which `FAMILY_TAGS` families already map to 1:1). Each
volume ticket's resolution: research + re-derive tags for that volume's
families, identify and resolve any promotions, update `FAMILY_TAGS` (plus new
`OVERVIEW`/`REPUTATION` tables) in `scripts/build_opening_catalog.py`, rerun
the script to regenerate `opening-catalog.json`, and manually sync the
corresponding entries in `opening-sample.json`. Volume tickets are independent
of each other (no blocking between them) but all blocked on this ticket.
Promoted sub-variation tickets aren't pre-created — they surface once a
volume's family research actually uncovers a genuine divergence, per
wayfinder's fog-of-war convention.
