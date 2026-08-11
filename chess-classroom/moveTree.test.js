import test from "node:test";
import assert from "node:assert/strict";
import pgnParserPkg from "@mliebelt/pgn-parser";
import { Chess } from "chess.js";
import {
  ROOT_PATH,
  pathKey,
  parseGame,
  parseGames,
  buildGameTree,
  isCollapsedByDefault,
  createCursor,
  continuationsFrom,
  findContinuationBySan,
  formatMoveLabel,
  sanitizeCyrillicHomoglyphs,
  normalizeEvaluationSymbols,
  stripUnrecognizedMoveGlyphs,
  sanitizePgnText,
  splitPgnGames,
  replaceGameInPgnText,
  addMove,
  serializeGameTree,
} from "./moveTree.js";

// Plays `san` on a fresh chess.js instance seeded at `fen` and returns the
// shape `addMove` expects — the same shape app.js's tryPlayBoardMove already
// builds from a real board move (fenBefore/fen plus chess.js's own move
// result fields).
function playMoveResult(fen, san) {
  const scratch = new Chess(fen);
  const move = scratch.move(san);
  return { san: move.san, from: move.from, to: move.to, fenBefore: fen, fen: scratch.fen() };
}

const { parse } = pgnParserPkg;

// A Ruy Lopez with a top-level sideline (3...Nf6, the Berlin), a sideline
// nested inside that sideline, comments on several moves, and one embedded
// %cal/%csl annotation — exercises every piece of ticket 0005's spec.
const RUY_LOPEZ_PGN = `[Event "Club Training"]
[White "Teacher"]
[Black "Student"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 {The Ruy Lopez.} a6 (3... Nf6 {The Berlin Defence.}
4. O-O Nxe4 (4... Be7 {A quieter Berlin move order.}) 5. d4 {[%cal Gd4e5,Rb5c6][%csl Ge4]}
Nd6) 4. Ba4 Nf6 5. O-O Be7 *`;

function buildTree() {
  const parsed = parseGame(parse, RUY_LOPEZ_PGN);
  return buildGameTree(Chess, parsed);
}

test("parseGame delegates to the injected parser with startRule: game", () => {
  const game = parseGame(parse, RUY_LOPEZ_PGN);
  assert.equal(game.tags.White, "Teacher");
  assert.equal(game.moves.length, 10); // mainline plies only, not sideline moves
});

test("splitPgnGames returns one chunk for a single-game file", () => {
  assert.deepEqual(splitPgnGames(RUY_LOPEZ_PGN), [RUY_LOPEZ_PGN]);
});

test("splitPgnGames splits at a blank line followed by a new tag section, not at every '['", () => {
  const twoGames = `${RUY_LOPEZ_PGN}\n\n[Event "Second"]\n1. d4 d5 *`;
  const chunks = splitPgnGames(twoGames);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].trim(), RUY_LOPEZ_PGN.trim());
  assert.equal(chunks[1].trim(), '[Event "Second"]\n1. d4 d5 *');
});

test("parseGames returns { games, failures } with one entry even for a single-game file", () => {
  const { games, failures } = parseGames(parse, RUY_LOPEZ_PGN);
  assert.equal(games.length, 1);
  assert.equal(games[0].tags.Event, "Club Training");
  assert.deepEqual(failures, []);
});

test("parseGames splits a multi-game file into one entry per game", () => {
  const twoGames = `${RUY_LOPEZ_PGN}\n\n[Event "Second"]\n1. d4 d5 *`;
  const { games, failures } = parseGames(parse, twoGames);
  assert.equal(games.length, 2);
  assert.equal(games[1].tags.Event, "Second");
  assert.deepEqual(failures, []);
});

