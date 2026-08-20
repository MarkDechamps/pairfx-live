import test from "node:test";
import assert from "node:assert/strict";
import {
  splitPgnGames,
  parseHeaders,
  buildRepertoireTree,
  childrenOf,
  nodeAtPath,
  initCard,
  isDue,
  gradeCard,
  nodesInScope,
  leastRecentFirst,
  pickNextDue,
  resolveSquareClick,
  isTraineeMove,
  trainableNodesInScope,
  isWellKnown,
  WELL_KNOWN_REPS,
  summarizeMastery,
  mergeGamesIntoTree,
} from "./engine.js";

// ---------------------------------------------------------------------------
// splitPgnGames — one uploaded file can hold one or many games, each a header
// block + movetext, separated by blank lines.
// ---------------------------------------------------------------------------

test("splitPgnGames splits a single game into its headers and movetext", () => {
  const pgn = ['[Event "Casual"]', '[White "Me"]', '[Black "Prep"]', "", "1. e4 e5 2. Nf3 *"].join("\n");

  const games = splitPgnGames(pgn);

  assert.equal(games.length, 1);
  assert.match(games[0].headers, /\[White "Me"\]/);
  assert.equal(games[0].movetext, "1. e4 e5 2. Nf3 *");
});

test("splitPgnGames splits multiple games out of one file", () => {
  const pgn = [
    '[Event "A"]',
    '[White "Me"]',
    "",
    "1. e4 e5 *",
    "",
    '[Event "B"]',
    '[White "Me"]',
    "",
    "1. d4 d5 *",
  ].join("\n");

  const games = splitPgnGames(pgn);

  assert.equal(games.length, 2);
  assert.equal(games[0].movetext, "1. e4 e5 *");
  assert.equal(games[1].movetext, "1. d4 d5 *");
});

test("splitPgnGames returns an empty array for blank input", () => {
  assert.deepEqual(splitPgnGames("   \n\n  "), []);
});

// ---------------------------------------------------------------------------
// parseHeaders
// ---------------------------------------------------------------------------

test("parseHeaders reads bracketed tag/value pairs", () => {
  const headers = parseHeaders('[Event "Casual"]\n[White "Me"]\n[Black "Prep"]');
  assert.deepEqual(headers, { Event: "Casual", White: "Me", Black: "Prep" });
});

// ---------------------------------------------------------------------------
// buildRepertoireTree — merges one or more PGN files' games (mainline + RAV
// variations) into a single SAN-path-keyed tree (ADR 0001: no FEN/transposition
// merging — only literal shared SAN prefixes merge).
// ---------------------------------------------------------------------------

function pgn(movetext) {
  return ['[Event "x"]', "", movetext].join("\n");
}

test("buildRepertoireTree builds a linear chain from a mainline-only game", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 *")]);

  assert.deepEqual(Object.keys(root.children), ["e4"]);
  const afterE4 = root.children.e4;
  assert.deepEqual(Object.keys(afterE4.children), ["e5"]);
  const afterE4E5 = afterE4.children.e5;
  assert.deepEqual(Object.keys(afterE4E5.children), ["Nf3"]);
});

test("buildRepertoireTree branches a single top-level variation off its parent position", () => {
  // After 1.e4 e5 2.Nf3, the variation "(2. Bc4 Nc6 3. Qh5)" replays from the position
  // right after 1...e5 — i.e. it's a sibling of "Nf3", not a child of it.
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 (2. Bc4 Nc6 3. Qh5) Nc6 3. Bb5 *")]);

  const afterE4E5 = root.children.e4.children.e5;
  assert.deepEqual(Object.keys(afterE4E5.children).sort(), ["Bc4", "Nf3"]);

  const sicilianStyle = afterE4E5.children.Bc4;
  assert.deepEqual(Object.keys(sicilianStyle.children), ["Nc6"]);
  assert.deepEqual(Object.keys(sicilianStyle.children.Nc6.children), ["Qh5"]);

  const mainLine = afterE4E5.children.Nf3;
  assert.deepEqual(Object.keys(mainLine.children), ["Nc6"]);
});

test("buildRepertoireTree handles a variation nested inside another variation", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 (2. Bc4 Nc6 (2... Bc5 3. Qh5) 3. Qh5) Nc6 *")]);

  const afterE4E5 = root.children.e4.children.e5;
  const bc4Line = afterE4E5.children.Bc4;

  // the nested variation "(2... Bc5 3. Qh5)" branches from right after 2.Bc4, i.e. it's a
  // sibling of "Nc6" under bc4Line, not a child of it — so bc4Line now has two children.
  assert.deepEqual(Object.keys(bc4Line.children).sort(), ["Bc5", "Nc6"]);
  assert.deepEqual(Object.keys(bc4Line.children.Nc6.children), ["Qh5"]);
  assert.deepEqual(Object.keys(bc4Line.children.Bc5.children), ["Qh5"]);
});

