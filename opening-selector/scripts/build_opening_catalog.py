#!/usr/bin/env python3
"""Builds wayfinder/assets/opening-catalog.json — the full ECO A-E dataset
(~3800 rows) from lichess-org/chess-openings (CC0), tagged for the Wayfinder
recommender schema (wayfinder/tickets/0004-opening-data-schema.md).

Style/rating/depth/health tags do not exist as structured data anywhere
(wayfinder/tickets/0001), so they're hand-authored here at the *family*
level (the ~150 root opening names the whole ECO catalog is built from,
e.g. every "Sicilian Defense: ..." row inherits the Sicilian's tags) using
standard chess-theory knowledge. This is bulk/pattern-based, not
individually reasoned per row — a deliberate quality tradeoff to cover the
full catalog rather than the ~14-opening hand-picked sample in
wayfinder/assets/opening-sample.json (left untouched; it stays the spec's
validation sample). Per-row depthOfTheory/ratingBand/timeControls/hours
are then derived from each row's move length and sub-variation depth
relative to its family's baseline.

Not independently spot-checked line-by-line — same caveat as ticket 0004.
"""

import json
import re
import time
import urllib.request
import urllib.error
from pathlib import Path

ECO_VOLUMES = ["a", "b", "c", "d", "e"]
BASE_URL = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/{}.tsv"
REQUEST_DELAY_SECONDS = 1.0  # 5 static files total — politeness margin, not a real load concern

REPO_ROOT = Path(__file__).resolve().parent.parent
SAMPLE_PATH = REPO_ROOT / "wayfinder" / "assets" / "opening-sample.json"
OUTPUT_PATH = REPO_ROOT / "wayfinder" / "assets" / "opening-catalog.json"

DEPTH_LABELS = {1: "Shallow", 2: "Moderate", 3: "Deep"}

