# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, client-side chess opening recommender ("PairFX Opening Selector"). No build step,
no framework, no package.json — plain HTML/CSS/JS served as-is, plus a Python pipeline that
generates the data file it loads at runtime.

## Commands

```bash
# Run JS unit tests (engine.js only — no DOM)
node --test

# Serve the app locally (fetch() of the JSON asset requires HTTP, not file://)
python3 -m http.server 8000   # then open http://localhost:8000/index.html

# Run Python tests (catalog-building pipeline)
source .venv/bin/activate
pytest scripts/

# Regenerate wayfinder/assets/opening-catalog.json from lichess-org/chess-openings
source .venv/bin/activate
python3 scripts/build_opening_catalog.py
```

Run a single JS test by name: `node --test --test-name-pattern="<pattern>" engine.test.js`.
Run a single Python test: `pytest scripts/test_build_opening_catalog.py::test_name`.

## Architecture

**Strict separation of question-flow/scoring logic from DOM:**
- `engine.js` — pure functions (no DOM), UMD-wrapped so it loads as `window.Engine` in the
  browser and via `require("./engine.js")` in `node --test`. Owns the question flow order,
  hard-filter/soft-scoring logic, and shortlist grouping.
- `app.js` — DOM rendering and event wiring only. Holds `state` (answers, step index) and a
  `STEP_RENDERERS` map keyed by step id; re-renders the whole `#app` container on every state
  change rather than doing incremental DOM diffing.
- `engine.test.js` — tests engine.js in isolation via `node --test`, loading
  `wayfinder/assets/opening-sample.json` as fixture data.

**Question flow** (`engine.js: buildSteps`): color → first move(s) → rating → study time →
depth → time control(s) → style axes → longevity. The step list is answer-dependent, not
fixed: `styleAxesForFlow` shows only 2 of the 4 style axes (risk tolerance, tactical/
positional) for Beginner/Intermediate raters, all 4 for Advanced+. Every step requires an
explicit "Continue" click (see `renderContinueRow`); there's no auto-advance on selection.

**Recommendation logic** (`engine.js: passesHardFilters` / `scoreOpening` / `shortlistFor`):
a filter-then-score model, not a decision tree.
- Hard filters (exclude entirely): color, time control, first move, and — only for
  Advanced+ raters — `depthOfTheory` above the player's stated tolerance. Below Advanced,
  depth doesn't filter; it only affects the rationale text.
- Soft scoring (rank what passes): rating-band distance, style-axis distance (axes the flow
  actually asked score at full weight; axes defaulted to neutral because the flow skipped
  them score at reduced weight — see `ASKED_AXIS_WEIGHT`/`DEFAULTED_AXIS_WEIGHT`), and
  `healthAtHigherLevels` weighted by the longevity answer.
- Results are grouped into "families" (`groupIntoFamilies`) before ranking so a shortlist
  slot shows one representative opening per family with its best-scoring deeper variation
  attached, rather than the same idea occupying multiple top-3 slots. Family membership is
  by shared name-root (text before `": "`) OR by move-prefix + name-prefix — see the comment
  above `groupIntoFamilies` and the Indian/Nimzo-Indian test case in `engine.test.js` for why
  neither check alone suffices.
- Output is one shortlist (top 3) per selected time-control × first-move combination, run
  once per color (the flow is single-color per pass; asking for both means running it
  twice).

**Data pipeline** (`scripts/build_opening_catalog.py`): fetches the ECO A-E TSVs from
`lichess-org/chess-openings` (CC0) and produces `wayfinder/assets/opening-catalog.json`
(~3800 rows). Per-family tags (style axes, rating band, depth, health, hours) don't exist as
structured data upstream, so they're hand-authored at the ~150-family level in
`scripts/family_data/volume_{a,b,c,d,e}.py` (one file per ECO volume, each owning a disjoint
set of family keys — enforced by `family_data/__init__.py`'s merge step — so re-researching
different volumes in parallel never produces a merge conflict). Per-row fields are derived
from each row's move length/sub-variation depth relative to its family baseline; a
`NOTABLE_SUBVARIATIONS` entry can override that for a promoted sub-variation. `overview` and
`reputationNotes` are hand-authored, research-backed prose per family, also split by volume
file. When editing family tags/text, edit the matching `volume_*.py` file, then regenerate
the catalog rather than hand-editing the generated JSON.

`wayfinder/assets/opening-sample.json` is a small hand-authored 14-opening fixture (not
generated) spanning ECO A-E, both colors, and the full range of every field — used by
`engine.test.js` and meant to be kept in sync by hand when schema or representative openings
change.

## Wayfinder (spec/ticket tracker)

`wayfinder/` is this repo's local-markdown issue tracker (see `wayfinder/README.md` for the
convention: `map*.md` files are destinations, `tickets/NNNN-slug.md` are child tickets in one
flat globally-numbered folder, tickets carry a `map:` field once more than one map exists).
Two maps exist, both closed:
- `map.md` — the original spec (criteria taxonomy, question-flow design, data schema).
- `map-opening-catalog-research.md` — execution-carrying re-research of the family-level
  tags/overview/reputation data, one ticket per ECO volume (0006-0010).

Check open tickets in `wayfinder/tickets/` before assuming the schema or flow logic is
final — decisions and their rationale live there, not just in code comments.