test("buildRepertoireTree resumes the mainline correctly after a variation closes", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 (2. Bc4 Nc6) Nc6 3. Bb5 a6 *")]);

  const afterE4E5Nf3 = root.children.e4.children.e5.children.Nf3;
  assert.deepEqual(Object.keys(afterE4E5Nf3.children), ["Nc6"]);
  assert.deepEqual(Object.keys(afterE4E5Nf3.children.Nc6.children), ["Bb5"]);
});

test("buildRepertoireTree strips move numbers, comments, NAGs, and result tokens", () => {
  const root = buildRepertoireTree([pgn("1. e4! {a good move} e5 $1 2. Nf3 Nc6 1-0")]);

  assert.deepEqual(Object.keys(root.children), ["e4"]);
});

// ---------------------------------------------------------------------------
// Comments — a `{...}` right after a move is attached to the Node that move reaches, not
// discarded, so app.js can show it (behind a toggle — see wayfinder/map.md).
// ---------------------------------------------------------------------------

test("buildRepertoireTree attaches a move's comment to the node it reaches", () => {
  const root = buildRepertoireTree([pgn("1. e4 {King's pawn.} e5 *")]);
  assert.equal(root.children.e4.comment, "King's pawn.");
  assert.equal(root.children.e4.children.e5.comment, undefined);
});

test("buildRepertoireTree attaches a comment inside a variation to the right node, not the mainline's", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 (2. Bc4 {Italian.} Nc6) Nc6 *")]);
  assert.equal(root.children.e4.children.e5.children.Bc4.comment, "Italian.");
  assert.equal(root.children.e4.children.e5.children.Nf3.comment, undefined);
});

test("buildRepertoireTree strips [%csl ...]/[%cal ...] annotation commands out of a comment's text", () => {
  const root = buildRepertoireTree([pgn("1. e4 {[%csl Ce7] My recommendation.} e5 *")]);
  assert.equal(root.children.e4.comment, "My recommendation.");
});

test("buildRepertoireTree merges two games' different comments on the same node rather than overwriting", () => {
  const root = buildRepertoireTree([pgn("1. e4 {First note.} e5 *"), pgn("1. e4 {Second note.} c5 *")]);
  assert.equal(root.children.e4.comment, "First note. Second note.");
});

test("buildRepertoireTree merges games that share a SAN prefix into the same nodes", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 *"), pgn("1. e4 e5 2. Nf3 Nf6 *")]);

  const afterE4E5Nf3 = root.children.e4.children.e5.children.Nf3;
  assert.deepEqual(Object.keys(afterE4E5Nf3.children).sort(), ["Nc6", "Nf6"]);
});

test("buildRepertoireTree merges games from separate uploaded files", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 *")], []);
  assert.deepEqual(Object.keys(root.children), ["e4"]);

  const merged = buildRepertoireTree([pgn("1. e4 e5 *"), pgn("1. d4 d5 *")]);
  assert.deepEqual(Object.keys(merged.children).sort(), ["d4", "e4"]);
});

// ---------------------------------------------------------------------------
// mergeGamesIntoTree — a game documenting a transposition via [SetUp "1"]/[FEN "..."] (common
// in repertoire-book PGN exports) has no leadup moves to replay, so this app's SAN-path tree has
// nowhere correct to place it. Merging it anyway (as buildRepertoireTree/mergeMovetextIntoTree
// blindly did) inserted its first recorded move — some arbitrary mid-game move — straight under
// the tree's root, corrupting the whole tree. mergeGamesIntoTree skips such games instead and
// reports them, rather than silently guessing wrong.
// ---------------------------------------------------------------------------

function pgnWithHeaders(headerLines, movetext) {
  return [...headerLines, "", movetext].join("\n");
}

test("mergeGamesIntoTree merges an ordinary game normally, with nothing skipped", () => {
  const root = emptyTree();
  const skipped = mergeGamesIntoTree(root, pgn("1. e4 e5 *"));
  assert.deepEqual(Object.keys(root.children), ["e4"]);
  assert.deepEqual(skipped, []);
});

