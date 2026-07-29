---
id: 0003
title: Question-flow and recommendation logic design
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: [0002]
---

## Question

Given the criteria taxonomy (ticket 0002), how does the page decide which question to ask
next based on prior answers, and how does it turn accumulated answers into a recommendation?

Resolve: whether it's a fixed decision tree vs. a scoring/filtering engine over the candidate
set; roughly how many questions a typical run takes; how color selection (White vs. Black)
fits into the flow — one flow run twice, or a fork at the start; and whether the output is a
single best-match opening or a ranked shortlist with rationale.

## Resolution

**Engine type:** scoring/filtering engine over the candidate set, not a fixed decision tree.
A tree would need a branch per combination across 6 criteria (several 5-point scales) —
combinatorially unmanageable. Instead each opening carries tagged values on the same
dimensions (ticket 0004's schema), and answers score/filter the candidate set.

**Question flow (typical run, ~8-10 questions):**
1. **Color** (White/Black) — fixed first question, plain two-option choice. Not adaptive;
   doesn't affect any other question's content. One flow definition, run twice (once per
   color) — matches the destination decision from charting.
2. Rating, Study time, Depth of knowledge, Time control(s) — asked in fixed order; each is an
   independent input, no conditional skipping between them.
3. **Style — adapts by rating band**, this is the one real branch point in the flow:
   - Beginner/Intermediate: 2 simplified questions ("sharp attacking vs. calm solid" and
     "enjoy memorizing lines vs. prefer general understanding"), with the other 2 style axes
     (dynamic/static, forgiving/punishing) defaulted to a neutral midpoint rather than asked.
   - Advanced/Expert/Master: all 4 style axes asked explicitly.
4. **Longevity** — asked, fixed position, independent input.

**Scoring architecture — criteria split into hard filters vs. soft-scored:**
- **Hard filters** (exclude non-matches outright): Depth of knowledge tolerance, Time
  control(s). A mismatch here makes an opening genuinely unplayable for that user (no
  calculation time, or theory depth exceeds what they'll memorize) — no "close enough."
- **Soft-scored** (affect ranking, nothing excluded): Rating band, Style (all 4 axes),
  Longevity. These are preferences, not hard constraints.
- **Refinement — Rating band gates whether the Depth filter applies at all:** opposition at
  low levels rarely punishes under-preparation, so depth/theory mismatches carry real risk
  only once the opponent is strong enough to exploit them. Concretely:
  - **Beginner/Intermediate:** Depth of knowledge tolerance is *not* a hard filter — any
    opening is eligible regardless of stated depth tolerance/study time ("you can play
    whatever you want" at this level).
  - **Advanced/Expert/Master:** Depth of knowledge tolerance *is* a hard filter (and gets
    stricter as rating climbs) — e.g. an Expert/Master without the study time to keep up with
    Najdorf-caliber theory should have such openings excluded outright, not just down-ranked.
  - Time control's hard-filter behavior stays rating-independent — calculation-time pressure
    doesn't relax just because the player is a beginner.
  - This makes Rating band do double duty: still soft-scored on its own, and now also the
    gate for whether the Depth filter is active.
- **Study time**: neither filter nor score input. Instead, it personalizes the rationale —
  "This typically takes about 2 weeks to learn at your pace" — computed from a new schema
  field ticket 0004 needs to add: estimated hours-to-competency per opening, divided by the
  user's daily budget.

**Time-control multi-select:** produces **one shortlist per selected time control** (not a
single blended shortlist) — an opening well-suited for Blitz and one well-suited for
Classical are genuinely different picks, and blending would produce a compromise that fits
neither well. This directly satisfies the "suggest blitz opening, classical opening at once"
idea raised during the criteria session.

**Output:** ranked shortlist of top 3 openings per selected time control, each with a
one-line rationale referencing the user's answers (e.g. style match + the study-time-derived
learning estimate).

**Implication for ticket 0004 (opening data schema):** each opening entry will need, at
minimum: color ownership, ECO code/name/moves (ticket 0001), a depth-of-theory tag (hard
filter), a time-control-suitability tag/list (hard filter), a rating-band suitability tag
(soft score), 4 style-axis scores (soft score), a longevity/durability tag (soft score), and
an estimated-hours-to-competency number (rationale personalization).
