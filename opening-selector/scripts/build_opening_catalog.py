#!/usr/bin/env python3
"""Builds wayfinder/assets/opening-catalog.json — the full ECO A-E dataset
(~3800 rows) from lichess-org/chess-openings (CC0), tagged for the Wayfinder
recommender schema (wayfinder/tickets/0004-opening-data-schema.md).

Style/rating/depth/health tags do not exist as structured data anywhere
(wayfinder/tickets/0001), so they're hand-authored at the *family* level
(the ~150 root opening names the whole ECO catalog is built from, e.g. every
"Sicilian Defense: ..." row inherits the Sicilian's tags) in
scripts/family_data/volume_{a,b,c,d,e}.py — one file per ECO-volume ticket
(wayfinder/tickets/0006..0010), being re-researched per
wayfinder/tickets/0005-catalog-rescoring-schema-and-process.md rather than
bulk-copied. Per-row depthOfTheory/ratingBand/timeControls/hours are then
derived from each row's move length and sub-variation depth relative to its
family's baseline; a promoted sub-variation (NOTABLE_SUBVARIATIONS) can
override any of that per the same ticket's tiering rule.
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
# Split across scripts/family_data/volume_{a,b,c,d,e}.py (one file per ECO
# volume ticket 0006..0010) so parallel re-scoring work never conflicts on a
# shared dict — see that package's __init__.py for how the volumes merge.
from family_data import FAMILY_TAGS

ALL_TIME_CONTROLS = ["Bullet/Blitz", "Rapid", "Classical/Correspondence"]
NO_BLITZ = ["Rapid", "Classical/Correspondence"]

# ---- per-family research-backed content -----------------------------------
# `overview` is reasoned chess-domain analysis; `reputationNotes` is
# research-backed (cited sources gathered per family before writing). Every
# key in FAMILY_TAGS must eventually have an entry in both dicts below —
# enforced in build_catalog(). Also split by ECO volume, same as FAMILY_TAGS
# above (wayfinder/tickets/0005-catalog-rescoring-schema-and-process.md).
from family_data import FAMILY_OVERVIEW, FAMILY_REPUTATION, NOTABLE_SUBVARIATIONS



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
