---
id: 0007
title: Re-research and re-score ECO volume B families
labels: [wayfinder:task]
status: closed
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

## Resolution

All 19 ECO-B families in `scripts/family_data/volume_b.py` re-investigated:
Alekhine Defense, Barnes Defense, Caro-Kann Defense, Carr Defense, Czech
Defense, Duras Gambit, Fried Fox Defense, Goldsmith Defense, Hippopotamus
Defense, King's Pawn Game, Lemming Defense, Lion Defense, Nimzowitsch Defense,
Owen Defense, Pirc Defense, Scandinavian Defense, Sicilian Defense, St. George
Defense, Ware Defense.

**Research sourcing:** 7 families used their pre-fetched Wikipedia cache
directly, on-topic and correctly matched (Alekhine Defense, Caro-Kann Defense,
King's Pawn Game, Pirc Defense, Scandinavian Defense, St. George Defense, Ware
Defense). A further 6 families were flagged **LOW-CONFIDENCE MATCH** by the
prefetch (the search hit the wrong article) but had genuinely usable, on-topic
content buried in a *different* cached article that happened to describe them
by name in a dedicated passage — Barnes Defense, Carr Defense, Duras Gambit,
Goldsmith Defense, and Lemming Defense (all four found inside the King's Pawn
Game article's "rare moves" survey, cross-referenced from that cache file),
plus Czech Defense (found inside the Pirc Defence cache's "Pribyl System"
section) — so those were used as legitimate sourced content rather than
triggering a fresh search. The remaining 6 families (Fried Fox Defense,
Hippopotamus Defense, Lion Defense, Nimzowitsch Defense, Owen Defense,
Sicilian Defense) needed actual manual WebSearch/WebFetch research beyond the
cache. Of the ticket's pre-identified "known low-confidence" set of 5
(Lemming, Lion, Nimzowitsch, Owen, Sicilian), 4 did need this manual research
— Lemming Defense turned out to have a usable cross-referenced line after all
(see above) — while 2 more families outside that set (Fried Fox Defense,
Hippopotamus Defense) also turned out to be low-confidence matches with no
usable cross-reference elsewhere in the cache, bringing the manual-research
total to 6.

**Bug fix while re-deriving tags:** `Duras Gambit`'s `color` was wrongly set
to `"White"` in the original bulk data; it is Black's 1...f5 reply to 1.e4
(confirmed via the King's Pawn Game Wikipedia cache) and has been corrected to
`"Black"`.

**Promotions (6 total, `NOTABLE_SUBVARIATIONS`):**
- `Sicilian Defense: Najdorf Variation` — the family's flagship, deepest-theory
  line; `ratingBand` raised to 5.
- `Sicilian Defense: Dragon Variation` — opposite-side-castling race, the
  sharpest structure the family produces; `ratingBand` raised to 5.
- `Sicilian Defense: Sveshnikov System` — a structurally distinct dynamic line
  (backward d-pawn traded for piece activity) rather than a purely tactical
  one.
- `Sicilian Defense: Alapin Variation` — a genuinely divergent anti-Sicilian
  sideline for White, much more positional/solid than the Open Sicilian
  baseline; `ratingBand` lowered to 2, `healthAtHigherLevels` set to 1.
- `Caro-Kann Defense: Panov Attack` — breaks from the family's usual
  static/solid character into a dynamic isolated-queen's-pawn structure;
  `ratingBand` raised to 3.
- `Scandinavian Defense: Portuguese Gambit` — a sharp, gambit-style delayed
  recapture that departs from the family's solid baseline; `ratingBand` raised
  to 3.

(Exact row names were verified against the live `lichess-org/chess-openings`
`b.tsv` before hardcoding, since `NOTABLE_SUBVARIATIONS` keys must match row
names exactly.)

**`opening-sample.json` sync:** 3 of its 14 entries belong to this volume —
Scandinavian Defense, Caro-Kann Defense, and Najdorf Sicilian (the sample's
existing row for the promoted Najdorf line) — all three got matching
`overview`/`reputationNotes` text added.

**Verification:** `pytest scripts/test_build_opening_catalog.py` — all 38
tests for this volume's 19 families pass (2 per family), plus the 6
general/promotion-mechanism tests.