// Real-world bug report: a 155-game book export had one single game with a
// genuinely unbalanced parenthesis (a variation opened with "(" and never
// closed before the game ends) — an authoring defect in the source file
// that can't be safely auto-corrected (there's no reliable way to guess
// where the missing ")" belongs). Before this fix, @mliebelt/pgn-parser
// parses "games" as a single grammar pass over the whole file, so one
// malformed game took down all 155. parseGames now parses each game
// independently so one bad game doesn't sink the rest of the library.
test("parseGames isolates a single malformed game instead of failing the whole batch", () => {
  const unbalanced = `[Event "Broken"]\n\n1. e4 e5 2. Nf3 (2. Bc4 *`; // "(" never closed
  const threeGames = `${RUY_LOPEZ_PGN}\n\n${unbalanced}\n\n[Event "Third"]\n1. d4 d5 *`;

  const { games, failures } = parseGames(parse, threeGames);

  assert.equal(games.length, 2, "the two well-formed games still load");
  assert.deepEqual(games.map((g) => g.tags.Event), ["Club Training", "Third"]);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].index, 1);
  assert.match(failures[0].message, /Expected|expected/);
});

// ---- replaceGameInPgnText (persisting a Lock-PGN-off deviation back into --
// its correct slot within a multi-game library entry's raw text) ----------

test("replaceGameInPgnText swaps out a single-game file's only chunk entirely", () => {
  const result = replaceGameInPgnText(RUY_LOPEZ_PGN, 0, '[Event "New"]\n\n1. d4 *');
  const { games } = parseGames(parse, result);
  assert.equal(games.length, 1);
  assert.equal(games[0].tags.Event, "New");
});

test("replaceGameInPgnText replaces only the targeted game, leaving the other games' text untouched", () => {
  const threeGames = [
    RUY_LOPEZ_PGN,
    '[Event "Second"]\n\n1. d4 d5 *',
    '[Event "Third"]\n\n1. c4 c5 *',
  ].join("\n\n");

  const result = replaceGameInPgnText(threeGames, 1, '[Event "Second — edited"]\n\n1. d4 d5 2. c4 *');
  const { games, failures } = parseGames(parse, result);

  assert.deepEqual(failures, []);
  assert.equal(games.length, 3, "still three games — none dropped or merged");
  assert.equal(games[0].tags.Event, "Club Training", "game 0 (Ruy Lopez) is untouched");
  assert.equal(games[1].tags.Event, "Second — edited", "game 1 got the new content");
  assert.equal(games[1].moves.length, 3, "game 1's new move (2.c4) is present");
  assert.equal(games[2].tags.Event, "Third", "game 2 is untouched");
});

test("replaceGameInPgnText throws on an out-of-range index instead of silently corrupting the file", () => {
  assert.throws(() => replaceGameInPgnText(RUY_LOPEZ_PGN, 1, "anything"), RangeError);
  assert.throws(() => replaceGameInPgnText(RUY_LOPEZ_PGN, -1, "anything"), RangeError);
});

// Real-world bug report: a book-sourced PGN (copy/OCR'd from a Russian-language
// source) had a handful of Cyrillic look-alike characters standing in for
// Latin ones inside actual move text — visually identical, but @mliebelt/
// pgn-parser's strict SAN grammar (and chess.js's own move parser) reject
// them outright. Cyrillic а/е/о/р/с/х/у and А/В/Е/К/М/Н/О/Р/С/Т/У/Х are
// confusable with Latin a/e/o/p/c/x/y and A/B/E/K/M/H/O/P/C/T/Y/X.
test("sanitizeCyrillicHomoglyphs replaces confusable Cyrillic letters with their Latin look-alikes", () => {
  // "Qхb4" — Cyrillic х (U+0445) standing in for Latin x, as found in
  // the reported file.
  const withHomoglyph = "2. Qхb4 Rb8";
  assert.equal(sanitizeCyrillicHomoglyphs(withHomoglyph), "2. Qxb4 Rb8");
});

test("sanitizeCyrillicHomoglyphs leaves ordinary ASCII PGN text untouched", () => {
  assert.equal(sanitizeCyrillicHomoglyphs(RUY_LOPEZ_PGN), RUY_LOPEZ_PGN);
});

