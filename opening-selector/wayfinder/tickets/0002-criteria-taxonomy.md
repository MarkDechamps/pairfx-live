---
id: 0002
title: Criteria taxonomy for the recommender
labels: [wayfinder:grilling]
status: closed
assignee: claude
blocked_by: []
---

## Question

What is the full set of criteria the recommender should ask about, beyond style, rating, and
study time?

For each criterion, pin down: its name, the type of answer it takes (scale, single choice,
multi-choice), and how it's expected to narrow the candidate set of openings. Candidates to
grill through include (not exhaustive): risk tolerance, tactical vs. positional preference,
memorization-load tolerance, time-control focus (blitz/rapid/classical), reliance on forcing
lines vs. flexible structures — plus anything else that surfaces during the session.

## Resolution

Full taxonomy — 6 criteria (one, Style, bundles 4 independent axes):

1. **Rating** — single-choice band. No platform-rating anchoring (Lichess numbers were
   considered and dropped — too ambiguous/inconsistent across platforms for casual players).
   - Beginner: "Just learning the rules / new to openings"
   - Intermediate: "Comfortable with the rules, played a fair number of games, no formal rating"
   - Advanced: "Regular/club player, solid tactics, but limited deep opening theory"
   - Expert: FIDE rating 2000+
   - Master: FIDE Master (FM) title or higher, or FIDE rating 2300+
   - Narrows by matching opening complexity/theory-appropriateness to skill tier.

2. **Study time** — single-choice, daily time budget: Under 30 min/day, 30–60 min/day,
   1–2 hours/day, 2+ hours/day. Narrows by pace of repertoire-building achievable — independent
   of depth tolerance (below).

3. **Depth of knowledge tolerance** — single-choice, 3 tiers: Shallow (general understanding,
   few forced moves) / Moderate (main lines + typical plans) / Deep (long precise theoretical
   lines). Narrows by ceiling of acceptable memorization, regardless of available time.

4. **Style** — 4 independent 5-point discrete scales (not a continuous slider — openings get
   discrete hand-tagged scores in the schema, so 5 buckets carry all the real precision):
   - Tactical ↔ Positional
   - Risk tolerance: Solid/safe ↔ Sharp/gambit-friendly
   - Dynamic ↔ Static (imbalanced/initiative-chasing structures vs. stable long-term ones)
   - Forgiving/flexible ↔ Punishing/forcing (margin for error after a mistake)
   - Narrows by matching each opening's tagged score on each axis.

5. **Time control(s)** — multi-select: Bullet/Blitz, Rapid, Classical/Correspondence. Phrased
   as "which time control(s) do you want an opening for" (a request, not a self-description) —
   selecting multiple can surface a tailored pick per selected control in one run. Narrows by
   filtering openings whose complexity outpaces calculation time at the board; flagged as a
   design input for ticket 0003 (per-time-control result branching).

6. **Longevity** — single-choice, 3 options: "Stays sound as I improve, even if less punchy
   right now" / "No strong preference" / "Best fit for right now — I'll switch later if I
   outgrow it". Independent of Rating (current strength) — this is about intent regarding
   future growth. Narrows by filtering out openings known to be viable only at lower levels
   when durability is prioritized.

**Parked, not part of this map:** a "community advice" feature — users scoring openings
themselves, surfaced alongside/blended into recommendations — was raised but ruled out of
scope for this spec (see map's Out of scope section). It's a distinct feature (rating data
model, aggregation, moderation) deserving its own future map.