test("mergeGamesIntoTree skips a game with [SetUp \"1\"]/[FEN ...] rather than corrupting the tree", () => {
  const root = emptyTree();
  const transpositionChapter = pgnWithHeaders(
    ['[Event "x"]', '[White "Chapter 2"]', '[SetUp "1"]', '[FEN "r1bqkb1r/pp3ppp/2n1pn2/3p4/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7"]'],
    "7. Be3 Qb6 8. Ndb5 Bd7 *",
  );

  const skipped = mergeGamesIntoTree(root, transpositionChapter);

  assert.deepEqual(Object.keys(root.children), []); // nothing bogus landed at the root
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].White, "Chapter 2");
});

test("mergeGamesIntoTree merges the ordinary games in a file and skips only the FEN-based ones", () => {
  const root = emptyTree();
  const text = [
    pgn("1. e4 e6 2. d4 d5 *"),
    pgnWithHeaders(['[Event "x"]', '[SetUp "1"]', '[FEN "8/8/8/8/8/8/8/8 w - - 0 1"]'], "5. Be3 *"),
    pgn("1. d4 Nf6 *"),
  ].join("\n\n");

  const skipped = mergeGamesIntoTree(root, text);

  assert.deepEqual(Object.keys(root.children).sort(), ["d4", "e4"]);
  assert.equal(skipped.length, 1);
});

function emptyTree() {
  return buildRepertoireTree([]);
}

test("buildRepertoireTree also skips FEN-based games rather than corrupting the tree", () => {
  const text = pgnWithHeaders(['[Event "x"]', '[SetUp "1"]', '[FEN "8/8/8/8/8/8/8/8 w - - 0 1"]'], "5. Be3 *");
  const root = buildRepertoireTree([text]);
  assert.deepEqual(Object.keys(root.children), []);
});

// ---------------------------------------------------------------------------
// childrenOf / nodeAtPath
// ---------------------------------------------------------------------------

test("childrenOf lists a node's tracked moves in first-encountered order", () => {
  const root = buildRepertoireTree([pgn("1. e4 c5 *"), pgn("1. e4 e5 *")]);
  assert.deepEqual(
    childrenOf(root.children.e4).map((c) => c.san),
    ["c5", "e5"],
  );
});

test("nodeAtPath walks a SAN path down from the root", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 *")]);
  const node = nodeAtPath(root, ["e4", "e5"]);
  assert.deepEqual(Object.keys(node.children), ["Nf3"]);
});

test("nodeAtPath returns null for a path the tree doesn't contain", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 *")]);
  assert.equal(nodeAtPath(root, ["d4"]), null);
});

// ---------------------------------------------------------------------------
// Card lifecycle — simplified SM-2, binary correct/incorrect grading (ADR 0002).
// ---------------------------------------------------------------------------

test("initCard starts immediately due, at the default ease, with no history", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const card = initCard(now);

  assert.equal(card.interval, 0);
  assert.equal(card.ease, 2.5);
  assert.equal(card.reps, 0);
  assert.equal(card.lapses, 0);
  assert.equal(isDue(card, now), true);
});

test("gradeCard(correct) on a new card schedules it 1 day out and bumps ease/reps", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const card = gradeCard(initCard(now), true, now);

  assert.equal(card.interval, 1);
  assert.equal(card.ease, 2.6);
  assert.equal(card.reps, 1);
  assert.equal(card.lapses, 0);
  assert.equal(new Date(card.due).toISOString(), "2026-01-02T00:00:00.000Z");
  assert.equal(isDue(card, now), false);
});

test("gradeCard(correct) on a reviewed card grows the interval by its ease factor", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const reviewed = { due: now.toISOString(), interval: 10, ease: 2, reps: 3, lapses: 0 };

  const card = gradeCard(reviewed, true, now);

  assert.equal(card.interval, 20); // round(10 * 2)
  assert.equal(card.reps, 4);
});

test("gradeCard(incorrect) resets the interval, drops ease, and is due again immediately", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const reviewed = { due: now.toISOString(), interval: 20, ease: 2.5, reps: 4, lapses: 1 };

  const card = gradeCard(reviewed, false, now);

  assert.equal(card.interval, 0);
  assert.equal(card.ease, 2.3);
  assert.equal(card.reps, 0);
  assert.equal(card.lapses, 2);
  assert.equal(isDue(card, now), true);
});

test("gradeCard never drops ease below the floor or raises it past the ceiling", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const brittle = { due: now.toISOString(), interval: 1, ease: 1.35, reps: 0, lapses: 5 };
  const seasoned = { due: now.toISOString(), interval: 30, ease: 2.95, reps: 10, lapses: 0 };

  assert.equal(gradeCard(brittle, false, now).ease, 1.3);
  assert.equal(gradeCard(seasoned, true, now).ease, 3.0);
});

