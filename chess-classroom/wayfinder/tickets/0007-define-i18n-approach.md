---
id: 0007
title: Define the i18n approach (Dutch default, French/English)
labels: [wayfinder:grilling]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: []
---

## Question

Define the i18n approach for chess-classroom's UI (Dutch default, French and English also
supported):

- Where do translated strings live (a per-language JSON dictionary, inline lookup table,
  something else)?
- How does the teacher switch language — a visible switcher, browser-locale auto-detection, or
  both? If both, which wins on first load?
- Is the chosen language remembered across sessions (and where — same local storage as
  everything else)?
- Flag any UI strings likely to be awkward to fit across all three languages (e.g. short
  button labels) so layout tickets (0002, 0003) can account for it.

## Resolution

Confirmed by the requester as proposed (reviewed after the fact, on return).

- **Storage**: a per-language flat JSON dictionary (`nl.json`, `fr.json`, `en.json`) keyed by
  string id, loaded via `fetch`/`<script>` — no i18n framework or bundler needed, keeping this
  in line with the rest of the repo's zero-build-step apps.
- **Switching**: a small, always-visible switcher in the top bar (not auto-detection alone) —
  proposing browser-locale auto-detect only to pick the *first-run* default, with a visible
  control always present afterward. Reasoning: shared/school computers often have an
  arbitrary browser locale that doesn't match who's actually teaching that day, and a
  Dutch-speaking tool with no visible way to reach French/English would strand a teacher who
  needs one of those languages with no obvious escape hatch.
- **Persistence**: the chosen language is remembered in the same local storage the rest of the
  app already uses, so it survives a reload.
- **Layout risk flagged for 0002/0003**: short top-bar action labels ("Sync"/"Synchroniseren",
  "Upload"/"PGN uploaden") and the drawing-tool tooltips are the strings most likely to vary
  awkwardly in length across Dutch/French/English — worth a quick check against the 0002
  prototype's top bar once real translated strings exist, since it's the tightest horizontal
  space in the layout.