# ---- family tag table -----------------------------------------------------
# key: opening name up to (not including) the first ": " in the lichess dataset.
# value: (color, tacticalVsPositional, riskTolerance, dynamicVsStatic,
#         forgivingVsPunishing, healthAtHigherLevels, ratingBand[1-5],
#         depthBase[1=Shallow,2=Moderate,3=Deep])
FAMILY_TAGS = {
    "Alekhine Defense": ("Black", 1, 1, 2, 0, 0, 3, 2),
    "Amar Opening": ("White", 0, 1, 1, 1, -2, 1, 1),
    "Amazon Attack": ("White", 1, 2, 1, -1, -2, 1, 1),
    "Amsterdam Attack": ("White", 0, 0, 0, 0, -1, 2, 1),
    "Anderssen's Opening": ("White", -1, -1, -1, -1, -1, 1, 1),
    "Australian Defense": ("Black", 0, 1, 1, -1, -2, 1, 1),
    "Barnes Defense": ("Black", 0, 1, 0, -2, -2, 1, 1),
    "Barnes Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Basque Opening": ("White", -1, 0, -1, 0, -1, 1, 1),
    "Benko Gambit": ("Black", -1, 1, 1, 0, 1, 3, 2),
    "Benko Gambit Accepted": ("Black", -1, 1, 1, 0, 1, 3, 2),
    "Benko Gambit Declined": ("Black", -1, 0, 0, 0, 1, 3, 2),
    "Benoni Defense": ("Black", 2, 1, 2, 0, 1, 3, 2),
    "Bird Opening": ("White", 1, 1, 1, 0, 0, 2, 1),
    "Bishop's Opening": ("White", 0, 0, 0, 0, 0, 2, 1),
    "Blackmar-Diemer Gambit": ("White", 2, 2, 2, 1, -1, 2, 2),
    "Blackmar-Diemer Gambit Accepted": ("White", 2, 2, 2, 1, -1, 2, 2),
    "Blackmar-Diemer Gambit Declined": ("White", 1, 1, 1, 0, -1, 2, 2),
    "Blumenfeld Countergambit": ("Black", 1, 2, 1, 0, 0, 3, 2),
    "Blumenfeld Countergambit Accepted": ("Black", 1, 2, 2, 0, 0, 3, 2),
    "Bogo-Indian Defense": ("Black", -1, -1, -1, -1, 1, 2, 2),
    "Bongcloud Attack": ("White", 0, 2, 0, -2, -2, 1, 1),
    "Borg Defense": ("Black", 0, 1, 1, -2, -2, 1, 1),
    "Canard Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Caro-Kann Defense": ("Black", -1, -2, -2, -1, 2, 2, 2),
    "Carr Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Catalan Opening": ("White", -1, -1, 0, -1, 2, 4, 3),
    "Center Game": ("White", 1, 0, 1, 0, -1, 2, 1),
    "Center Game Accepted": ("White", 1, 0, 1, 0, -1, 2, 1),
    "Clemenz Opening": ("White", -1, 0, -1, 0, -2, 1, 1),
    "Colle System": ("White", -1, -1, -1, -1, 0, 1, 1),
    "Creepy Crawly Formation": ("White", -2, -1, -2, -1, -1, 1, 1),
    "Czech Defense": ("Black", -1, -1, -1, -1, 0, 2, 2),
    "Danish Gambit": ("White", 2, 2, 2, 1, -1, 2, 2),
    "Danish Gambit Accepted": ("White", 2, 2, 2, 1, -1, 2, 2),
    "Danish Gambit Declined": ("White", 1, 1, 1, 0, -1, 2, 2),
    "Dresden Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Duras Gambit": ("White", 1, 1, 1, 0, -2, 1, 1),
    "Dutch Defense": ("Black", 1, 1, 2, 1, 0, 3, 2),
    "Döry Defense": ("Black", 1, 1, 1, -1, -2, 2, 1),
    "East Indian Defense": ("Black", 1, 0, 1, 0, 0, 2, 2),
    "Elephant Gambit": ("Black", 1, 1, 1, 0, -1, 2, 1),
    "English Defense": ("Black", 0, 0, 1, 0, 0, 3, 2),
    "English Opening": ("White", 0, -1, 0, -1, 2, 3, 2),
    "English Orangutan": ("White", 0, 1, 1, 0, -1, 2, 1),
    "Englund Gambit": ("Black", 1, 2, 1, -1, -2, 1, 1),
    "Englund Gambit Declined": ("Black", 1, 1, 1, -1, -1, 1, 1),
    "Formation": ("White", 0, 0, 0, 0, 0, 2, 1),
    "Four Knights Game": ("White", -1, -1, -1, -1, 0, 2, 2),
    "French Defense": ("Black", -1, -1, -1, 0, 1, 2, 2),
    "Fried Fox Defense": ("Black", 0, 1, 0, -2, -2, 1, 1),
    "Global Opening": ("White", 0, 0, 0, 0, -1, 1, 1),
    "Goldsmith Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Grob Opening": ("White", 1, 2, 1, -2, -2, 1, 1),
    "Grünfeld Defense": ("Black", 1, 1, 2, 0, 2, 4, 3),
    "Gunderam Defense": ("Black", 0, 0, 0, -1, -2, 1, 1),
    "Hippopotamus Defense": ("Black", -1, -1, -1, -1, -1, 2, 1),
    "Horwitz Defense": ("Black", -1, -1, -1, -1, 0, 2, 1),
    "Hungarian Opening": ("White", -1, -1, -1, -1, 0, 2, 1),
    "Indian Defense": ("Black", 0, 0, 0, 0, 1, 2, 1),
    "Irish Gambit": ("White", 1, 2, 1, -1, -2, 1, 1),
    "Italian Game": ("White", 1, 0, 0, -1, 1, 1, 1),
    "Kangaroo Defense": ("Black", 0, 0, 0, 0, 0, 3, 2),
    "King's Gambit": ("White", 2, 2, 2, 1, -1, 2, 2),
    "King's Gambit Accepted": ("White", 2, 2, 2, 1, -1, 2, 2),
    "King's Gambit Declined": ("White", 1, 1, 1, 0, -1, 2, 2),
    "King's Indian Attack": ("White", 0, 0, 1, -1, 1, 2, 2),
    "King's Indian Attack, with Bf5": ("White", 0, 0, 1, -1, 1, 2, 2),
    "King's Indian Attack, with e6": ("White", 0, 0, 1, -1, 1, 2, 2),
    "King's Indian Defense": ("Black", 2, 2, 2, 2, 0, 4, 3),
    "King's Knight Opening": ("White", -1, -1, -1, -1, 1, 1, 1),
    "King's Pawn Game": ("White", 0, 0, 0, 0, 1, 1, 1),
    "King's Pawn Opening": ("White", 0, 0, 0, 0, 1, 1, 1),
    "Kádas Opening": ("White", -1, 0, -1, 0, -2, 1, 1),
    "Lasker Simul Special": ("White", 0, 0, 0, 0, -1, 1, 1),
    "Latvian Gambit": ("Black", 2, 2, 2, -2, -1, 3, 2),
    "Latvian Gambit Accepted": ("Black", 2, 2, 2, -2, -1, 3, 2),
    "Lemming Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Lion Defense": ("Black", -1, -1, -1, -1, 0, 2, 2),
    "London System": ("White", -1, -1, -1, -1, 1, 1, 1),
    "London System, with Bd3": ("White", -1, -1, -1, -1, 1, 1, 1),
    "London System, with Be2": ("White", -1, -1, -1, -1, 1, 1, 1),
    "Marienbad System": ("White", -1, -1, -1, -1, 0, 2, 2),
    "Mexican Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Mieses Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Mikenas Defense": ("Black", 0, 0, 0, 0, -1, 2, 1),
    "Modern Defense": ("Black", 1, 1, 1, 0, 0, 3, 2),
    "Montevideo Defense": ("Black", 0, 0, 0, -1, -2, 1, 1),
    "Neo-Grünfeld Defense": ("Black", 1, 1, 1, 0, 1, 3, 2),
    "Nimzo-Indian Defense": ("Black", -1, -1, 0, -1, 2, 4, 3),
    "Nimzo-Larsen Attack": ("White", -1, -1, -1, -1, 1, 2, 2),
    "Nimzowitsch Defense": ("Black", 0, 1, 1, -1, -1, 2, 1),
    "Old Indian Defense": ("Black", -1, -1, -1, -1, 0, 2, 2),
    "Owen Defense": ("Black", 0, 0, 0, 0, -1, 2, 1),
    "Paleface Attack": ("White", 0, 0, 0, 0, -1, 1, 1),
    "Petrov's Defense": ("Black", -1, -2, -2, -1, 2, 3, 3),
    "Philidor Defense": ("Black", -1, -1, -1, -1, 0, 2, 2),
    "Pirc Defense": ("Black", 1, 0, 1, 0, 0, 3, 2),
    "Polish Defense": ("Black", 0, 1, 1, -1, -2, 2, 1),
    "Polish Opening": ("White", 0, 1, 1, -1, -1, 2, 1),
    "Polish Opening, with d5": ("White", 0, 1, 1, -1, -1, 2, 1),
    "Ponziani Opening": ("White", 0, 0, 0, -1, 0, 2, 2),
    "Portuguese Opening": ("White", 0, 1, 1, -1, -1, 1, 1),
    "Pseudo Queen's Indian Defense": ("Black", -1, -1, -1, -1, 0, 2, 2),
    "Pterodactyl Defense": ("Black", 1, 1, 1, -1, -1, 3, 2),
    "Queen's Gambit": ("White", -1, -1, -1, -1, 2, 3, 2),
    "Queen's Gambit Accepted": ("White", -1, -1, 0, -1, 2, 3, 2),
    "Queen's Gambit Declined": ("White", -1, -1, -1, -1, 2, 3, 3),
    "Queen's Indian Accelerated": ("Black", -1, -1, -1, -1, 1, 3, 2),
    "Queen's Indian Defense": ("Black", -1, -1, -1, -1, 1, 3, 2),
    "Queen's Indian Defense, with e3": ("Black", -1, -1, -1, -2, 1, 2, 2),
    "Queen's Indian Defense, with e3, Bb4+ Line": ("Black", -1, -1, -1, -2, 1, 2, 2),
    "Queen's Pawn Game": ("White", 0, 0, 0, 0, 1, 1, 1),
    "Queen's Pawn, Mengarini Attack": ("White", 0, 0, 0, 0, -2, 1, 1),
    "Rapport-Jobava System": ("White", 1, 1, 1, 0, 1, 3, 2),
    "Rapport-Jobava System, with e6": ("White", 1, 1, 1, 0, 1, 3, 2),
    "Rat Defense": ("Black", 0, 0, 0, 0, -1, 2, 1),
    "Richter-Veresov Attack": ("White", 1, 1, 1, 0, 0, 2, 2),
    "Robatsch Defense": ("Black", 1, 1, 1, 0, 0, 3, 2),
    "Rubinstein Opening": ("White", -1, -1, -1, -1, 0, 2, 2),
    "Ruy Lopez": ("White", -1, -1, 0, 0, 2, 4, 3),
    "Réti Opening": ("White", -1, -1, 0, -1, 1, 2, 2),
    "Saragossa Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Scandinavian Defense": ("Black", 0, -1, -1, -2, -1, 1, 1),
    "Scotch Game": ("White", 1, 0, 1, 0, 1, 2, 2),
    "Semi-Slav Defense": ("Black", 0, 0, 0, -1, 2, 4, 3),
    "Semi-Slav Defense Accepted": ("Black", 0, 0, 0, -1, 2, 4, 3),
    "Sicilian Defense": ("Black", 2, 2, 2, 2, 2, 4, 3),
    "Slav Defense": ("Black", -2, -2, -2, -1, 2, 2, 2),
    "Slav Indian": ("Black", -1, -1, -1, -1, 0, 3, 2),
    "Sodium Attack": ("White", 0, 0, 0, 0, -1, 2, 1),
    "St. George Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Tarrasch Defense": ("Black", 1, 1, 1, 0, 1, 3, 2),
    "Three Knights Opening": ("White", -1, -1, -1, -1, 0, 2, 1),
    "Torre Attack": ("White", -1, -1, -1, -1, 1, 2, 2),
    "Trompowsky Attack": ("White", 0, 1, 1, 0, 1, 2, 2),
    "Valencia Opening": ("White", 0, 0, 0, 0, -1, 1, 1),
    "Van Geet Opening": ("White", 0, 0, 0, 0, -1, 1, 1),
    "Van't Kruijs Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Vienna Gambit, with Max Lange Defense": ("White", 1, 1, 1, 0, 0, 2, 2),
    "Vienna Game": ("White", 0, 0, 0, 0, 0, 2, 2),
    "Vulture Defense": ("Black", 1, 1, 1, -1, -2, 2, 1),
    "Wade Defense": ("Black", 0, 0, 0, 0, -1, 2, 1),
    "Ware Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Ware Opening": ("White", -1, 0, -1, 0, -2, 1, 1),
    "Yusupov-Rubinstein System": ("White", -1, -1, -1, -1, 1, 3, 2),
    "Zaire Defense": ("Black", 0, 0, 0, -1, -2, 1, 1),
    "Zukertort Defense": ("Black", 0, 0, 0, 0, -1, 2, 1),
    "Zukertort Opening": ("White", -1, -1, -1, -1, 1, 2, 2),
}

