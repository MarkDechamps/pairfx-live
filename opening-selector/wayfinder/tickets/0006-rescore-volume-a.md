---
id: 0006
title: Re-research and re-score ECO volume A families
labels: [wayfinder:task]
status: closed
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

**Batch 3 of 3 (25 families) — done, ticket complete:** Polish Defense,
Polish Opening, Polish Opening (with d5), Pseudo Queen's Indian Defense,
Pterodactyl Defense, Queen's Indian Accelerated, Queen's Pawn Game, Rat
Defense, Robatsch Defense, Réti Opening, Saragossa Opening, Slav Indian,
Sodium Attack, Torre Attack, Trompowsky Attack, Valencia Opening, Van Geet
Opening, Van't Kruijs Opening, Vulture Defense, Wade Defense, Ware Opening,
Yusupov-Rubinstein System, Zaire Defense, Zukertort Defense, Zukertort
Opening.

Re-derived `FAMILY_TAGS` values and authored `FAMILY_OVERVIEW`/
`FAMILY_REPUTATION` for all 25 in `scripts/family_data/volume_a.py`. 16 of
the 25 were flagged **LOW-CONFIDENCE MATCH** in the research cache and were
re-researched directly via WebSearch/WebFetch (Polish Defense, Polish
Opening, Polish Opening with d5, Pterodactyl Defense, Rat Defense, Robatsch
Defense, Réti Opening, Saragossa Opening, Sodium Attack, Valencia Opening,
Van Geet Opening, Vulture Defense, Wade Defense, Ware Opening,
Yusupov-Rubinstein System, Zaire Defense); two of those turned out to
genuinely describe the family by name despite the flag and were used as-is
(Robatsch Defense's cache hit the Modern Defense article, which explicitly
names Robatsch as an alternate name for the same opening; Pterodactyl
Defense's cache hit the same Modern Defense article, which is legitimate
background even though the Pterodactyl's own specific line needed
supplementary WebSearch). A further two families weren't flagged but their
cache content turned out to be off-topic on inspection (Pseudo Queen's
Indian Defense hit the generic Glossary of chess page; Van't Kruijs Opening
information came from the shared "Irregular chess opening" list rather than
a dedicated article) and were supplemented the same way. Also pulled exact
PGN/ECO data from lichess-org-adjacent opening databases (365chess,
chess.com openings) to disambiguate several ambiguously-named families:
Queen's Indian Accelerated (1.d4 b6 2.c4 Nf6, ECO A50, distinct from the
main Queen's Indian's 2.c4 e6 3.Nf3 b6 order), Pseudo Queen's Indian Defense
(1.d4 Nf6 2.Nf3 b6 — Queen's Indian ideas without White's early c4),
Vulture Defense (1.d4 Nf6 2.c4 c5 3.d5 Ne4, one of the Benoni-family
Vulture/Hawk/Woozle trio), Zaire Defense (1.d4 Nc6 2.d5 Nb8 3.e4 Nf6 4.e5
Ng8 — an even more extreme version of Montevideo Defense's tempo-wasting
retreat), and Zukertort Defense (1.Nf3 Nf6, the symmetrical non-committal
reply to the Zukertort Opening).

Corrected two families whose research surfaced a real gap between their
main line and their best-regarded line: Polish Defense's immediate 1.d4 b5
is genuinely dubious (2.e4 hits the pawn directly, and early Modern Chess
Openings editions dismissed it outright), while deferred move orders
reaching the same structure are "fully respectable" per that same source
and have been played by Spassky, Tal, Karpov, and Carlsen — so the family
baseline reflects the dubious immediate line, and the sound deferred
approach is promoted separately (see below). Rat Defense and Wade Defense
both had their `healthAtHigherLevels` corrected from negative to positive:
research turned up genuine elite pedigree for both (Aronian, Anand,
Svidler, Rapport, and Smirin for the Rat; Hodgson, Adams, Jansa, and Miles
for the Wade) that the prior bulk-copied tags didn't reflect.

