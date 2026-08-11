---
id: 0006
title: Define the local PGN library UX
labels: [wayfinder:grilling]
status: closed
assignee: claude-session
map: ../map.md
blocked_by: []
---

## Question

Define the local PGN-library UX (a teacher's uploaded PGNs — including multi-game files —
kept in the browser and switchable without re-uploading):

- How are uploaded files named/listed for later selection? Auto-named from PGN headers,
  teacher-editable, or both?
- Is there a practical cap on how many are kept, and what happens at the cap (oldest evicted?
  the teacher warned and asked to delete something)?
- How does a teacher delete an old one?
- For a multi-game file, is the per-game picker shown at upload time, or every time that file
  is reopened from the library?

## Resolution

Confirmed by the requester as proposed (reviewed after the fact, on return).

- **Naming**: auto-name each library entry from the PGN header tags (e.g. "White vs Black,
  Event") falling back to the uploaded filename when headers are sparse/missing, and let the
  teacher rename it afterward. Avoids forcing manual naming on every upload without locking
  teachers into possibly-meaningless auto-generated names.
- **Cap**: a generous but real cap — proposing 50 entries, since PGNs are tiny (KB-scale) and
  browser storage comfortably fits far more, but an unbounded library would eventually need a
  policy anyway. At the cap, **warn and require deleting something** rather than silently
  evicting the oldest entry — silently discarding a teacher's saved course material would be a
  surprising, harmful failure mode.
- **Deletion**: a delete action next to each entry in the library list, with a confirm step
  (destructive and unrecoverable, since there's no backend/undo).
- **Multi-game files**: the per-game picker is shown once, at upload time; the specific chosen
  game becomes the stored library entry, not the whole raw multi-game file. Keeps every library
  entry to "one game," consistent with how notes/variations elsewhere in the spec assume a
  single loaded game. Loading a *different* game from the same original file means re-uploading
  it and picking again.