ALL_TIME_CONTROLS = ["Bullet/Blitz", "Rapid", "Classical/Correspondence"]
NO_BLITZ = ["Rapid", "Classical/Correspondence"]

# ---- per-family research-backed content -----------------------------------
# Populated per wayfinder/tickets/0005-catalog-rescoring-schema-and-process.md:
# `overview` is reasoned chess-domain analysis; `reputationNotes` is
# research-backed (cited sources gathered per family before writing). Every
# key in FAMILY_TAGS must eventually have an entry in both dicts below —
# enforced in build_catalog(). Populated incrementally, one ECO-volume ticket
# at a time (wayfinder/tickets/0006..0010-rescore-volume-*.md).
FAMILY_OVERVIEW = {
    "Blumenfeld Countergambit": (
        "The Blumenfeld Countergambit (1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nf3 b5) is a sharp reply "
        "to the Queen's Pawn Game in which Black offers a queenside pawn to build an "
        "imposing pawn center (c5/d5/e6-type structures) and open lines for the bishop on "
        "b7 and a half-open f-file. That mix of central space and open lines for Black's "
        "pieces is why it earns tactical, initiative-seeking tags rather than a purely "
        "positional label, though White's extra material makes the resulting middlegame "
        "genuinely double-edged rather than one-sided in Black's favor."
    ),
    "Blumenfeld Countergambit Accepted": (
        "After 4...b5 5.dxe6 fxe6 6.cxb5, Black concretely gives up the b5-pawn to complete "
        "the same central-domination plan the Blumenfeld aims for, ending up with a strong "
        "pawn center and open f-file compensation against White's extra queenside pawn. It "
        "is the most direct, most tested branch of the Blumenfeld complex and inherits the "
        "family's dynamic, initiative-based compensation in sharper, more concrete form, "
        "since the material has actually changed hands rather than merely being offered."
    ),
    "Bogo-Indian Defense": (
        "The Bogo-Indian Defense (1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+) arises when White meets the "
        "Indian setup with Nf3 instead of Nc3, sidestepping the Nimzo-Indian; Black's early "
        "check invites White to block with Bd2 or Nbd2, after which Black settles for solid "
        "development rather than the sharper imbalances of the Nimzo. It plays as a calmer, "
        "lower-maintenance cousin of the Nimzo-Indian, trading away some of that opening's "
        "dynamic potential for structural simplicity and a straightforward plan."
    ),
    "Catalan Opening": (
        "The Catalan Opening (1.d4 Nf6 2.c4 e6 3.g3) combines Queen's Gambit-style central "
        "play with a kingside fianchetto of the king's bishop, aiming the long diagonal at "
        "Black's queenside while keeping White's own king safe. Against the Open Catalan "
        "(...dxc4) White accepts a long-term struggle to regain the pawn with lasting "
        "positional pressure, while the Closed Catalan gives Black a solid but somewhat "
        "cramped position; that blend of patient strategic squeezing with sharp, concrete "
        "theory around the c4 pawn is why it earns both positional and genuinely deep tags."
    ),
    "King's Indian Defense": (
        "The King's Indian Defense (1.d4 Nf6 2.c4 g6) is the quintessential hypermodern "
        "reply to 1.d4: Black lets White build a full pawn center and then attacks it with "
        "pieces and pawn breaks, most famously racing pawn storms on opposite wings after "
        "...O-O, ...e5, or ...c5. Because the resulting middlegames are built around "
        "opposite-side attacking plans and committal pawn breaks rather than gradual "
        "maneuvering, the family earns some of the sharpest, most dynamic, and most "
        "consequential tags of any defense in the catalog — a single lost tempo in the race "
        "can decide the game outright."
    ),
    "Nimzo-Indian Defense": (
        "The Nimzo-Indian Defense (1.d4 Nf6 2.c4 e6 3.Nc3 Bb4), developed by Aron "
        "Nimzowitsch, pins White's knight on c3 to deter e4 and typically trades the bishop "
        "for that knight, handing White the bishop pair but saddling White with doubled "
        "c-pawns that Black targets with light-square pressure and eventual blockade. That "
        "core trade-off — durable structural damage to White for the loss of Black's own "
        "bishop pair — makes it one of the most strategically rich, thoroughly explored "
        "defenses to 1.d4, which is reflected in its depth and rating tags."
    ),
    "Queen's Indian Defense": (
        "The Queen's Indian Defense (1.d4 Nf6 2.c4 e6 3.Nf3 b6) is Black's hypermodern "
        "answer when White avoids Nc3, fianchettoing the queen's bishop to contest the key "
        "light squares e4 and d5 with pieces rather than pawns. It is built for solidity "
        "rather than imbalance — Black isn't trying to seize the initiative so much as "
        "neutralize White's center and reach a comfortable, roughly equal middlegame — "
        "which is why it earns consistently modest, low-risk tags across the board."
    ),
    "Queen's Indian Defense, with e3": (
        "This branch covers White meeting the Queen's Indian setup with a modest e3 rather "
        "than the sharper kingside fianchetto (g3), developing quietly with Bd3, O-O, and "
        "c4 rather than fighting for the long diagonal. For Black this removes some of the "
        "sharper theoretical debates found in the main Queen's Indian (like the "
        "Kasparov-Petrosian 4.a3 lines) in favor of a calmer, more maneuvering game, which "
        "is why it reads as even more solid and less demanding than the family's core lines."
    ),
    "Queen's Indian Defense, with e3, Bb4+ Line": (
        "Here Black interpolates ...Bb4+ before ...b6 (1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+ 4.Nbd2 "
        "b6 5.e3 Bb7), forcing White's knight to the slightly passive d2 square before "
        "transposing into the same quiet e3 structures as the rest of this branch. The "
        "extra check is a minor move-order refinement rather than a change in character, so "
        "it inherits the calm, low-risk profile of the broader e3 systems it feeds into."
    ),
    "Queen's Pawn, Mengarini Attack": (
        "The Mengarini Attack (1.d4 Nf6 2.c4 g6 3.Qc2) brings White's queen out early "
        "against a King's Indian-style setup, most often preparing a quick e4 without first "
        "committing the knight to c3. Bringing the queen out this early runs against "
        "ordinary opening principles (development, king safety) without buying enough "
        "concrete compensation, which is why it earns some of the lowest health and rating "
        "tags in the catalog."
    ),
}
FAMILY_REPUTATION = {
    "Blumenfeld Countergambit": (
        "Named for Russian master Benjamin Blumenfeld and later adopted by World Champion "
        "Alexander Alekhine, it has real historical pedigree, but it has never become a "
        "mainstream weapon and is rarely seen in contemporary elite practice; treat it as a "
        "specialist surprise weapon rather than a default choice against 1.d4 (Wikipedia's "
        "Blumenfeld Gambit article)."
    ),
    "Blumenfeld Countergambit Accepted": (
        "This is the branch that actually tests whether Black's compensation is real, since "
        "White has banked the extra pawn; it's regarded as sound rather than refuted, but "
        "engines show White can consolidate with careful play, so it remains a niche choice "
        "for players who enjoy playing pawn-down for durable, long-term initiative."
    ),
    "Bogo-Indian Defense": (
        "Long considered a fully sound, if slightly modest, alternative to the Nimzo-Indian "
        "— it has been used by Nimzowitsch, Keres, Petrosian, Smyslov, and Korchnoi, and "
        "more recently by Michael Adams and Nikita Vitiugov (per Wikipedia's Bogo-Indian "
        "Defence article) — but databases cited there show it played only about half as "
        "often as the Queen's Indian, reflecting its status as a solid backup rather than a "
        "primary weapon."
    ),
    "Catalan Opening": (
        "Far from a niche sideline, the Catalan is a current top-level mainstay: Kramnik, "
        "Anand, and Carlsen have all used it in world championship play, and Carlsen made "
        "it his primary weapon against 1...Nf6/e6 setups in the late 2010s, alongside "
        "regular use by Caruana and Dubov (per Wikipedia's Catalan Opening article) — it is "
        "as healthy at the very top today as it has ever been."
    ),
    "King's Indian Defense": (
        "The King's Indian has a genuinely up-and-down reputation at the very top: per "
        "Wikipedia's King's Indian Defence article it was the main weapon of Fischer, "
        "Kasparov, and Tal, but Kasparov largely abandoned it after repeated losses to "
        "Kramnik's calm handling in the early 2000s; it has since recovered in the hands of "
        "Nakamura, Radjabov, and Ding Liren (with Kramnik himself scoring a notable win with "
        "it in 2012), so it's best described as a fully viable but high-variance choice "
        "whose top-level fortunes swing with current theory rather than a settled, "
        "always-safe mainstay."
    ),
    "Nimzo-Indian Defense": (
        "It is about as healthy as an opening gets: per Wikipedia's Nimzo-Indian Defence "
        "article it has been played by every world champion since Capablanca, and both main "
        "tries against it (4.e3 Rubinstein and 4.Qc2, revived heavily in the 1990s and now "
        "just as popular) remain fully respected at the top; its reputation is strong enough "
        "that many White players now reach for 3.Nf3 or 3.g3 specifically to sidestep it."
    ),
    "Queen's Indian Defense": (
        "Often called the Nimzo-Indian's 'sister opening' (per Wikipedia's Queen's Indian "
        "Defense article), the classical 4...Bb7 line is well known for its drawish "
        "reputation and has long been used by Black specifically as a safe way to hold with "
        "the black pieces; the more ambitious 4...Ba6 became the topical main line in the "
        "1980s and remains the more fashionable modern try, but the family's core identity "
        "as a rock-solid, slightly passive defense hasn't changed."
    ),
    "Queen's Indian Defense, with e3": (
        "Named lines like the Spassky System (4.e3) show it has genuine elite pedigree, but "
        "it's generally regarded as White's quieter, lower-pressure try rather than a "
        "critical theoretical test — a practical choice for players who want a safe, simple "
        "game rather than a fight for the advantage."
    ),
    "Queen's Indian Defense, with e3, Bb4+ Line": (
        "It's a common practical device for Black to reach the e3 Queen's Indian structures "
        "on favorable terms (denying White the option of meeting ...Bb4+ later with a3) "
        "rather than an independent theoretical battleground in its own right."
    ),
    "Queen's Pawn, Mengarini Attack": (
        "It is essentially unseen in serious modern practice — a curiosity move order "
        "rather than a tested weapon — and is best understood as an offbeat try for players "
        "looking to dodge mainstream King's Indian/Grünfeld theory rather than a line with "
        "any real independent reputation."
    ),
}

