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
} from "./moveTree.js";

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

test("parseGames returns an array even for a single-game file", () => {
  const games = parseGames(parse, RUY_LOPEZ_PGN);
  assert.equal(games.length, 1);
  assert.equal(games[0].tags.Event, "Club Training");
});

test("parseGames splits a multi-game file into one entry per game", () => {
  const twoGames = `${RUY_LOPEZ_PGN}\n\n[Event "Second"]\n1. d4 d5 *`;
  const games = parseGames(parse, twoGames);
  assert.equal(games.length, 2);
  assert.equal(games[1].tags.Event, "Second");
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
