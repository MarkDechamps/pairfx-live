#!/usr/bin/env python3
"""Pre-fetches Wikipedia background material for opening families, once,
centrally — so the per-volume re-scoring work (wayfinder tickets
0006..0010) doesn't have each agent independently spend WebFetch/WebSearch
round-trips re-discovering the same ~150 pages.

Plain HTTP against Wikipedia's official API (search+extract in one call via
`generator=search`), no scraping, no LLM involved — this is pure data
retrieval per ticket 0001's already-cleared sourcing (CC BY-SA, full-article
plain-text extracts, not just intro summaries, so the cached text actually
carries the "reputation"/practical nuance an intro paragraph would miss).

Usage: python3 prefetch_family_research.py [family ...]
  With no arguments, fetches every family in FAMILY_TAGS that doesn't already
  have a cache file. Safe to re-run — skips families already cached.
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_opening_catalog as boc

CACHE_DIR = Path(__file__).resolve().parent / "research_cache"
API_URL = "https://en.wikipedia.org/w/api.php"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 5
USER_AGENT = "opening-selector-research-prefetch/1.0 (local research cache builder)"

GENERIC_SUFFIX_WORDS = {
    "defense", "defence", "opening", "gambit", "attack", "game", "system",
    "formation", "variation", "countergambit", "accepted", "declined",
    "with", "the", "of", "and", "a", "an",
}


def distinctive_tokens(name: str) -> list:
    words = re.split(r"[\s,:\-']+", name.lower())
    return [w for w in words if w and w not in GENERIC_SUFFIX_WORDS]


def is_confident_match(family: str, title: str) -> bool:
    tokens = distinctive_tokens(family)
    if not tokens:
        return True  # nothing distinctive to check against (shouldn't happen)
    title_lower = title.lower()
    return any(tok in title_lower for tok in tokens)


def slugify(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def fetch_family(name: str) -> dict:
    query = f"{name} chess opening"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrlimit": 1,
        "prop": "extracts|info",
        "inprop": "url",
        "explaintext": 1,
        "format": "json",
        "formatversion": 2,
    }
    url = API_URL + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < MAX_RETRIES - 1:
                backoff = 5 * (attempt + 1)
                print(f"  429 rate-limited on {name!r}, backing off {backoff}s...")
                time.sleep(backoff)
                continue
            raise

    pages = data.get("query", {}).get("pages", [])
    if not pages:
        return {"family": name, "found": False}

    page = pages[0]
    title = page.get("title", "")
    return {
        "family": name,
        "found": True,
        "title": title,
        "url": page.get("fullurl"),
        "extract": page.get("extract", ""),
        "confident": is_confident_match(name, title),
    }


def write_cache_file(result: dict) -> Path:
    slug = slugify(result["family"])
    path = CACHE_DIR / f"{slug}.md"
    if not result.get("found"):
        path.write_text(
            f"# {result['family']}\n\nNOT FOUND via Wikipedia search API — "
            "no confident match. Use WebSearch/WebFetch directly for this "
            "family instead of relying on this cache.\n",
            encoding="utf-8",
        )
        return path

    warning = ""
    if not result["confident"]:
        warning = (
            "**LOW-CONFIDENCE MATCH** — the article title doesn't share any "
            "distinctive word with the family name, so this is likely the "
            "wrong page (e.g. a generic overview article the search fell "
            "back to). Don't rely on this content for `overview`/"
            "`reputationNotes` claims — use WebSearch/WebFetch directly for "
            "this family instead.\n\n"
        )
    header = (
        f"# {result['family']}\n\n"
        f"Source: {result['title']} — {result['url']}\n"
        "(Wikipedia, CC BY-SA 4.0 — paraphrase, don't copy verbatim, into "
        "overview/reputationNotes text; see wayfinder/research/0001-data-sourcing-options.md)\n\n"
        f"{warning}---\n\n"
    )
    path.write_text(header + result["extract"], encoding="utf-8")
    return path


def main():
    requested = sys.argv[1:]
    families = requested if requested else sorted(boc.FAMILY_TAGS)

    fetched, skipped, not_found, low_confidence = 0, 0, 0, []
    for name in families:
        slug = slugify(name)
        cache_path = CACHE_DIR / f"{slug}.md"
        if cache_path.exists():
            skipped += 1
            continue
        try:
            result = fetch_family(name)
        except Exception as exc:
            print(f"FAILED: {name!r} — {exc}")
            continue
        path = write_cache_file(result)
        if result.get("found") and result["confident"]:
            fetched += 1
            print(f"OK    {name!r} -> {path.name} ({result['title']})")
        elif result.get("found"):
            low_confidence.append(name)
            print(f"LOW   {name!r} -> {path.name} ({result['title']})")
        else:
            not_found += 1
            print(f"MISS  {name!r} -> {path.name}")
        time.sleep(REQUEST_DELAY_SECONDS)

    print(
        f"\nFetched: {fetched}, low-confidence: {len(low_confidence)}, "
        f"not found: {not_found}, already cached (skipped): {skipped}"
    )
    if low_confidence:
        print("Needs manual WebSearch/WebFetch (low-confidence match):")
        for name in low_confidence:
            print(f"  - {name}")


if __name__ == "__main__":
    main()