# ---- promoted sub-variations ----------------------------------------------
# key: the *exact* row name as it appears in the lichess-org/chess-openings
# dataset (e.g. "Sicilian Defense: Najdorf Variation"). value: a dict that can
# override any subset of the derived per-row fields (style/rating/depth/
# overview/reputationNotes/etc.) — used when a sub-variation is promoted to
# its own investigation per ticket 0005's tiering rule, instead of inheriting
# its family's values verbatim.
NOTABLE_SUBVARIATIONS = {
    "Bogo-Indian Defense: Monticelli Trap": {
        "overview": (
            "The Monticelli Trap (1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Bb7 5.Bg2 Bb4+ 6.Bd2 Bxd2+ "
            "7.Qxd2 O-O 8.Nc3 Ne4 9.Qc2 Nxc3 10.Ng5!) is a concrete tactical trick hiding "
            "inside an otherwise placid Bogo-Indian move order: after Black grabs the knight "
            "on c3, White's queen and knight combine to win material (10.Ng5 hits h7 and the "
            "loose knight) unless Black has memorized the refutation. It is a sharp tactical "
            "pocket embedded in a family that is otherwise about quiet, positional development."
        ),
        "reputationNotes": (
            "It's a known trap for the underprepared rather than a real theoretical "
            "battleground — strong players simply avoid taking on c3 in this move order, so "
            "it mostly claims scalps at club level rather than shaping grandmaster praxis."
        ),
        "tacticalVsPositional": 2,
        "riskTolerance": 1,
        "dynamicVsStatic": 1,
        "forgivingVsPunishing": 2,
        "healthAtHigherLevels": -1,
        "ratingBand": 2,
    },
    "Catalan Opening: Hungarian Gambit": {
        "overview": (
            "The Hungarian Gambit (1.d4 Nf6 2.c4 e6 3.g3 e5!?) is Black's attempt to strike "
            "back in the center with ...e5 before White's fianchetto is complete, offering a "
            "pawn for quick development and activity rather than allowing the normal Catalan "
            "bind to take hold. It flips the Catalan's usual script — instead of White "
            "grinding structurally, Black tries to seize the initiative immediately, making "
            "this line noticeably sharper and more tactical than the rest of the family."
        ),
        "reputationNotes": (
            "It's a rare, surprise-value try rather than a respected main line — accurate "
            "play lets White simply keep the extra pawn with a comfortable position, so it "
            "shows up occasionally as a blitz/rapid weapon but has little standing in "
            "serious top-level theory."
        ),
        "tacticalVsPositional": 1,
        "riskTolerance": 1,
        "dynamicVsStatic": 1,
        "forgivingVsPunishing": 1,
        "healthAtHigherLevels": -1,
        "ratingBand": 3,
    },
    "King's Indian Defense: Sämisch Variation": {
        "overview": (
            "The Sämisch Variation (5.f3, aiming for Be3, Qd2, and long castling) is White's "
            "most uncompromising try against the King's Indian, using f3 to support an "
            "e4-based center and setting up an unapologetic queenside-vs-kingside pawn-storm "
            "race once both sides castle on opposite wings. It represents the sharpest, most "
            "opposite-castling-committed expression of the King's Indian's already-dynamic "
            "character."
        ),
        "reputationNotes": (
            "It has been played by a remarkable run of world champions — Botvinnik, Tal, "
            "Petrosian, Spassky, Karpov, and Kasparov all used it — and remains one of the "
            "critical main tries against the King's Indian, prized by attacking players "
            "willing to accept that one slow move in the resulting race can be fatal for "
            "either side."
        ),
        "tacticalVsPositional": 2,
        "riskTolerance": 2,
        "dynamicVsStatic": 2,
        "forgivingVsPunishing": 2,
        "healthAtHigherLevels": 1,
        "ratingBand": 4,
    },
    "King's Indian Defense: Four Pawns Attack": {
        "overview": (
            "The Four Pawns Attack (5.f4) is White's most territorially ambitious try "
            "against the King's Indian, grabbing a four-pawn center (c4/d4/e4/f4) in the "
            "hope of overwhelming Black before development catches up. It's the single most "
            "extreme, highest-risk expression of the whole King's Indian complex — for White "
            "it's all-or-nothing central space, and for Black it's a standing invitation to "
            "counterattack the center before it consolidates."
        ),
        "reputationNotes": (
            "It has a reputation as objectively double-edged rather than simply strong: "
            "well-prepared Black players are generally considered to equalize or better by "
            "hitting the overextended center quickly, which is why it appears far less often "
            "at elite level than the calmer Fianchetto or the classical main lines, even "
            "though it remains a fully respectable practical try at club and master level."
        ),
        "tacticalVsPositional": 2,
        "riskTolerance": 2,
        "dynamicVsStatic": 2,
        "forgivingVsPunishing": 2,
        "healthAtHigherLevels": -1,
        "ratingBand": 4,
    },
    "King's Indian Defense: Fianchetto Variation": {
        "overview": (
            "The Fianchetto Variation (3.Nf3 Bg7 4.g3, or the same setup via 3.g3) meets the "
            "King's Indian with White's own kingside fianchetto, aiming for a solid, "
            "flexible structure that blunts Black's usual kingside pawn-storm dreams and "
            "instead steers the game toward long, patient strategic maneuvering. It is a "
            "deliberately calmer, more positional counterpoint to the King's Indian family's "
            "typically explosive character."
        ),
        "reputationNotes": (
            "It is described as the single most popular try against the King's Indian at "
            "grandmaster level today, valued precisely because it avoids the wild "
            "opposite-side races of the Sämisch or Classical lines while still posing Black "
            "real long-term problems — a strategic choice for White players who want an edge "
            "without a coin flip."
        ),
        "tacticalVsPositional": -1,
        "riskTolerance": -1,
        "dynamicVsStatic": 0,
        "forgivingVsPunishing": -1,
        "healthAtHigherLevels": 2,
        "ratingBand": 4,
    },
}