test("parseGame tolerates a Cyrillic homoglyph inside a move instead of throwing", () => {
  const pgnWithHomoglyph = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "*"]

1. e4 d5 2. eхd5 *`;

  const game = parseGame(parse, pgnWithHomoglyph);
  assert.equal(game.moves[2].notation.notation, "exd5"); // [e4, d5, exd5]
});

// Same real-world file also used superscript-digit evaluation symbols (²/³)
// as informal shorthand for "slight edge to White/Black", directly attached
// to a move with no separating space (e.g. "17.h4² Nd7"). The grammar
// doesn't recognize ²/³ but does recognize the standard NAG glyphs ±/∓ for
// exactly this meaning, so normalize to those rather than dropping the
// annotation entirely.
test("normalizeEvaluationSymbols maps superscript ²/³ to the grammar's own accepted ±/∓ glyphs", () => {
  assert.equal(normalizeEvaluationSymbols("17.h4² Nd7"), "17.h4± Nd7");
  assert.equal(normalizeEvaluationSymbols("20...Bc5³"), "20...Bc5∓");
});

test("normalizeEvaluationSymbols leaves ordinary ASCII PGN text untouched", () => {
  assert.equal(normalizeEvaluationSymbols(RUY_LOPEZ_PGN), RUY_LOPEZ_PGN);
});

test("sanitizePgnText composes Cyrillic-homoglyph and evaluation-symbol normalization", () => {
  const messy = "2. Qхb4² Rb8";
  assert.equal(sanitizePgnText(messy), "2. Qxb4± Rb8");
});

test("parseGame tolerates a superscript evaluation symbol glued directly to a move", () => {
  const pgnWithGluedSymbol = `[Event "Test"]
[Result "*"]

1. e4² e5 *`;

  const game = parseGame(parse, pgnWithGluedSymbol);
  assert.equal(game.moves[0].notation.notation, "e4");
  assert.deepEqual(game.moves[0].nag, ["$16"]); // ± normalizes to NAG $16
});

// Same real-world file also had a few other stray symbols glued directly to
// moves (e.g. "Qxc5µ" — a micro sign, U+00B5) that aren't Cyrillic
// homoglyphs and don't map to any recognizable NAG glyph either — most
// likely leftover font-mapping noise from however the book's PGN was
// generated. Rather than growing an ever-longer per-character map for each
// new garbage symbol that turns up, strip anything the grammar doesn't
// accept, but ONLY outside `{...}` comments and `"..."` header strings —
// both of which the grammar already treats as opaque text (confirmed:
// Cyrillic/accented prose inside either survives untouched today), so this
// must never touch genuine comment prose or header values.
test("stripUnrecognizedMoveGlyphs removes a stray unrecognized symbol glued to a move", () => {
  assert.equal(stripUnrecognizedMoveGlyphs("25.Bxc5 Bxc4 26.Bxc4 Qxc5µ)"), "25.Bxc5 Bxc4 26.Bxc4 Qxc5)");
});

test("stripUnrecognizedMoveGlyphs never touches text inside a comment", () => {
  const withComment = "12.Be2 {Ünïcödé prose — the µ sign, ² and ³ can appear here freely.} Qd7";
  assert.equal(stripUnrecognizedMoveGlyphs(withComment), withComment);
});

test("stripUnrecognizedMoveGlyphs never touches text inside a quoted header value", () => {
  const withHeader = '[Black "Stefan Кuipers µ 2440"]\n\n1. e4 *';
  assert.equal(stripUnrecognizedMoveGlyphs(withHeader), withHeader);
});

test("stripUnrecognizedMoveGlyphs leaves the grammar's own accepted glyphs alone outside comments", () => {
  const withNag = "17.h4± Nd7";
  assert.equal(stripUnrecognizedMoveGlyphs(withNag), withNag);
});

test("sanitizePgnText composes all three normalization passes", () => {
  const messy = '[Black "Кuipers"]\n\n2. Qхb4² Qxc5µ Rb8';
  // Header "Кuipers" -> "Kuipers": the Cyrillic-homoglyph pass runs globally
  // (translation, not deletion, so it's safe everywhere including headers —
  // see sanitizeCyrillicHomoglyphs above). Only the strip-unrecognized pass
  // is scoped to skip headers/comments, since it deletes rather than
  // translates.
  assert.equal(sanitizePgnText(messy), '[Black "Kuipers"]\n\n2. Qxb4± Qxc5 Rb8');
});

test("buildGameTree replays a move that arrived with a Cyrillic homoglyph in it", () => {
  const pgnWithHomoglyph = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "*"]

1. e4 d5 2. eхd5 *`;

  const tree = buildGameTree(Chess, parseGame(parse, pgnWithHomoglyph));
  assert.equal(tree.mainLine[2].san, "exd5"); // [e4, d5, exd5]
});

