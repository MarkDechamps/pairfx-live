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

**Batch 2 of 3 (25 families) — done:** Formation, Global Opening, Grob
Opening, Grünfeld Defense, Horwitz Defense, Hungarian Opening, Indian
Defense, Kangaroo Defense, King's Indian Attack, King's Indian Attack (with
Bf5), King's Indian Attack (with e6), Kádas Opening, Lasker Simul Special,
London System, London System (with Bd3), London System (with Be2),
Marienbad System, Mexican Defense, Mieses Opening, Mikenas Defense, Modern
Defense, Montevideo Defense, Nimzo-Larsen Attack, Old Indian Defense,
Paleface Attack.

Re-derived `FAMILY_TAGS` values and authored `FAMILY_OVERVIEW`/
`FAMILY_REPUTATION` for all 25 in `scripts/family_data/volume_a.py`.
Research-backed via `scripts/research_cache/*.md` where the cache hit the
right article (King's Indian Attack and its two sub-families, Mieses
Opening, Old Indian Defense) or turned out to genuinely describe the family
despite being flagged **LOW-CONFIDENCE MATCH** (Kangaroo Defense — the cache
hit the Keres Defence article, which is the same opening under its other
name; Mexican Defense — the cache hit the Black Knights' Tango article,
likewise the same opening under its modern name). All other flagged
low-confidence families, plus a few more that weren't flagged but whose
cache content turned out to be off-topic on inspection (Grünfeld Defense,
Nimzo-Larsen Attack), were re-researched directly via WebSearch/WebFetch —
including pulling exact PGN move orders straight from lichess-org's
`a.tsv`/`d.tsv` source data to confirm several families whose names alone
are ambiguous (Mikenas Defense, Montevideo Defense, Marienbad System,
Paleface Attack, Kádas Opening, Lasker Simul Special, Global Opening,
Hungarian Opening, Indian Defense).

Also fixed a pre-existing data bug while re-deriving tags: Marienbad System
(a Queen's Indian branch defined entirely by Black's moves, 1.d4 Nf6 2.Nf3
b6 3.g3 Bb7 4.Bg2 c5) was mis-tagged `color: "White"`; corrected to
`"Black"`. Reassigned `Lasker Simul Special`'s color from White to Black too,
since the position (1.g3 h5) is a sound White try defined by Black's
provocative, family-naming ...h5 reply — consistent with how other
Black-defined replies (e.g. Kangaroo Defense) are tagged elsewhere in this
file.

Promoted one sub-variation to `NOTABLE_SUBVARIATIONS`: Grünfeld Defense's
Exchange Variation (1.d4 Nf6 2.c4 g6 3.Nc3 d5 4.cxd5 Nxd5, ECO D85) — the
family's sharpest, most heavily analyzed main line, genuinely more tactical
and punishing than the Grünfeld's other branches (per ticket 0005's
discussion, Grünfeld Defense was specifically called out as worth a real
look). King's Indian Attack was also looked at per that same callout, but
its two genuinely-divergent branches (the calmer "reversed London" with
...Bf5, and the sharper classic ...e6 form) already exist as separate
top-level `FAMILY_TAGS` entries from before this ticket, so no further
promotion was made there.

Checked `wayfinder/assets/opening-sample.json`'s 14 entries against this
batch's 25 families (and the one promoted sub-variation) — none belong to
this batch, so no sample-file sync was needed this round. (`Réti Opening`
remains flagged from a prior batch's notes as still needing sync — not this
batch's families, left as-is for whichever batch covers it.)

Verified via `pytest scripts/test_build_opening_catalog.py` — all 50 tests
for these 25 families pass.

**Remaining (25 families, batch 3, not yet started):** Polish Defense,
Polish Opening (plus "with d5"), Pseudo Queen's Indian Defense, Pterodactyl
Defense, Queen's Indian Accelerated, Queen's Pawn Game, Rat Defense,
Robatsch Defense, Réti Opening, Saragossa Opening, Slav Indian, Sodium
Attack, Torre Attack, Trompowsky Attack, Valencia Opening, Van Geet Opening,
Van't Kruijs Opening, Vulture Defense, Wade Defense, Ware Opening,
Yusupov-Rubinstein System, Zaire Defense, Zukertort Defense, Zukertort
Opening. Note: `Réti Opening` also appears in `opening-sample.json` and will
need its overview/reputationNotes synced whichever batch covers it (carried
over from batch 1's notes, still unresolved).

Ticket stays open — 25 of volume A's 75 families remain for the final
batch.
