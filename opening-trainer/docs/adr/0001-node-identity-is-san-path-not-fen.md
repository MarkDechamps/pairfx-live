# Node identity is the SAN path, not the FEN — no automatic transposition merging

A Repertoire's tree could key each Node by the FEN of its position (merging transpositions —
the same position reached via different move orders becomes one Node with one Card) or by the
SAN move path from the root (keeping every move order as its own Node, even when two paths
reach an identical position).

We chose **SAN path**, matching `opening-tree/engine.js`'s existing convention exactly: tree
building stays a plain string-keyed walk with zero chess-legality dependency, and `chess.js`
stays scoped to "replay a path to get a FEN for the board" as it already is in `opening-tree`.
FEN-keying would need canonical FEN normalization (en passant rights, castling rights, halfmove
clock) done correctly for every uploaded PGN, and ChessTempo's own "handles transpositions
automatically" is a real feature, not a trivial one.

Consequence accepted: a position reached by two different move orders in the same Repertoire
gets two independent Nodes and two independent Cards, so it can be drilled (and scheduled)
twice under two different paths. This is a minor over-counting, not a correctness bug, and is
the same limitation `opening-tree` already has (noted there as a possible future Lichess-explorer
enhancement, never implemented). Revisiting this later means changing Node identity, which
touches storage schema, tree-building, and Card lookup — the reversal cost is real, which is why
it's recorded here rather than assumed silently.
