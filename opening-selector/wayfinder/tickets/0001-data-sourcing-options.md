---
id: 0001
title: Data sourcing options for the opening dataset
labels: [wayfinder:research]
status: closed
assignee: null
blocked_by: []
---

## Question

Where should the representative sample of opening data (used to validate the schema) actually
come from?

Specifically:
- Is scraping/republishing content from 365chess.com/chess-openings viable (terms of use,
  licensing), or should it be avoided?
- What alternative open/public sources exist for chess opening data — e.g. ECO code reference
  tables, the Lichess opening explorer/API, chess.com's openings API, public PGN databases,
  Wikipedia's list of chess openings — and what data do they actually expose (names, ECO
  codes, move sequences, popularity/win-rate stats, tags)?
- Which source(s) best fit building a ~10-20 opening representative sample with fields
  relevant to a style/rating/study-time-driven recommender?

Recommend a primary source (and a fallback) with a short rationale, and note any licensing
constraints that should shape the "Opening data schema" ticket (0004).

## Resolution

Full findings: [research/0001-data-sourcing-options.md](../research/0001-data-sourcing-options.md).

- **Primary source: `lichess-org/chess-openings`** (GitHub, CC0-1.0 — confirmed via GitHub's
  own repo-metadata API). Gives `eco` / `name` / `pgn` (plus `uci`/`epd` in the built dist) as
  plain public-domain facts — no attribution needed, trivial to pull a 10-20 row sample
  spanning ECO volumes A-E.
- **Fallback: Wikipedia's "List of chess openings" ECO table + per-opening articles**
  (CC BY-SA 4.0 — attribution + share-alike required if prose is copied/paraphrased).
- **Avoid 365chess.com as a data source.** No explicit ToS ban or blanket robots.txt block on
  the top-level pages, but its actual value beyond bare ECO facts — curated prose write-ups
  and the Opening Explorer's aggregated win/draw/loss/Elo stats — is 365chess's own compiled
  product, not open data. Read-only human reference only, never copy/paste.
- **Style / complexity / rating-suitability tags exist nowhere as structured data** — not in
  365chess, Wikipedia, the Lichess Opening Explorer schema, the lichess-org dataset, or
  chess.com's API. This will have to be hand-authored by the project team in ticket 0004,
  informed by prose (mind Wikipedia's attribution obligation; never lift 365chess's wording).
- Caveat: the live Lichess Opening Explorer endpoint (`explorer.lichess.org/masters`)
  returned 401 in this research session — the field-level schema claims are confirmed from
  the project's published OpenAPI spec, not a live call. Re-verify reachability before ticket
  0004 depends on it for live popularity stats.
