---
id: 0002
title: IndexedDB storage layer for repertoires and card state
labels: [wayfinder:task]
status: closed
assignee: claude
map: ../map.md
blocked_by: [1]
---

## Question

Build `db.js`: persist named per-color Repertoires (their trees) and per-Node Card (SRS) state
in the browser's IndexedDB, with create/list/rename/delete for repertoires and load/save for a
repertoire's tree + cards. Injectable IDB implementation (mirroring `client.js`'s injectable
`fetchImpl` pattern in opening-tree) so the logic is unit-testable under `node --test` without a
real browser. No external IndexedDB wrapper library — hand-rolled, matching the repo's
zero-dependency convention.

## Resolution

Built via TDD (`db.test.js` written first, 12 tests, all red before `db.js` existed). One
object store, one record per repertoire (`{id, name, color, tree, createdAt, updatedAt}`);
every CRUD rule (blank-name/invalid-color rejection, name-uniqueness scoped per color, "touch
updatedAt") is written against an injectable `{get, getAll, put, delete}` store interface and
tested with an in-memory fake, mirroring `client.js`'s injectable-`fetchImpl` pattern. Card
state (ticket 0003) will simply live embedded on tree nodes — `tree` is opaque to `db.js`, so no
schema change is needed for it. `openIndexedDbStore()` is the one real IndexedDB adapter,
deliberately untested browser-API glue (same convention as `opening-tree/app.js`). 26/26 tests
green across the app.