def fetch_tsv_rows():
    rows = []
    for volume in ECO_VOLUMES:
        url = BASE_URL.format(volume)
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                text = resp.read().decode("utf-8")
        except urllib.error.URLError as exc:
            raise SystemExit(f"Failed to fetch {url}: {exc}")
        lines = text.split("\n")
        for line in lines[1:]:  # skip header row
            if not line.strip():
                continue
            eco, name, pgn = line.split("\t")
            rows.append({"eco": eco, "name": name, "pgn": pgn})
        time.sleep(REQUEST_DELAY_SECONDS)
    return rows


def family_root(name):
    return name.split(":", 1)[0].strip()


def variation_depth(name):
    if ":" not in name:
        return 0
    _, rest = name.split(":", 1)
    return 1 + rest.count(",")


def ply_count(pgn):
    tokens = pgn.split()
    return sum(1 for t in tokens if not re.match(r"^\d+\.$", t))


def derive_row_fields(root_tags, name, pgn, root, overview=None, reputation_notes=None):
    (color, tactical, risk, dynamic, forgiving, health, rating_base, depth_base) = root_tags
    v_depth = variation_depth(name)
    plies = ply_count(pgn)
    if overview is None:
        overview = FAMILY_OVERVIEW.get(root)
    if reputation_notes is None:
        reputation_notes = FAMILY_REPUTATION.get(root)

    # Depth tracks the actual move-sequence length first (a real proxy for how
    # much there is to memorize), nudged by the family's baseline reputation
    # and by unusually deep (3+ level) named sub-variations.
    plies_bucket = 1 if plies <= 4 else (2 if plies <= 10 else 3)
    depth_num = plies_bucket + (depth_base - 2) + (1 if v_depth >= 3 else 0)
    depth_num = max(1, min(3, depth_num))
    depth_label = DEPTH_LABELS[depth_num]

    # Rating band mostly comes from the family baseline; a row that runs
    # deeper (or shallower) than its family's norm shifts the band with it.
    rating_band = rating_base + (depth_num - depth_base) + (1 if plies > 18 else 0)
    rating_band = max(1, min(5, rating_band))

    if depth_num == 1:
        hours = round(5 + plies * 0.3)
    elif depth_num == 2:
        hours = round(12 + plies * 1.0 + v_depth * 5)
    else:
        hours = round(40 + plies * 3 + v_depth * 5)

    time_controls = NO_BLITZ if depth_num == 3 else ALL_TIME_CONTROLS

    return {
        "color": color,
        "depthOfTheory": depth_label,
        "timeControls": time_controls,
        "ratingBand": rating_band,
        "style": {
            "tacticalVsPositional": tactical,
            "riskTolerance": risk,
            "dynamicVsStatic": dynamic,
            "forgivingVsPunishing": forgiving,
        },
        "healthAtHigherLevels": health,
        "estimatedHoursToCompetency": hours,
        "overview": overview,
        "reputationNotes": reputation_notes,
    }


