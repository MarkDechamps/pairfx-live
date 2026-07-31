---
id: 0006
title: Re-research and re-score ECO volume A families
labels: [wayfinder:task]
status: open
assignee: claude
map: ../map-opening-catalog-research.md
blocked_by: [0005]
---

## Question

Per the process in [Catalog re-scoring schema and process design](0005-catalog-rescoring-schema-and-process.md),
re-investigate every ECO-A-rooted family in `FAMILY_TAGS`
(`scripts/build_opening_catalog.py`): re-derive the four style axes,
`ratingBand`, `depthOfTheory` baseline, and `estimatedHoursToCompetency`
baseline via genuine reasoning; research-back `healthAtHigherLevels` and a new
`reputationNotes` field via `/research` subagent(s) with cited sources; author
an `overview` field; identify and resolve any sub-variations that should be
promoted to their own individual investigation. Update the build script's data
tables, regenerate `opening-catalog.json`, and sync the corresponding entries
in `opening-sample.json`.

## Progress

**Batch 1 of 3 (25 families) — done:** Amar Opening, Amazon Attack, Amsterdam
Attack, Anderssen's Opening, Australian Defense, Barnes Opening, Basque
Opening, Benko Gambit, Benko Gambit Accepted, Benko Gambit Declined, Benoni
Defense, Bird Opening, Borg Defense, Canard Opening, Clemenz Opening, Colle
System, Creepy Crawly Formation, Dutch Defense, Döry Defense, East Indian
Defense, English Defense, English Opening, English Orangutan, Englund Gambit,
Englund Gambit Declined.

Re-derived `FAMILY_TAGS` values, authored `FAMILY_OVERVIEW`/`FAMILY_REPUTATION`
in `scripts/family_data/volume_a.py` for all 25 (research-backed via
`scripts/research_cache/*.md` where the cache hit the right article; a
handful were flagged **LOW-CONFIDENCE MATCH** in the cache — Amar Opening,
Amazon Attack, Amsterdam Attack, Australian Defense, Barnes Opening, Basque
Opening, Borg Defense, Canard Opening, Clemenz Opening, Döry Defense, English
Orangutan — and were re-researched directly via WebSearch/WebFetch instead;
Creepy Crawly Formation's low-confidence cache file turned out to legitimately
describe the family in a named-variations list, so that was used as-is).
Promoted four sub-variations to `NOTABLE_SUBVARIATIONS`: Dutch Defense's
Leningrad, Stonewall, and Classical Variations (genuinely distinct hypermodern
/ static / balanced characters — Dutch Defense was called out in the ticket
0005 discussion as worth a real look), and Benko Gambit Declined: Sosonko
Variation (the one sharp, tactical branch inside an otherwise calm/positional
family). Synced the `Dutch Defense` entry in `wayfinder/assets/opening-sample.json`
(the only one of the 14 sample entries belonging to a batch-1 family).
Verified via `pytest scripts/test_build_opening_catalog.py` — all 50
tests for these 25 families pass.

**Remaining (50 families, batches 2-3, not yet started):** Formation, Global
Opening, Grob Opening, Grünfeld Defense, Horwitz Defense, Hungarian Opening,
Indian Defense, Kangaroo Defense, King's Indian Attack, King's Indian Attack
(with Bf5), King's Indian Attack (with e6), Kádas Opening, Lasker Simul
Special, London System (plus "with Bd3" / "with Be2"), Marienbad System,
Mexican Defense, Mieses Opening, Mikenas Defense, Modern Defense, Montevideo
Defense, Nimzo-Larsen Attack, Old Indian Defense, Paleface Attack, Polish
Defense, Polish Opening (plus "with d5"), Pseudo Queen's Indian Defense,
Pterodactyl Defense, Queen's Indian Accelerated, Queen's Pawn Game, Rat
Defense, Robatsch Defense, Réti Opening, Saragossa Opening, Slav Indian,
Sodium Attack, Torre Attack, Trompowsky Attack, Valencia Opening, Van Geet
Opening, Van't Kruijs Opening, Vulture Defense, Wade Defense, Ware Opening,
Yusupov-Rubinstein System, Zaire Defense, Zukertort Defense, Zukertort
Opening. Note: `Réti Opening` also appears in `opening-sample.json` and will
need its overview/reputationNotes synced whichever batch covers it.

Ticket stays open — 50 of volume A's 75 families remain across the next two
batches.