// ---------------------------------------------------------------------------
// Scope resolution and session ordering
// ---------------------------------------------------------------------------

test("nodesInScope with no path lists every non-root node — the whole repertoire", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 *")]);
  const paths = nodesInScope(root).map((entry) => entry.path.join(" "));
  assert.deepEqual(paths, ["e4", "e4 e5", "e4 e5 Nf3"]);
});

test("nodesInScope with a path scopes to that node's branch, itself included", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 *"), pgn("1. e4 c5 *")]);
  const paths = nodesInScope(root, ["e4", "e5"]).map((entry) => entry.path.join(" "));
  assert.deepEqual(paths, ["e4 e5", "e4 e5 Nf3", "e4 e5 Nf3 Nc6"]);
});

test("nodesInScope returns an empty array for a path the tree doesn't contain", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 *")]);
  assert.deepEqual(nodesInScope(root, ["d4"]), []);
});

// ---------------------------------------------------------------------------
// leastRecentFirst — the third real Method (ChessTempo manual §17.15.1: "Least recent/unseen
// first"), replacing an invented "random" shuffle that never matched anything in the actual
// settings (see wayfinder/research/0001).
// ---------------------------------------------------------------------------

test("leastRecentFirst puts every unseen (card-less) entry ahead of any seen one", () => {
  const entries = [
    { path: ["seen"], node: { card: { due: "2026-01-01T00:00:00Z" } } },
    { path: ["unseen"], node: {} },
  ];
  assert.deepEqual(
    leastRecentFirst(entries).map((e) => e.path[0]),
    ["unseen", "seen"],
  );
});

test("leastRecentFirst preserves the given order among unseen entries", () => {
  const entries = [{ path: ["b"], node: {} }, { path: ["a"], node: {} }, { path: ["c"], node: {} }];
  assert.deepEqual(
    leastRecentFirst(entries).map((e) => e.path[0]),
    ["b", "a", "c"],
  );
});

test("leastRecentFirst orders seen entries by their card's due date, earliest first", () => {
  const entries = [
    { path: ["later"], node: { card: { due: "2026-02-01T00:00:00Z" } } },
    { path: ["sooner"], node: { card: { due: "2026-01-01T00:00:00Z" } } },
  ];
  assert.deepEqual(
    leastRecentFirst(entries).map((e) => e.path[0]),
    ["sooner", "later"],
  );
});

test("pickNextDue prefers the most-overdue card over a merely-due one", () => {
  const now = new Date("2026-01-10T00:00:00Z");
  const nodes = [
    { path: ["a"], node: { card: { due: "2026-01-09T00:00:00Z" } } },
    { path: ["b"], node: { card: { due: "2026-01-01T00:00:00Z" } } },
  ];
  assert.deepEqual(pickNextDue(nodes, { now }).path, ["b"]);
});

test("pickNextDue introduces a card-less (new) node when nothing is due yet", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const nodes = [
    { path: ["a"], node: { card: { due: "2026-02-01T00:00:00Z" } } },
    { path: ["b"], node: {} },
  ];
  assert.deepEqual(pickNextDue(nodes, { now }).path, ["b"]);
});

test("pickNextDue returns null when every card is caught up and there's nothing new", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const nodes = [{ path: ["a"], node: { card: { due: "2026-02-01T00:00:00Z" } } }];
  assert.equal(pickNextDue(nodes, { now }), null);
});

test("pickNextDue can exclude the node just answered, so it doesn't repeat immediately", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const nodes = [
    { path: ["a"], node: { card: { due: "2026-01-01T00:00:00Z" } } },
    { path: ["b"], node: { card: { due: "2025-12-31T00:00:00Z" } } },
  ];
  assert.deepEqual(pickNextDue(nodes, { now, excludePath: ["a"] }).path, ["b"]);
});

// ---------------------------------------------------------------------------
// resolveSquareClick — same click-to-move state machine as opening-tree/engine.js, ported
// verbatim (only browsing's tracked-moves-only board needs it; the training board, ticket 0005,
// needs full chess-legal input instead, since a "wrong" move has to be a real possibility).
// ---------------------------------------------------------------------------

test("resolveSquareClick selects a square with a tracked move out of it", () => {
  const moves = [{ san: "e4", from: "e2", to: "e4" }];
  assert.deepEqual(resolveSquareClick(null, "e2", moves), { selection: "e2", san: null });
});

