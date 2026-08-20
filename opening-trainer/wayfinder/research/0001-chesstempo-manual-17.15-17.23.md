# ChessTempo manual §17.15–17.23 (opening trainer settings + surrounding features)

Captured verbatim from a copy-paste the requester supplied mid-session, after every automated
fetch attempt against `chesstempo.com` (WebFetch and a browser-UA `curl`) was blocked all
session by Cloudflare's active bot-challenge (`cf-mitigated: challenge` — see `wayfinder/
map.md`'s Notes). This is the real primary source `map.md` originally had to reconstruct from
secondary sources; kept here so it doesn't need re-capturing.

## 17.15.1. Basic settings

**Learning mode** — Choose between the different methods of deciding which items to train,
either Spaced repetition, Review in order or Least recent/unseen first. (Note: Desktop only
until next app update)

**Pause at end of line** — While training, don't show the next move automatically after
reaching the end of a line. You can also choose to pause after any move by using the pause
button under the board, allowing you to review comments etc without automatically moving on to
the next move.

**Preview moves in new lines** — Show the correct move via an arrow in all new positions.

**Preview moves wrong on last attempt** — Show the correct move via an arrow if it was wrong on
the last attempt.

**Preview moves in all lines** — Show the correct move via an arrow before all moves.

**Candidate moves as arrows when not training** — When not in training mode, use arrows to show
the current candidate moves in the position, the main line move will be shown as a purple
arrow, other candidate moves as grey arrows. (Note: Desktop only until next app update)

**Top explorer move as arrow when not training** — When not in training mode, use an orange
arrow to show the most popular move in the position according to the opening explorer. If the
top explorer move is also the main line move, and candidate move arrows is turned on then the
orange arrow will be shown with a purple border, indicating the main line move is also the most
popular move. If the top explorer move is an non-main line candidate move then it will be shown
with a grey border. (Note: Desktop only until next app update)

**Show our move comments** — Your own move comments (either made by you in the comment panel,
or imported from PGN when creating your repertoire) are shown in the personal comments panel
under conditions decided by this option. You can choose to have comments shown only when not
training, always (so both training and non-training), never or in situations where the move is
previewed. The latter includes several cases, such as when showing a previously wrong move,
showing a new move you haven't seen yet, or when training might be paused such as when a
mistake was just made or a line has reached the end. When not training is the default. When
your own comments are shown in training in a situation where the system is currently expecting
you to play a move, then the comment will be shown for the move to play rather than move just
played, which is different to the all comments list panel which always shows comments for the
move just played. (Note: Desktop only until next app update)

**Learning priority** — How new moves are moved from the as yet unseen moves into the learning
set. 'Main lines first' takes moves from main lines first and sidelines later. 'Breadth over
depth' mode takes all moves at depth 1 first then moves on to all moves at depth 2, continually
increasing the depth until all moves have been added to the learning set. This setting is also
used to decide the move order in Review in order mode and the order in which unseen items are
selected in the Least recent/unseen first mode.

**Maximum learning depth** — The maximum depth to train moves to. Default to unlimited,
entering 0 for the depth will revert back to unlimited. Note that the global training graphs
will always use unlimited depth for stats display, even if a depth limit has been requested.

## 17.15.2. Spaced repetition settings

**Sort due items by** — When the spaced repetition system has several items that are due for
presentation, this option decides what order they will be presented in. "Variation" means due
items will be sorted by variation, "Due date" will sort the items by when they are due.
Variation is the default option and will lead to less jumping around in your repertoire,
especially if your repertoire is large. However if you are having trouble completing all items
each day, you may want to switch to "Due date" which will prioitise the items that are most
overdue first. Note that using "Variation" mode means wrong moves will not be scheduled until
you either finish the due items that were scheduled at the start of the session or you
reinitialise the repertoire by reloading the page or clicking between different repertoires.
(Note: Desktop only until next app update)

**Sort undue items by variation window** — When using the sort due items by variation option,
this value dictates how many hours into the future any undue items will be included in the
sorting. For example if the value is set to 24 hours then you can continue solving against
problems due up to 24 hours into the future, and still have them sorted by variation. Once the
window has been passed, if you continue to train when there are 0 due items then they will be
selected purely on the order they are due, which may mean you jump between variations. The
default value is 0 hours.

**Gap growth factor** — Dictates how quickly moves you get correct are pushed into the future.
E.g. gap growth 2, correct after 4 days → next presentation in 2*4 = 8 days. Default 2.0.

**Max Days into the future** — The maximum number of days the spaced repetition system will
allow an item to be scheduled into the future. Default 1095 days (3 years).

**Mistake Reschedule time** — Minutes into the future to schedule a mistake move. Default 0.5
minutes (30 seconds) — not literally re-shown in 30s, just its due date is 30s from now.

**Initial Correct Scheduled time** — The first time you get an item correct it's scheduled this
many minutes into the future. Default 1440 minutes (1 day).

**Preview reschedule time** — If a move triggered preview treatment, it's rescheduled more
quickly (default 1 minute), since being shown the answer gives no new information on how well
it's known.

## 17.15.3. Advanced settings

**Consider leadup moves when training branch**, **Reinforce minimum correct**, **Reinforce
minimum days**, **Don't show start moves threshold**, **Move speed adjustment**, **Use fixed
piece movement speed** — all about how "leadup" context moves (the moves from the start position
down to the branch point) are replayed/reinforced before the actual target move during branch
training. Off/0 by default except move speed (1.0).

**Engine eval output style** — white-based vs repertoire-colour-based sign convention for stored
engine evaluations.

**Opening tree colouring method**, **Explorer game threshold** — how tree moves are coloured
using opening-explorer stats.

## 17.16–17.23 (surrounding features, for context — not settings)

Opening tree (click a move to jump to it; delete/disable/copy-line via right-click; deleting a
line that others transposed into truncates those too, promote first to preserve). Repertoire
tree (folders per color; "all white/black" trains across every repertoire of that color;
due-count or time-until-due shown per repertoire, not live-updated). Repertoire shortcuts
(bookmark a position, optionally organized into sub-folders). Opening explorer (master-game
popularity/performance for the current position). Candidate moves list (hidden during training
by default; lets you traverse outside training). Engine panel (premium; add engine's suggested
move to the repertoire). Annotations (!, ?, +=, etc., stored and exported in PGN). Comments
(move- or position-level, public/private, vote-ranked "best comment" display, embeddable
analysis-board diagrams, arrow/square highlighting via right-click+modifiers).

## What this changes in opening-trainer's own design

- **"Random" was never a real ChessTempo method** — the third Method option is "Least
  recent/unseen first," which is deterministic (oldest-seen-or-never-seen first), not a shuffle.
  Replaced in `engine.js`/`app.js` (see `wayfinder/map.md`'s Decisions so far).
- **`gradeCard`'s existing defaults were already a good match** without having read this:
  "Initial Correct Scheduled time" defaults to 1440 minutes = **1 day**, exactly ADR 0002's "a
  new card's first correct answer schedules it 1 day out." Encouraging, not a change needed.
- Everything else here (previews, pause-at-end-of-line, leadup/reinforcement tuning, tree
  management — delete/disable/copy lines, shortcuts, opening explorer, engine panel, comments/
  annotations) is real and legitimate, but beyond this v1's destination — left in `map.md`'s
  Not yet specified rather than built now, so it isn't lost.