test("buildGameTree replays the mainline through chess.js and records the resulting FEN", () => {
  const tree = buildTree();
  assert.equal(tree.tags.Event, "Club Training");
  assert.equal(tree.mainLine.length, 10);
  assert.equal(tree.mainLine[0].san, "e4");

  const chess = new Chess();
  chess.move("e4");
  assert.equal(tree.mainLine[0].fen, chess.fen());
});

// Real-world bug report: the same book export includes tactics-exercise
// entries that start from a mid-game diagram (a `[FEN "..."]` header tag)
// rather than move 1 of a full game — a normal, legitimate PGN feature
// chess.js supports directly (`new Chess(fen)`), but buildGameTree always
// started from the standard position, so every one of these entries failed
// with a spurious "illegal move" (the puzzle's first move genuinely isn't
// legal from the *standard* start position — it was never meant to be).
test("buildGameTree starts from a [FEN] tag's position when present, instead of assuming a new game", () => {
  const puzzlePgn = `[Event "Exercise position"]
[White "Exercise position"]
[Black "Black to move"]
[Result "*"]
[FEN "5rk1/5ppp/3Q4/4p1P1/1p2P3/1p6/qP5P/2KR3R b - - 0 1"]

1... Qa8 *`;
  const parsed = parseGame(parse, puzzlePgn);
  const tree = buildGameTree(Chess, parsed);

  assert.equal(tree.rootFen, "5rk1/5ppp/3Q4/4p1P1/1p2P3/1p6/qP5P/2KR3R b - - 0 1");
  assert.equal(tree.mainLine[0].san, "Qa8");
});

test("buildGameTree still defaults to the standard starting position when no [FEN] tag is present", () => {
  const tree = buildTree();
  assert.equal(tree.rootFen, new Chess().fen());
});

test("mainline move paths are single-element and pathKey-addressable", () => {
  const tree = buildTree();
  assert.deepEqual(tree.mainLine[0].path, [0]);
  assert.equal(tree.mainLine[0].pathKey, "0");
  assert.equal(tree.nodesByPath.get("0"), tree.mainLine[0]);
});

test("a top-level sideline is attached to the move it replaces, with a nested path", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4]; // 3. Bb5
  assert.equal(bb5.san, "Bb5");
  const aSix = tree.mainLine[5]; // 3... a6 (the mainline continuation)
  assert.equal(aSix.san, "a6");
  assert.equal(aSix.variations.length, 1, "3...a6 has the Berlin as a sideline");

  const berlin = aSix.variations[0];
  assert.equal(berlin[0].san, "Nf6");
  assert.equal(berlin[0].commentAfter, "The Berlin Defence.");
  assert.deepEqual(berlin[0].path, [5, "v0", 0]);
  assert.equal(pathKey(berlin[0].path), "5.v0.0");
});

test("a variation nested inside a variation gets a doubly-nested path and depth 2", () => {
  const tree = buildTree();
  const berlin = tree.mainLine[5].variations[0]; // Nf6, O-O, Nxe4, d4, Nd6
  const nxe4 = berlin[2]; // 4... Nxe4
  assert.equal(nxe4.san, "Nxe4");
  assert.equal(nxe4.variations.length, 1, "4...Nxe4 has the Be7 alternative nested under it");

  const be7Line = nxe4.variations[0];
  assert.equal(be7Line[0].san, "Be7");
  assert.equal(be7Line[0].commentAfter, "A quieter Berlin move order.");
  assert.equal(be7Line[0].variationDepth, 2);
  assert.deepEqual(be7Line[0].path, [5, "v0", 2, "v0", 0]);
});

