# Opening Trainer

A browser-local tool for building a personal chess opening repertoire from uploaded PGN files
and drilling it with spaced repetition, modeled on ChessTempo's opening trainer. Everything
lives in the browser's own storage — no backend, no accounts.

## Language

**Repertoire**:
A named, single-color collection of prepared opening lines (e.g. "Main White", "Anti-Sicilian").
The unit the user uploads PGNs into, browses, and chooses as training scope. Has exactly one
color.
_Avoid_: Tree, opening (too generic — a Repertoire *contains* a tree of Nodes)

**Node**:
One position within a Repertoire's move tree, identified by the SAN move sequence (the
**path**) from the starting position down to it.
_Avoid_: Position (a Node is a place in a specific Repertoire's tree, not a raw chess position —
see the transposition ADR)

**Trainee Node**:
A Node reached by a move of the Repertoire's own color (White repertoire: reached after an odd
number of plies; Black: an even number) — i.e. a move the trainee must produce. Only Trainee
Nodes ever get a Card; a Node reached by the opponent's move is auto-played during a Training
Session (uniformly at random among that position's tracked replies, when there's more than one)
rather than quizzed.
_Avoid_: Node (when specifically talking about what's quizzable — the two aren't
interchangeable; every Trainee Node is a Node, not every Node is a Trainee Node)

**Path**:
The ordered list of SAN moves from a Repertoire's root down to a Node; a Node's identity.
_Avoid_: Line, sequence

**Card**:
The spaced-repetition scheduling state attached to a Node once it has been trained at least
once: due date, interval, ease, lapse count. Untrained Nodes have no Card yet.
_Avoid_: SRS state (fine in prose, but "Card" is the term in code/UI)

**Training Session**:
One run of drilling, scoped and ordered by its Training Settings. Ephemeral — not persisted
across a page reload.
_Avoid_: Quiz, drill (the per-line "Drill" *entry point* into a session, see below, is a UI verb;
the thing it starts is a Training Session)

**Training Settings**:
The Scope + Method (+ wrong-move handling, + board orientation) chosen for a Training Session.

**Scope**:
Which Nodes are eligible for a Training Session: the current **branch** (a Node and its
subtree), one whole **Repertoire**, or **all Repertoires of a color**.

**Method**:
How eligible Nodes are ordered within a Training Session, matching ChessTempo's own three
options (manual §17.15.1 — `wayfinder/research/0001`): **review-in-order** (fixed depth-first
walk, generated once at session start), **least recent/unseen first** (that same walk
reordered — every never-trained Node first, then trained ones oldest-due-first), or
**spaced-repetition** (dynamically picks the most-overdue Card each turn, recomputed live so a
missed Node can resurface later in the same session).
_Avoid_: Random (there's no shuffle-based Method — an earlier version of this app invented one
that didn't match ChessTempo's real settings; see the research note above)

**Drill**:
The action of starting a Training Session scoped to one specific Node's branch, in
review-in-order method — the equivalent of ChessTempo's per-variation "Drill" button.
_Avoid_: Train (reserve "train" for the general action; "Drill" is specifically the
branch-scoped, review-in-order shortcut)