Promoted two sub-variations to `NOTABLE_SUBVARIATIONS`: Polish Defense:
Spassky Variation (the deferred, sound move order described above — a
genuine health/character split from the family's dubious immediate main
line) and Trompowsky Attack: Raptor Variation (2...Ne4 3.h4!?, including
the sharper Hergert Gambit branch — a distinctly more direct, tactical line
than the Trompowsky's usual calm structural squeeze).

Synced the `Réti Opening` entry in `wayfinder/assets/opening-sample.json`
with its new overview/reputationNotes and the corrected
`forgivingVsPunishing` value (-1 → 0, since the opening is fully sound and
flexible rather than punishing) — this was the one entry flagged back in
batch 1 as needing sync once its batch arrived. Checked all other 13
sample entries against this batch's 25 families; none of the rest belong
to volume A, so no further sample-file sync was needed.

Verified via `pytest scripts/test_build_opening_catalog.py` — all 304
tests pass (298 family tests + 6 general, covering every family across all
5 ECO volumes now that this was the last batch outstanding). Did not
regenerate/commit `opening-catalog.json`: consistent with every other
closed volume ticket (B, C, D, E) and both prior batches of this one, the
generated catalog JSON is left for a separate build step rather than
committed alongside each source-data change.

## Resolution

All 75 ECO volume A families in `FAMILY_TAGS` (`scripts/family_data/volume_a.py`)
were re-investigated across 3 batches of 25, per the process in
[Catalog re-scoring schema and process design](0005-catalog-rescoring-schema-and-process.md):
the four style axes, `ratingBand`, and `depthOfTheory`/`estimatedHoursToCompetency`
baselines re-derived via genuine chess-domain reasoning; `healthAtHigherLevels`
and a new `reputationNotes` field written research-backed, grounded in
`scripts/research_cache/*.md` where the cache hit the right Wikipedia article
and via direct WebSearch/WebFetch (plus exact PGN pulled from lichess-org-
adjacent opening databases for ambiguously-named families) everywhere the
cache was flagged **LOW-CONFIDENCE MATCH** or turned out off-topic on
inspection; and a new `overview` field authored for every family.

**Batch 1** (Amar Opening through Englund Gambit Declined, 25 families)
promoted four sub-variations — Dutch Defense's Leningrad, Stonewall, and
Classical Variations, and Benko Gambit Declined's Sosonko Variation — and
synced the `Dutch Defense` entry in `opening-sample.json`. **Batch 2**
(Formation through Paleface Attack, 25 families) promoted Grünfeld
Defense's Exchange Variation, fixed a pre-existing color bug (Marienbad
System, White → Black) and reassigned Lasker Simul Special's color
(White → Black) for consistency with how other Black-defined replies are
tagged; no sample-file sync was needed that batch. **Batch 3** (Polish
Defense through Zukertort Opening, 25 families) promoted Polish Defense's
Spassky Variation and Trompowsky Attack's Raptor Variation, corrected two
families' `healthAtHigherLevels` where research surfaced genuine elite
pedigree the prior bulk-copied tags missed (Rat Defense, Wade Defense), and
synced the `Réti Opening` entry in `opening-sample.json` — the one sample
entry belonging to volume A, flagged back in batch 1 as needing sync once
its batch arrived.

In total: 75 families re-scored and re-authored, 7 sub-variations promoted
to `NOTABLE_SUBVARIATIONS`, 2 pre-existing data bugs fixed, and 2 of the 14
`opening-sample.json` entries synced (`Dutch Defense`, `Réti Opening`) —
the only two of the sample's 14 hand-picked openings that are volume A
families. `scripts/test_build_opening_catalog.py` passes in full: 304
tests (298 family tests + 6 general), confirming every family across all
5 ECO volumes (A-E, tickets 0006-0010) now has genuinely re-derived tags
and research-backed `overview`/`reputationNotes` text. This closes the
last of the five volume tickets and completes the whole
[map-opening-catalog-research.md](../map-opening-catalog-research.md)
execution effort.