test("click-to-jump reaches the exact position at any nesting depth (ticket 0005)", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  const be7Line = tree.mainLine[5].variations[0][2].variations[0];

  cursor.jumpTo(be7Line[0].path);
  assert.equal(cursor.getCurrentNode().san, "Be7");

  const chess = new Chess();
  chess.move("e4"); chess.move("e5"); chess.move("Nf3"); chess.move("Nc6");
  chess.move("Bb5"); chess.move("Nf6"); chess.move("O-O"); chess.move("Be7");
  assert.equal(cursor.getCurrentFen(), chess.fen());
});

test("jumpTo an unknown path throws rather than silently landing somewhere wrong", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  assert.throws(() => cursor.jumpTo([99, "v0", 0]));
});

test("%cal/%csl annotations are parsed into cm-chessboard-shaped arrows/markers", () => {
  const tree = buildTree();
  const d4Move = tree.mainLine[5].variations[0][3]; // 5. d4 inside the Berlin
  assert.equal(d4Move.san, "d4");
  assert.deepEqual(d4Move.arrows, [
    { color: "success", from: "d4", to: "e5" },
    { color: "danger", from: "b5", to: "c6" },
  ]);
  assert.deepEqual(d4Move.markers, [{ color: "success", square: "e4" }]);
});

test("comments (before/after a move) are exposed as commentBefore/commentAfter", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4];
  assert.equal(bb5.commentAfter, "The Ruy Lopez.");
});

test("isCollapsedByDefault: mainline moves are never collapsed", () => {
  const tree = buildTree();
  tree.mainLine.forEach((node) => assert.equal(isCollapsedByDefault(node), false));
});

test("isCollapsedByDefault: first 2 plies of a sideline stay expanded, the rest collapse", () => {
  const tree = buildTree();
  const berlin = tree.mainLine[5].variations[0]; // Nf6, O-O, Nxe4, d4, Nd6
  assert.equal(isCollapsedByDefault(berlin[0]), false); // ply 1: Nf6
  assert.equal(isCollapsedByDefault(berlin[1]), false); // ply 2: O-O
  assert.equal(isCollapsedByDefault(berlin[2]), true); // ply 3: Nxe4 — collapses by default
  assert.equal(isCollapsedByDefault(berlin[3]), true); // ply 4: d4 — still collapsed
});

test("cursor.stepForward walks the mainline one ply at a time from the start", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  assert.equal(cursor.getCurrentNode(), null); // start position
  assert.equal(cursor.stepForward().san, "e4");
  assert.equal(cursor.stepForward().san, "e5");
});

test("cursor.stepBackward from a sideline's first move returns to the branch point, not the start", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  const berlin = tree.mainLine[5].variations[0];
  cursor.jumpTo(berlin[0].path); // 3...Nf6 (Berlin)
  const back = cursor.stepBackward();
  // The Berlin replaces 3...a6, which itself follows 3.Bb5 — stepping back
  // from the sideline's first move must land on 3.Bb5, not on the game start.
  assert.equal(back.san, "Bb5");
});

test("cursor.stepBackward from the mainline's first move returns to the start (null node)", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  cursor.jumpTo([0]);
  assert.equal(cursor.stepBackward(), null);
  assert.equal(cursor.getCurrentPathKey(), "start");
});

test("cursor.stepForward inside a sideline continues that sideline, not the mainline", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  const berlin = tree.mainLine[5].variations[0];
  cursor.jumpTo(berlin[0].path); // 3...Nf6
  assert.equal(cursor.stepForward().san, "O-O");
});

test("ROOT_PATH maps to the 'start' pathKey", () => {
  assert.equal(pathKey(ROOT_PATH), "start");
});

