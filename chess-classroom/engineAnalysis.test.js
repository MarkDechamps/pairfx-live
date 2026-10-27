import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  parseInfoLine,
  scoreForWhite,
  formatScore,
  pvToSan,
  createEngineSession,
  normalizeEngineSettings,
  lineArrows,
  DEFAULT_ENGINE_SETTINGS,
} from "./engineAnalysis.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

// ---- parseInfoLine ------------------------------------------------------

test("parseInfoLine reads depth, multipv, cp score and pv", () => {
  const info = parseInfoLine(
    "info depth 18 seldepth 24 multipv 2 score cp -35 nodes 123 nps 456 time 7 pv e7e5 g1f3 b8c6"
  );
  assert.deepEqual(info, { depth: 18, multipv: 2, score: { type: "cp", value: -35 }, pv: ["e7e5", "g1f3", "b8c6"] });
});

test("parseInfoLine reads a mate score and defaults multipv to 1", () => {
  const info = parseInfoLine("info depth 5 score mate -3 pv h7h6");
  assert.deepEqual(info, { depth: 5, multipv: 1, score: { type: "mate", value: -3 }, pv: ["h7h6"] });
});

test("parseInfoLine ignores lines without a score", () => {
  assert.equal(parseInfoLine("info string NNUE evaluation using nn.nnue"), null);
  assert.equal(parseInfoLine("info depth 10 currmove e2e4 currmovenumber 1"), null);
  assert.equal(parseInfoLine("bestmove e2e4 ponder e7e5"), null);
  assert.equal(parseInfoLine("readyok"), null);
});

// ---- score formatting -----------------------------------------------------

test("scoreForWhite flips the engine's side-to-move score when black is to move", () => {
  assert.deepEqual(scoreForWhite({ type: "cp", value: 30 }, START_FEN), { type: "cp", value: 30 });
  assert.deepEqual(scoreForWhite({ type: "cp", value: 30 }, AFTER_E4_FEN), { type: "cp", value: -30 });
  assert.deepEqual(scoreForWhite({ type: "mate", value: 2 }, AFTER_E4_FEN), { type: "mate", value: -2 });
  assert.deepEqual(scoreForWhite({ type: "mate", value: 0 }, AFTER_E4_FEN), { type: "mate", value: 0 });
});

test("formatScore renders pawns with a sign and mates with #", () => {
  assert.equal(formatScore({ type: "cp", value: 35 }), "+0.35");
  assert.equal(formatScore({ type: "cp", value: -120 }), "-1.20");
  assert.equal(formatScore({ type: "cp", value: 0 }), "0.00");
  assert.equal(formatScore({ type: "mate", value: 3 }), "#3");
  assert.equal(formatScore({ type: "mate", value: -2 }), "-#2");
  assert.equal(formatScore({ type: "mate", value: 0 }), "#");
});

// ---- pvToSan ---------------------------------------------------------------

test("pvToSan numbers a line starting with white to move", () => {
  assert.equal(pvToSan(Chess, START_FEN, ["e2e4", "e7e5", "g1f3"]), "1. e4 e5 2. Nf3");
});

test("pvToSan uses N... when the line starts with black to move", () => {
  assert.equal(pvToSan(Chess, AFTER_E4_FEN, ["e7e5", "g1f3", "b8c6"]), "1... e5 2. Nf3 Nc6");
});

test("pvToSan handles promotion and caps the line length", () => {
  const fen = "8/4P3/8/8/8/8/k7/4K3 w - - 0 50";
  assert.equal(pvToSan(Chess, fen, ["e7e8q", "a2b2", "e8e5"], 2), "50. e8=Q Kb2");
});

test("pvToSan stops at the first illegal move instead of throwing", () => {
  assert.equal(pvToSan(Chess, START_FEN, ["e2e4", "e2e4", "g1f3"]), "1. e4");
});

// ---- createEngineSession ----------------------------------------------------

