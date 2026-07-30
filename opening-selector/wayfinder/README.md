# Wayfinder (local-markdown tracker)

No issue tracker was configured for this repo, so this map uses wayfinder's local-markdown
fallback: plain files stand in for issues.

- `map*.md` — a map. Frontmatter: `labels: [wayfinder:map]`. More than one map can coexist
  (e.g. `map.md`, `map-opening-catalog-research.md`) when a new effort's destination is
  distinct from an existing map's — each is independent; a closed map is not reopened for a
  new destination.
- `tickets/NNNN-slug.md` — child tickets of a map, sharing one flat, globally-numbered folder
  across all maps. Frontmatter:
  - `id`: NNNN
  - `title`
  - `labels`: `[wayfinder:<type>]` — one of `research`, `prototype`, `grilling`, `task`
  - `status`: `open` | `closed`
  - `assignee`: `null` until claimed (a session claims a ticket by setting this before working it)
  - `map`: relative path to the owning map file — required once more than one map exists, so a
    ticket's parent is unambiguous
  - `blocked_by`: `[ids]` — substitute for native blocking; a ticket is unblocked when every
    id listed here has `status: closed`
- `research/` — findings captured by research-ticket subagents, linked from the owning ticket.

**Frontier** = open tickets with `assignee: null` and every id in `blocked_by` closed.

Resolving a ticket: post the answer as a `## Resolution` section appended to the ticket file,
set `status: closed`, then add a one-line pointer to `map.md`'s "Decisions so far" section.