test("continuationsFrom the start position offers only the mainline's first move when there's no sideline there", () => {
  const tree = buildTree();
  const options = continuationsFrom(null, tree.mainLine);
  assert.deepEqual(options.map((n) => n.san), ["e4"]);
});

test("continuationsFrom a branch point offers the mainline continuation plus every attached sideline", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4]; // 3. Bb5
  const options = continuationsFrom(bb5, tree.mainLine);
  // 3...a6 is the mainline reply; 3...Nf6 (Berlin) is the attached sideline.
  assert.deepEqual(options.map((n) => n.san), ["a6", "Nf6"]);
});

test("continuationsFrom the end of a line (no more moves) is empty", () => {
  const tree = buildTree();
  const last = tree.mainLine[tree.mainLine.length - 1];
  assert.deepEqual(continuationsFrom(last, tree.mainLine), []);
});

test("findContinuationBySan matches a board move against the loaded tree, mainline or sideline", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4];
  assert.equal(findContinuationBySan(bb5, tree.mainLine, "Nf6").commentAfter, "The Berlin Defence.");
  assert.equal(findContinuationBySan(bb5, tree.mainLine, "a6").san, "a6");
});

test("findContinuationBySan returns null for a move that deviates from the loaded tree entirely", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4];
  assert.equal(findContinuationBySan(bb5, tree.mainLine, "Qh5"), null);
});

test("moveNumber/turn are derived from the FEN, correct even for pgn-parser's null black moveNumber", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4]; // 3.Bb5
  assert.equal(bb5.turn, "w");
  assert.equal(bb5.moveNumber, 3);
  const aSix = tree.mainLine[5]; // 3...a6
  assert.equal(aSix.turn, "b");
  assert.equal(aSix.moveNumber, 3);
});

test("from/to squares are recorded on every node (needed for last-move highlighting)", () => {
  const tree = buildTree();
  assert.equal(tree.mainLine[0].from, "e2");
  assert.equal(tree.mainLine[0].to, "e4");
});

test("formatMoveLabel matches the prototype's notation exactly: '8.c3' / '8...d6', no space", () => {
  const tree = buildTree();
  assert.equal(formatMoveLabel(tree.mainLine[4]), "3.Bb5");
  assert.equal(formatMoveLabel(tree.mainLine[5]), "3...a6");
  assert.equal(formatMoveLabel(null), null);
});

// ---- addMove ("Lock PGN" off: free play grows the tree) -------------------

test("addMove extends a line that currently ends at the cursor (no existing continuation)", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  const last = tree.mainLine[tree.mainLine.length - 1]; // 5...Be7, the end of the loaded line
  assert.equal(continuationsFrom(last, tree.mainLine).length, 0, "sanity: nothing recorded past this point");

  const moveResult = playMoveResult(last.fen, "d3");
  const newNode = addMove(tree, last, moveResult);

  assert.equal(newNode.san, "d3");
  assert.deepEqual(newNode.path, [10]);
  assert.equal(newNode.pathKey, "10");
  assert.equal(newNode.indexInLine, 10);
  assert.equal(newNode.lineNodes, last.lineNodes, "extends the same line array the cursor was on");
  assert.equal(tree.mainLine[10], newNode, "mainLine itself grew");
  assert.equal(tree.nodesByPath.get("10"), newNode, "addressable like any other node");
  assert.equal(newNode.entryPointKey, last.entryPointKey);
});

test("addMove from the very start (no moves loaded yet) appends the tree's first move", () => {
  const parsed = parseGame(parse, `[Event "Empty"]\n\n*`);
  const tree = buildGameTree(Chess, parsed);
  assert.equal(tree.mainLine.length, 0);

  const moveResult = playMoveResult(tree.rootFen, "e4");
  const newNode = addMove(tree, null, moveResult);

  assert.deepEqual(newNode.path, [0]);
  assert.equal(newNode.entryPointKey, "start");
  assert.equal(tree.mainLine[0], newNode);
});