function fakeEngine() {
  const sent = [];
  const updates = [];
  const session = createEngineSession({
    send: (cmd) => sent.push(cmd),
    onUpdate: (snap) => updates.push(snap),
    multiPv: 2,
    depth: 12,
  });
  return { sent, updates, session };
}

test("session configures the engine once, then starts a search per position", () => {
  const { sent, session } = fakeEngine();
  assert.deepEqual(sent, [
    "uci",
    "setoption name MultiPV value 2",
    "setoption name Hash value 16",
    "isready",
  ]);
  session.analyze(START_FEN);
  assert.deepEqual(sent.slice(4), [`position fen ${START_FEN}`, "go depth 12"]);
  assert.equal(session.isSearching(), true);
});

test("analyzing the same position again does not restart the search", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  const count = sent.length;
  session.analyze(START_FEN);
  assert.equal(sent.length, count);
});

test("info lines are collected per multipv, sorted, with the deepest depth reported", () => {
  const { updates, session } = fakeEngine();
  session.analyze(START_FEN);
  session.handleLine("info depth 10 multipv 2 score cp 20 pv d2d4");
  session.handleLine("info depth 10 multipv 1 score cp 30 pv e2e4");
  session.handleLine("info depth 11 multipv 1 score cp 28 pv e2e4 e7e5");
  session.handleLine("info depth 10 multipv 3 score cp 5 pv a2a3"); // beyond multiPv: ignored
  const last = updates.at(-1);
  assert.equal(last.fen, START_FEN);
  assert.equal(last.depth, 11);
  assert.deepEqual(last.lines, [
    { multipv: 1, score: { type: "cp", value: 28 }, pv: ["e2e4", "e7e5"] },
    { multipv: 2, score: { type: "cp", value: 20 }, pv: ["d2d4"] },
  ]);
});

test("changing position stops the old search and waits for its bestmove before starting the next", () => {
  const { sent, updates, session } = fakeEngine();
  session.analyze(START_FEN);
  session.analyze(AFTER_E4_FEN);
  assert.deepEqual(sent.slice(6), ["stop"], "no position/go while the old search still runs");
  const before = updates.length;
  session.handleLine("info depth 9 multipv 1 score cp 30 pv d2d4"); // old search, stale
  assert.equal(updates.length, before);
  session.handleLine("bestmove d2d4");
  assert.deepEqual(sent.slice(7), [`position fen ${AFTER_E4_FEN}`, "go depth 12"]);
  assert.equal(session.isSearching(), true);
  session.handleLine("info depth 9 multipv 1 score cp -25 pv e7e5");
  assert.deepEqual(updates.at(-1).lines, [{ multipv: 1, score: { type: "cp", value: -25 }, pv: ["e7e5"] }]);
  session.handleLine("bestmove e7e5");
  assert.equal(session.isSearching(), false);
});

test("several quick position changes send one stop and then search only the latest position", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  session.analyze(AFTER_E4_FEN);
  session.analyze("8/8/8/8/8/8/k7/4K3 w - - 0 1");
  session.analyze(START_FEN); // back to where the running search already is
  assert.deepEqual(sent.slice(6), ["stop"]);
  session.handleLine("bestmove e2e4");
  assert.deepEqual(sent.slice(7), [`position fen ${START_FEN}`, "go depth 12"]);
});

test("a search that finished on its own doesn't send a stop on the next position", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  session.handleLine("bestmove e2e4");
  session.analyze(AFTER_E4_FEN);
  assert.equal(sent.includes("stop"), false);
});

test("stop() halts the search, ignores later output, and lets the same position be re-analyzed", () => {
  const { sent, updates, session } = fakeEngine();
  session.analyze(START_FEN);
  session.stop();
  assert.equal(sent.at(-1), "stop");
  const before = updates.length;
  session.handleLine("info depth 9 multipv 1 score cp 30 pv e2e4");
  assert.equal(updates.length, before);
  session.handleLine("bestmove e2e4");
  assert.equal(sent.at(-1), "stop", "stopping never restarts a search on its own");
  session.analyze(START_FEN);
  assert.equal(sent.at(-1), "go depth 12");
});

