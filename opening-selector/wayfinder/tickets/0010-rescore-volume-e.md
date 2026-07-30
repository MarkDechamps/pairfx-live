---
id: 0010
title: Re-research and re-score ECO volume E families
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map-opening-catalog-research.md
blocked_by: [0005]
---

## Question

Per the process in [Catalog re-scoring schema and process design](0005-catalog-rescoring-schema-and-process.md),
re-investigate every ECO-E-rooted family in `FAMILY_TAGS`
(`scripts/build_opening_catalog.py`): re-derive the four style axes,
`ratingBand`, `depthOfTheory` baseline, and `estimatedHoursToCompetency`
baseline via genuine reasoning; research-back `healthAtHigherLevels` and a new
`reputationNotes` field via `/research` subagent(s) with cited sources; author
an `overview` field; identify and resolve any sub-variations that should be
promoted to their own individual investigation. Update the build script's data
tables, regenerate `opening-catalog.json`, and sync the corresponding entries
in `opening-sample.json`.

## Resolution

All 10 assigned families re-investigated and re-scored in
`scripts/build_opening_catalog.py`: Blumenfeld Countergambit, Blumenfeld
Countergambit Accepted, Bogo-Indian Defense, Catalan Opening, King's Indian
Defense, Nimzo-Indian Defense, Queen's Indian Defense, Queen's Indian Defense
(with e3), Queen's Indian Defense (with e3, Bb4+ Line), and Queen's Pawn
(Mengarini Attack).

**Tag changes made after genuine re-derivation** (vs. the old bulk-copied
values): Blumenfeld Countergambit/Accepted — bumped `riskTolerance` (and
`dynamicVsStatic` for the Accepted line) to reflect that these are concrete
gambit lines, not just "somewhat tactical." Catalan Opening — `forgivingVsPunishing`
moved to -1 (a strategic squeeze, not a sharp tactical test). King's Indian
Defense — `riskTolerance`/`forgivingVsPunishing` bumped to +2 and `healthAtHigherLevels`
lowered to 0, reflecting the family's opposite-wing-race character and its
genuinely volatile elite-level reputation (see below). Nimzo-Indian Defense —
`ratingBand`/`depthOfTheory` baseline bumped to Expert/Deep given the sheer
depth of its ECO range (E20-E59) and universal elite adoption. Queen's Indian
Defense (with e3) and its Bb4+ sub-line — `forgivingVsPunishing` and
`ratingBand` lowered, since e3 systems are a deliberately quieter, less
theory-heavy branch than the g3 fianchetto main lines. Queen's Pawn (Mengarini
Attack) — `healthAtHigherLevels` lowered to -2; an early queen sortie with
essentially no footprint in serious practice. Bogo-Indian Defense and the base
Queen's Indian Defense were re-derived but found to already be correct; kept
unchanged.

**Promotions (5, all with their own overview/reputationNotes and tag
overrides in `NOTABLE_SUBVARIATIONS`):**
- `Bogo-Indian Defense: Monticelli Trap` — a genuine tactical trick (10.Ng5!)
  embedded in an otherwise positional family; promoted for divergent
  character (sharp/punishing vs. the family's calm baseline).
- `Catalan Opening: Hungarian Gambit` — Black's ...e5 countergambit reply,
  the one sharp/tactical outlier inside an otherwise strategic-squeeze family.
- `King's Indian Defense: Sämisch Variation`, `: Four Pawns Attack`, and
  `: Fianchetto Variation` — the three sub-systems the ticket itself flagged
  as likely candidates. Research confirmed each has a genuinely distinct
  character: Sämisch is the sharpest opposite-castling try; Four Pawns Attack
  is the highest-risk/most double-edged try for White; Fianchetto is the
  calmer, more positional counterpoint and (per research) the single most
  popular try against the KID at GM level today — the inverse of the
  family's dynamic baseline.

**Key sources for `healthAtHigherLevels`/`reputationNotes` (all fetched and
paraphrased, not copied verbatim — Wikipedia is CC BY-SA):** Wikipedia
articles for Blumenfeld Gambit, Bogo-Indian Defence, Catalan Opening, King's
Indian Defence (plus its Sämisch Variation article), Nimzo-Indian Defence,
and Queen's Indian Defense — used for popularity/adoption claims (e.g.
Carlsen's Catalan use, Kasparov's KID history with Kramnik, "every world
champion since Capablanca" for Nimzo-Indian). Supplemented with general web
search for the Queen's Indian e3/Spassky/Petrosian systems and the KID
Sämisch's reputation, and for confirming the (very sparse) footprint of the
Mengarini Attack, whose only real presence is opening-database ECO listings
rather than master commentary.

`opening-sample.json` synced for its three affected entries (Catalan Opening,
Nimzo-Indian Defense, King's Indian Defense): added `overview`/`reputationNotes`,
and updated the style/rating/health values to match the re-derived family
baselines (Nimzo-Indian's ratingBand/depthOfTheory bumped to Expert/Deep;
King's Indian's riskTolerance/forgivingVsPunishing bumped and healthAtHigherLevels
lowered to 0; Catalan's forgivingVsPunishing moved to -1).

Verified via `pytest scripts/test_build_opening_catalog.py` — all 20
family-parametrized tests for these 10 families pass, plus all 6
non-parametrized structural tests (subvariation inheritance/promotion,
missing-content guards). Families outside this ticket's scope remain red, as
expected.
