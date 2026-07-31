"""Merges the per-ECO-volume family data files into the four dicts
build_opening_catalog.py expects. Each volume_{a,b,c,d,e}.py owns a disjoint
set of family keys (verified below) — that's what makes parallel work on
separate volumes conflict-free at the file level, not just the dict-key
level.
"""

from . import volume_a, volume_b, volume_c, volume_d, volume_e

_VOLUMES = [volume_a, volume_b, volume_c, volume_d, volume_e]


def _merge(attr):
    merged = {}
    for vol in _VOLUMES:
        d = getattr(vol, attr)
        overlap = set(merged) & set(d)
        if overlap:
            raise SystemExit(f"{attr}: duplicate keys across volume files: {overlap}")
        merged.update(d)
    return merged


FAMILY_TAGS = _merge("FAMILY_TAGS")
FAMILY_OVERVIEW = _merge("FAMILY_OVERVIEW")
FAMILY_REPUTATION = _merge("FAMILY_REPUTATION")
NOTABLE_SUBVARIATIONS = _merge("NOTABLE_SUBVARIATIONS")
