# Wayfinder (local-markdown tracker)

No issue tracker was configured for this repo, so this map uses wayfinder's local-markdown
fallback: plain files stand in for issues. This is a separate wayfinder instance from
`opening-tree/wayfinder/`, `opening-selector/wayfinder/`, and `chess-classroom/wayfinder/` — its
own map, its own flat ticket numbering, scoped to the opening-trainer effort only.

- `map.md` — the map. Frontmatter: `labels: [wayfinder:map]`.
- `tickets/NNNN-slug.md` — child tickets of the map. Frontmatter:
  - `id`: NNNN
  - `title`
  - `labels`: `[wayfinder:<type>]` — one of `research`, `prototype`, `grilling`, `task`
  - `status`: `open` | `closed`
  - `assignee`: `null` until claimed (a session claims a ticket by setting this before working it)
  - `map`: relative path to the owning map file
  - `blocked_by`: `[ids]` — a ticket is unblocked when every id listed here has `status: closed`
- `research/` — findings captured by research-ticket subagents, linked from the owning ticket.

**Frontier** = open tickets with `assignee: null` and every id in `blocked_by` closed.

Resolving a ticket: post the answer as a `## Resolution` section appended to the ticket file,
set `status: closed`, then add a one-line pointer to `map.md`'s "Decisions so far" section.

**This effort's Notes override the plan-only default** — see `map.md`'s Notes: this map carries
execution (an actual build), not just decisions, per the requester's explicit instruction.
