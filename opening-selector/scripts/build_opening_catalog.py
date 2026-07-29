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
    "Blumenfeld Countergambit": ("Black", 1, 1, 1, 0, 0, 3, 2),
    "Blumenfeld Countergambit Accepted": ("Black", 1, 1, 1, 0, 0, 3, 2),
    "Bogo-Indian Defense": ("Black", -1, -1, -1, -1, 1, 2, 2),
    "Bongcloud Attack": ("White", 0, 2, 0, -2, -2, 1, 1),
    "Borg Defense": ("Black", 0, 1, 1, -2, -2, 1, 1),
    "Canard Opening": ("White", -1, -1, -1, 0, -1, 1, 1),
    "Caro-Kann Defense": ("Black", -1, -2, -2, -1, 2, 2, 2),
    "Carr Defense": ("Black", 0, 1, 0, -1, -2, 1, 1),
    "Catalan Opening": ("White", -1, -1, 0, 0, 2, 4, 3),
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
    "King's Indian Defense": ("Black", 2, 1, 2, 1, 1, 4, 3),
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
    "Nimzo-Indian Defense": ("Black", -1, -1, 0, -1, 2, 3, 2),
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
    "Queen's Indian Defense, with e3": ("Black", -1, -1, -1, -1, 1, 3, 2),
    "Queen's Indian Defense, with e3, Bb4+ Line": ("Black", -1, -1, -1, -1, 1, 3, 2),
    "Queen's Pawn Game": ("White", 0, 0, 0, 0, 1, 1, 1),
    "Queen's Pawn, Mengarini Attack": ("White", 0, 0, 0, 0, -1, 1, 1),
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


def derive_row_fields(root_tags, name, pgn):
    (color, tactical, risk, dynamic, forgiving, health, rating_base, depth_base) = root_tags
    v_depth = variation_depth(name)
    plies = ply_count(pgn)

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
    }


def build_catalog(rows):
    missing_families = sorted({family_root(r["name"]) for r in rows} - set(FAMILY_TAGS))
    if missing_families:
        raise SystemExit(
            "FAMILY_TAGS is missing entries for: " + ", ".join(missing_families)
        )

    openings = []
    for row in rows:
        root = family_root(row["name"])
        fields = derive_row_fields(FAMILY_TAGS[root], row["name"], row["pgn"])
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
