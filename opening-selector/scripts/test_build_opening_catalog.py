import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_opening_catalog as boc


FAKE_ROWS = [
    {"eco": "B90", "name": "Sicilian Defense", "pgn": "1. e4 c5"},
    {
        "eco": "B90",
        "name": "Sicilian Defense: Najdorf Variation",
        "pgn": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
    },
    {
        "eco": "B90",
        "name": "Sicilian Defense: Najdorf Variation, English Attack",
        "pgn": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3",
    },
    {"eco": "A00", "name": "Amar Opening", "pgn": "1. Nh3"},
]


@pytest.fixture
def restore_family_dicts():
    """FAMILY_TAGS/OVERVIEW/REPUTATION/NOTABLE_SUBVARIATIONS are module-level
    and mutated by tests; restore them so tests don't leak into each other."""
    tags, overview, reputation, notable = (
        dict(boc.FAMILY_TAGS),
        dict(boc.FAMILY_OVERVIEW),
        dict(boc.FAMILY_REPUTATION),
        dict(boc.NOTABLE_SUBVARIATIONS),
    )
    yield
    boc.FAMILY_TAGS.clear()
    boc.FAMILY_TAGS.update(tags)
    boc.FAMILY_OVERVIEW.clear()
    boc.FAMILY_OVERVIEW.update(overview)
    boc.FAMILY_REPUTATION.clear()
    boc.FAMILY_REPUTATION.update(reputation)
    boc.NOTABLE_SUBVARIATIONS.clear()
    boc.NOTABLE_SUBVARIATIONS.update(notable)


def test_family_root_strips_at_first_colon():
    assert boc.family_root("Sicilian Defense: Najdorf Variation") == "Sicilian Defense"
    assert boc.family_root("Amar Opening") == "Amar Opening"


def test_every_current_family_has_an_overview(restore_family_dicts):
    missing = sorted(f for f in boc.FAMILY_TAGS if not boc.FAMILY_OVERVIEW.get(f))
    assert missing == [], (
        f"{len(missing)} of {len(boc.FAMILY_TAGS)} families still lack an `overview` "
        "(see wayfinder/tickets/0006..0010-rescore-volume-*.md)"
    )


def test_every_current_family_has_reputation_notes(restore_family_dicts):
    missing = sorted(f for f in boc.FAMILY_TAGS if not boc.FAMILY_REPUTATION.get(f))
    assert missing == [], (
        f"{len(missing)} of {len(boc.FAMILY_TAGS)} families still lack `reputationNotes` "
        "(see wayfinder/tickets/0006..0010-rescore-volume-*.md)"
    )


def test_build_catalog_raises_when_content_missing(restore_family_dicts):
    boc.FAMILY_TAGS.clear()
    boc.FAMILY_TAGS["Sicilian Defense"] = ("Black", 2, 2, 2, 2, 2, 4, 3)
    boc.FAMILY_OVERVIEW.clear()
    boc.FAMILY_REPUTATION.clear()
    with pytest.raises(SystemExit, match="FAMILY_OVERVIEW"):
        boc.build_catalog([FAKE_ROWS[0]])


def test_build_catalog_succeeds_once_content_present(restore_family_dicts):
    boc.FAMILY_TAGS.clear()
    boc.FAMILY_TAGS["Sicilian Defense"] = ("Black", 2, 2, 2, 2, 2, 4, 3)
    boc.FAMILY_OVERVIEW.clear()
    boc.FAMILY_OVERVIEW["Sicilian Defense"] = "A sharp, combative reply to 1.e4."
    boc.FAMILY_REPUTATION.clear()
    boc.FAMILY_REPUTATION["Sicilian Defense"] = "A mainstay at every level."
    boc.NOTABLE_SUBVARIATIONS.clear()

    openings = boc.build_catalog([FAKE_ROWS[0]])

    assert openings[0]["overview"] == "A sharp, combative reply to 1.e4."
    assert openings[0]["reputationNotes"] == "A mainstay at every level."


def test_non_promoted_subvariation_inherits_family_overview_verbatim(restore_family_dicts):
    boc.FAMILY_TAGS.clear()
    boc.FAMILY_TAGS["Sicilian Defense"] = ("Black", 2, 2, 2, 2, 2, 4, 3)
    boc.FAMILY_OVERVIEW.clear()
    boc.FAMILY_OVERVIEW["Sicilian Defense"] = "A sharp, combative reply to 1.e4."
    boc.FAMILY_REPUTATION.clear()
    boc.FAMILY_REPUTATION["Sicilian Defense"] = "A mainstay at every level."
    boc.NOTABLE_SUBVARIATIONS.clear()

    openings = boc.build_catalog([FAKE_ROWS[0], FAKE_ROWS[1]])

    root_overview = openings[0]["overview"]
    child_overview = openings[1]["overview"]
    assert child_overview == root_overview
    assert child_overview == "A sharp, combative reply to 1.e4."


def test_promoted_subvariation_overrides_inherited_fields(restore_family_dicts):
    boc.FAMILY_TAGS.clear()
    boc.FAMILY_TAGS["Sicilian Defense"] = ("Black", 2, 2, 2, 2, 2, 4, 3)
    boc.FAMILY_OVERVIEW.clear()
    boc.FAMILY_OVERVIEW["Sicilian Defense"] = "A sharp, combative reply to 1.e4."
    boc.FAMILY_REPUTATION.clear()
    boc.FAMILY_REPUTATION["Sicilian Defense"] = "A mainstay at every level."
    boc.NOTABLE_SUBVARIATIONS.clear()
    boc.NOTABLE_SUBVARIATIONS["Sicilian Defense: Najdorf Variation"] = {
        "overview": "The Najdorf: flexible ...a6, prized by attacking and positional players alike.",
        "reputationNotes": "The most deeply analyzed line in chess; a lifelong study for those who take it up.",
        "ratingBand": 5,
    }

    openings = boc.build_catalog([FAKE_ROWS[0], FAKE_ROWS[1]])
    promoted = next(o for o in openings if o["name"] == "Sicilian Defense: Najdorf Variation")

    assert promoted["overview"].startswith("The Najdorf")
    assert promoted["ratingBand"] == 5


def test_missing_family_tags_raises_with_family_names():
    with pytest.raises(SystemExit, match="Nonexistent Family"):
        boc.build_catalog([{"eco": "A00", "name": "Nonexistent Family", "pgn": "1. a3"}])
