# Simplified SM-2 scheduler with binary (correct/incorrect) grading

Spaced-repetition scheduling needs a grading input to adjust each Card's ease/interval. Full
SM-2 (and Anki-style schedulers) grade recall quality on a 0–5 scale, chosen by the trainee after
seeing the answer. That doesn't fit this app: the trainee produces a move on the board, and the
app already knows objectively whether it matched the repertoire's move — there is no subjective
"how well did I know it" judgment to collect, and asking for one after an objective right/wrong
would be friction the interaction doesn't need.

We chose a simplified SM-2 variant graded **binary**: "correct" behaves like a good-quality SM-2
grade (interval grows by the ease factor, ease nudges up slightly, capped), "incorrect" behaves
like a failing grade (interval resets to the shortest relearning step, ease nudges down, capped,
lapse count increments). This is a real trade-off — full SM-2's graded feedback converges
slightly better over the very long run — but matches the strict wrong-move rule (a move is
simply right or wrong) and keeps the Card schema and update function small. Revisiting this
means migrating every stored Card's fields, so it's recorded here rather than assumed silently.