test("turning the engine back on before the stopped search ends waits for its bestmove", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  session.stop();
  session.analyze(START_FEN);
  assert.equal(sent.at(-1), "stop");
  session.handleLine("bestmove e2e4");
  assert.deepEqual(sent.slice(-2), [`position fen ${START_FEN}`, "go depth 12"]);
});

test("stop() while idle sends nothing", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  session.handleLine("bestmove e2e4");
  session.stop();
  assert.equal(sent.includes("stop"), false);
});

// ---- configure ---------------------------------------------------------------

test("configure while idle with no position only sends the changed options", () => {
  const { sent, session } = fakeEngine();
  const before = sent.length;
  session.configure({ multiPv: 4, depth: 15, hash: 64 });
  assert.deepEqual(sent.slice(before), ["setoption name MultiPV value 4", "setoption name Hash value 64"]);
});

test("configure during a search stops it and applies options before the restart", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  const before = sent.length;
  session.configure({ multiPv: 1, depth: 9, hash: 32 });
  assert.deepEqual(sent.slice(before), ["stop"]);
  session.handleLine("bestmove e2e4");
  assert.deepEqual(sent.slice(before + 1), [
    "setoption name MultiPV value 1",
    "setoption name Hash value 32",
    `position fen ${START_FEN}`,
    "go depth 9",
  ]);
});

test("configure with only a depth change restarts without resending options", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  session.handleLine("bestmove e2e4");
  const before = sent.length;
  session.configure({ depth: 20 });
  assert.deepEqual(sent.slice(before), [`position fen ${START_FEN}`, "go depth 20"]);
});

test("configure after stop() defers options until the old search's bestmove", () => {
  const { sent, session } = fakeEngine();
  session.analyze(START_FEN);
  session.stop();
  const before = sent.length;
  session.configure({ multiPv: 5 });
  assert.equal(sent.length, before);
  session.handleLine("bestmove e2e4");
  assert.deepEqual(sent.slice(before), ["setoption name MultiPV value 5", "setoption name Hash value 16"]);
});

test("lines beyond a lowered multiPv are ignored", () => {
  const { updates, session } = fakeEngine();
  session.analyze(START_FEN);
  session.configure({ multiPv: 1 });
  session.handleLine("bestmove e2e4");
  session.handleLine("info depth 5 multipv 2 score cp 10 pv e2e4");
  session.handleLine("info depth 5 multipv 1 score cp 10 pv e2e4");
  assert.deepEqual(updates.at(-1).lines.map((l) => l.multipv), [1]);
});

// ---- settings + arrows ---------------------------------------------------------

test("normalizeEngineSettings clamps, validates and fills defaults", () => {
  assert.deepEqual(normalizeEngineSettings(null), DEFAULT_ENGINE_SETTINGS);
  assert.deepEqual(normalizeEngineSettings({ multiPv: 99, depth: 1, hash: 100, arrows: "yes" }), {
    multiPv: 5,
    depth: 8,
    hash: DEFAULT_ENGINE_SETTINGS.hash,
    arrows: true,
    projectorArrows: false,
  });
  assert.deepEqual(normalizeEngineSettings({ multiPv: 2, depth: 18.4, hash: 128, arrows: false }), {
    multiPv: 2,
    depth: 18,
    hash: 128,
    arrows: false,
    projectorArrows: false,
  });
  assert.equal(normalizeEngineSettings({ projectorArrows: true }).projectorArrows, true);
});

test("lineArrows takes the first move of each line", () => {
  const lines = [
    { multipv: 1, score: { type: "cp", value: 10 }, pv: ["e2e4", "e7e5"] },
    { multipv: 2, score: { type: "cp", value: 5 }, pv: ["g1f3"] },
    { multipv: 3, score: { type: "cp", value: 0 }, pv: [] },
  ];
  assert.deepEqual(lineArrows(lines), [
    { rank: 1, from: "e2", to: "e4" },
    { rank: 2, from: "g1", to: "f3" },
  ]);
});