test("resolveSquareClick completes the move when the selected square's target is clicked", () => {
  const moves = [{ san: "e4", from: "e2", to: "e4" }];
  assert.deepEqual(resolveSquareClick("e2", "e4", moves), { selection: null, san: "e4" });
});

test("resolveSquareClick deselects when the selected square is clicked again", () => {
  const moves = [{ san: "e4", from: "e2", to: "e4" }];
  assert.deepEqual(resolveSquareClick("e2", "e2", moves), { selection: null, san: null });
});

test("resolveSquareClick is a no-op for a square with no tracked move out of it", () => {
  const moves = [{ san: "e4", from: "e2", to: "e4" }];
  assert.deepEqual(resolveSquareClick(null, "d2", moves), { selection: null, san: null });
});

// ---------------------------------------------------------------------------
// isTraineeMove / trainableNodesInScope / pickOpponentReply — CONTEXT.md's Trainee Node: only
// a move of the Repertoire's own color ever gets quizzed; the opponent's replies are auto-played.
// ---------------------------------------------------------------------------

test("isTraineeMove: a White repertoire's trainee moves are the odd-length paths", () => {
  assert.equal(isTraineeMove(["e4"], "white"), true); // White's 1st move
  assert.equal(isTraineeMove(["e4", "e5"], "white"), false); // Black's reply
  assert.equal(isTraineeMove(["e4", "e5", "Nf3"], "white"), true); // White's 2nd move
});

test("isTraineeMove: a Black repertoire's trainee moves are the even-length paths", () => {
  assert.equal(isTraineeMove(["e4"], "black"), false);
  assert.equal(isTraineeMove(["e4", "e5"], "black"), true);
  assert.equal(isTraineeMove(["e4", "e5", "Nf3"], "black"), false);
});

test("trainableNodesInScope keeps only Trainee Nodes, opponent-move nodes excluded", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 *")]);
  const paths = trainableNodesInScope(root, "white").map((entry) => entry.path.join(" "));
  assert.deepEqual(paths, ["e4", "e4 e5 Nf3"]);
});

test("trainableNodesInScope can be scoped to a branch, same as nodesInScope", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *")]);
  const paths = trainableNodesInScope(root, "white", ["e4", "e5"]).map((entry) => entry.path.join(" "));
  assert.deepEqual(paths, ["e4 e5 Nf3", "e4 e5 Nf3 Nc6 Bb5"]);
});

// ---------------------------------------------------------------------------
// isWellKnown / summarizeMastery — "how well do we know this line" (ChessTempo manual
// §17.15.3's "Don't show start moves threshold": a move solved correctly this many times in a
// row in a row is well known — see wayfinder/research/0001).
// ---------------------------------------------------------------------------

test("isWellKnown is false for a card-less (untrained) node", () => {
  assert.equal(isWellKnown(undefined), false);
});

test("isWellKnown is false below the reps threshold, true at or above it", () => {
  assert.equal(isWellKnown({ reps: WELL_KNOWN_REPS - 1 }), false);
  assert.equal(isWellKnown({ reps: WELL_KNOWN_REPS }), true);
  assert.equal(isWellKnown({ reps: WELL_KNOWN_REPS + 5 }), true);
});

test("summarizeMastery tallies every Trainee Node in scope as new, learning, or known", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *")]);
  // e4: untrained (new); Nf3: learning (below threshold); Bb5: known (at threshold)
  root.children.e4.children.e5.children.Nf3.card = { reps: WELL_KNOWN_REPS - 1, due: "2099-01-01T00:00:00Z" };
  root.children.e4.children.e5.children.Nf3.children.Nc6.children.Bb5.card = {
    reps: WELL_KNOWN_REPS,
    due: "2099-01-01T00:00:00Z",
  };

  assert.deepEqual(summarizeMastery(root, "white"), { new: 1, learning: 1, known: 1, dueCount: 0 });
});

test("summarizeMastery counts due cards separately from the new/learning/known split", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 *")]);
  root.children.e4.card = { reps: 1, due: "2000-01-01T00:00:00Z" }; // long past due
  assert.deepEqual(summarizeMastery(root, "white"), { new: 0, learning: 1, known: 0, dueCount: 1 });
});

test("summarizeMastery can be scoped to a branch, same as nodesInScope/trainableNodesInScope", () => {
  const root = buildRepertoireTree([pgn("1. e4 e5 2. Nf3 Nc6 *"), pgn("1. d4 d5 *")]);
  assert.deepEqual(summarizeMastery(root, "white", ["e4", "e5"]), { new: 1, learning: 0, known: 0, dueCount: 0 });
});