test("addMove creates a new sideline when the cursor's position already has a different recorded continuation", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4]; // 3.Bb5 — already has "a6" (mainline) and "Nf6" (Berlin sideline)
  const aSix = tree.mainLine[5];
  assert.equal(aSix.variations.length, 1, "sanity: one sideline (the Berlin) already attached");

  const moveResult = playMoveResult(bb5.fen, "d6"); // a third, never-before-seen reply
  const newNode = addMove(tree, bb5, moveResult);

  assert.equal(aSix.variations.length, 2, "the new reply is attached as a second sideline off 3...a6");
  assert.equal(aSix.variations[1][0], newNode);
  assert.equal(newNode.san, "d6");
  assert.deepEqual(newNode.path, [5, "v1", 0]);
  assert.equal(newNode.pathKey, "5.v1.0");
  assert.equal(newNode.entryPointKey, bb5.pathKey, "stepping back from it returns to 3.Bb5, same as the Berlin does");
  assert.equal(tree.nodesByPath.get("5.v1.0"), newNode);
});

test("addMove creates a new sideline off the mainline's very first move when played from the start position", () => {
  const tree = buildTree();
  assert.equal(tree.mainLine[0].variations.length, 0, "sanity: no sideline recorded on 1.e4 yet");

  const moveResult = playMoveResult(tree.rootFen, "d4"); // deviates from 1.e4 itself
  const newNode = addMove(tree, null, moveResult);

  assert.equal(tree.mainLine[0].variations.length, 1);
  assert.equal(tree.mainLine[0].variations[0][0], newNode);
  assert.deepEqual(newNode.path, [0, "v0", 0]);
  assert.equal(newNode.entryPointKey, "start");
});

test("addMove: the newly added node is navigable afterward via the cursor, like any other node", () => {
  const tree = buildTree();
  const cursor = createCursor(tree);
  const bb5 = tree.mainLine[4];
  const moveResult = playMoveResult(bb5.fen, "d6");
  const newNode = addMove(tree, bb5, moveResult);

  cursor.jumpTo(newNode.path);
  assert.equal(cursor.getCurrentNode(), newNode);
  assert.equal(cursor.getCurrentFen(), moveResult.fen);
  const back = cursor.stepBackward();
  assert.equal(back, bb5, "stepping back from the newly-added sideline returns to the branch point");
});

test("addMove: a continuation added while unlocked is then found by findContinuationBySan (Lock PGN back on sees it)", () => {
  const tree = buildTree();
  const bb5 = tree.mainLine[4];
  const moveResult = playMoveResult(bb5.fen, "d6");
  addMove(tree, bb5, moveResult);

  const match = findContinuationBySan(bb5, tree.mainLine, "d6");
  assert.ok(match, "the move added while Lock PGN was off is now a legitimate tree continuation");
  assert.equal(match.san, "d6");
});

// ---- serializeGameTree (persisting a grown tree back to PGN text) --------

test("serializeGameTree round-trips the fixture unchanged: comments, %cal/%csl, and nested variations survive re-parsing", () => {
  const tree = buildTree();
  const pgnText = serializeGameTree(tree);

  const reparsed = buildGameTree(Chess, parseGame(parse, pgnText));

  function plain(nodes) {
    return nodes.map((n) => ({
      san: n.san,
      commentBefore: n.commentBefore,
      commentAfter: n.commentAfter,
      arrows: n.arrows,
      markers: n.markers,
      variations: n.variations.map(plain),
    }));
  }

  assert.deepEqual(plain(reparsed.mainLine), plain(tree.mainLine));
  assert.equal(reparsed.tags.Event, tree.tags.Event);
});

test("serializeGameTree includes a move added via addMove, so it survives a reload", () => {
  const tree = buildTree();
  const last = tree.mainLine[tree.mainLine.length - 1];
  const moveResult = playMoveResult(last.fen, "d3");
  addMove(tree, last, moveResult);

  const pgnText = serializeGameTree(tree);
  const reparsed = buildGameTree(Chess, parseGame(parse, pgnText));

  assert.equal(reparsed.mainLine.length, 11);
  assert.equal(reparsed.mainLine[10].san, "d3");
});