def build_catalog(rows, require_content=True):
    families = sorted({family_root(r["name"]) for r in rows})
    missing_families = sorted(set(families) - set(FAMILY_TAGS))
    if missing_families:
        raise SystemExit(
            "FAMILY_TAGS is missing entries for: " + ", ".join(missing_families)
        )
    if require_content:
        missing_overview = sorted(f for f in families if not FAMILY_OVERVIEW.get(f))
        missing_reputation = sorted(f for f in families if not FAMILY_REPUTATION.get(f))
        if missing_overview:
            raise SystemExit(
                "FAMILY_OVERVIEW is missing entries for: " + ", ".join(missing_overview)
            )
        if missing_reputation:
            raise SystemExit(
                "FAMILY_REPUTATION is missing entries for: " + ", ".join(missing_reputation)
            )

    openings = []
    for row in rows:
        root = family_root(row["name"])
        override = NOTABLE_SUBVARIATIONS.get(row["name"], {})
        fields = derive_row_fields(
            FAMILY_TAGS[root],
            row["name"],
            row["pgn"],
            root,
            overview=override.get("overview"),
            reputation_notes=override.get("reputationNotes"),
        )
        fields.update({k: v for k, v in override.items() if k not in ("overview", "reputationNotes")})
        openings.append({
            "eco": row["eco"],
            "name": row["name"],
            "color": fields["color"],
            "pgn": row["pgn"],
            "depthOfTheory": fields["depthOfTheory"],
            "timeControls": fields["timeControls"],
            "ratingBand": fields["ratingBand"],
            "style": fields["style"],
            "healthAtHigherLevels": fields["healthAtHigherLevels"],
            "estimatedHoursToCompetency": fields["estimatedHoursToCompetency"],
            "overview": fields["overview"],
            "reputationNotes": fields["reputationNotes"],
        })
    return openings


def main():
    field_conventions = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))["_fieldConventions"]
    rows = fetch_tsv_rows()
    openings = build_catalog(rows)

    catalog = {
        "_fieldConventions": field_conventions,
        "_provenance": (
            "Structural facts (eco/name/pgn) sourced live from lichess-org/chess-openings "
            "(CC0-1.0) by scripts/build_opening_catalog.py. Tags (depthOfTheory, timeControls, "
            "ratingBand, style, healthAtHigherLevels, estimatedHoursToCompetency) are "
            "hand-authored per opening *family* (see FAMILY_TAGS in the script) using standard "
            "chess-theory knowledge, then derived per-row from move length and sub-variation "
            "depth — bulk/pattern-based tagging across the full ECO catalog, not individually "
            "reasoned per row. Not independently spot-checked line-by-line. The small curated "
            "sample in opening-sample.json remains the spec's hand-verified validation set."
        ),
        "openings": openings,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(openings)} openings to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
