import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSanMoves,
  lichessGameToRecord,
  parseLichessNdjson,
  chessComGameToRecord,
  parseChessComGames,
  filterRecords,
  buildTree,
  childrenOf,
  nodeAtPath,
} from "./engine.js";

// ---------------------------------------------------------------------------
// extractSanMoves — Chess.com's PGN movetext (headers + move numbers + clock
// comments + a result token), the format both fixtures below are drawn from.
// ---------------------------------------------------------------------------

test("extractSanMoves pulls a plain SAN list out of clocked PGN movetext", () => {
  const pgn = [
    '[Event "Live Chess"]',
    '[White "Hikaru"]',
    '[Black "Gravity_Chess"]',
    '[Result "1-0"]',
    "",
    "1. e4 {[%clk 0:03:00]} 1... c5 {[%clk 0:03:00]} 2. Nc3 {[%clk 0:02:59.9]} 2... g6 {[%clk 0:02:57.5]} 1-0",
  ].join("\n");

  assert.deepEqual(extractSanMoves(pgn), ["e4", "c5", "Nc3", "g6"]);
});

test("extractSanMoves strips NAGs and parenthesised sidelines defensively", () => {
  const pgn = "1. e4 e5 2. Nf3 $1 (2. Bc4 Nc6) Nc6 3. Bb5 a6 1/2-1/2";
  assert.deepEqual(extractSanMoves(pgn), ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]);
});

test("extractSanMoves returns an empty array for a headers-only/empty movetext", () => {
  assert.deepEqual(extractSanMoves('[Event "x"]\n\n*'), []);
});

// ---------------------------------------------------------------------------
// lichessGameToRecord / parseLichessNdjson
// ---------------------------------------------------------------------------

function lichessLine(overrides = {}) {
  return {
    id: "abcd1234",
    rated: true,
    variant: "standard",
    speed: "blitz",
    createdAt: 1700000000000,
    players: {
      white: { user: { name: "Foo" }, rating: 1500 },
      black: { user: { name: "Bar" }, rating: 1600 },
    },
    winner: "white",
    moves: "e4 e5 Nf3 Nc6 Bc4",
    ...overrides,
  };
}

test("lichessGameToRecord matches the studied username case-insensitively as White", () => {
  const record = lichessGameToRecord(lichessLine(), "foo");
  assert.equal(record.color, "white");
  assert.equal(record.outcome, "win");
  assert.deepEqual(record.moves, ["e4", "e5", "Nf3", "Nc6", "Bc4"]);
  assert.equal(record.speed, "blitz");
  assert.equal(record.rated, true);
  assert.equal(record.playedAt, 1700000000000);
  assert.equal(record.url, "https://lichess.org/abcd1234");
});

test("lichessGameToRecord matches as Black and scores a loss when the other side wins", () => {
  const record = lichessGameToRecord(lichessLine({ winner: "white" }), "bar");
  assert.equal(record.color, "black");
  assert.equal(record.outcome, "loss");
});

test("lichessGameToRecord scores a draw when there is no winner field", () => {
  const line = lichessLine();
  delete line.winner;
  const record = lichessGameToRecord(line, "foo");
  assert.equal(record.outcome, "draw");
});

test("lichessGameToRecord returns null when the username matches neither side", () => {
  assert.equal(lichessGameToRecord(lichessLine(), "someoneElse"), null);
});

test("lichessGameToRecord drops non-standard variants", () => {
  assert.equal(
    lichessGameToRecord(lichessLine({ variant: "crazyhouse" }), "foo"),
    null,
  );
});

test("parseLichessNdjson parses one JSON object per line and skips blank lines", () => {
  const text = [
    JSON.stringify(lichessLine({ winner: "white" })),
    "",
    JSON.stringify(lichessLine({ winner: "black" })),
  ].join("\n");

  const records = parseLichessNdjson(text, "foo");
  assert.equal(records.length, 2);
  assert.equal(records[0].outcome, "win");
  assert.equal(records[1].outcome, "loss");
});

// ---------------------------------------------------------------------------
// chessComGameToRecord / parseChessComGames
// ---------------------------------------------------------------------------

function chessComGame(overrides = {}) {
  return {
    url: "https://www.chess.com/game/live/97872578329",
    pgn: "1. e4 {[%clk 0:03:00]} 1... c5 {[%clk 0:02:58]} 2. Nc3 g6 1-0",
    time_class: "blitz",
    rated: true,
    rules: "chess",
    end_time: 1700000000,
    white: { username: "Hikaru", result: "win", rating: 3200 },
    black: { username: "Gravity_Chess", result: "resigned", rating: 2800 },
    ...overrides,
  };
}

test("chessComGameToRecord matches the studied username case-insensitively as Black", () => {
  const record = chessComGameToRecord(chessComGame(), "gravity_chess");
  assert.equal(record.color, "black");
  assert.equal(record.outcome, "loss");
  assert.deepEqual(record.moves, ["e4", "c5", "Nc3", "g6"]);
  assert.equal(record.speed, "blitz");
  assert.equal(record.rated, true);
  assert.equal(record.playedAt, 1700000000000);
  assert.equal(record.url, "https://www.chess.com/game/live/97872578329");
});

test("chessComGameToRecord scores a draw when neither side's result is 'win'", () => {
  const game = chessComGame({
    white: { username: "Hikaru", result: "agreed", rating: 3200 },
    black: { username: "Gravity_Chess", result: "agreed", rating: 2800 },
  });
  const record = chessComGameToRecord(game, "hikaru");
  assert.equal(record.outcome, "draw");
});

test("chessComGameToRecord returns null when the username matches neither side", () => {
  assert.equal(chessComGameToRecord(chessComGame(), "someoneElse"), null);
});

test("chessComGameToRecord drops non-standard rules variants", () => {
  assert.equal(
    chessComGameToRecord(chessComGame({ rules: "chess960" }), "hikaru"),
    null,
  );
});

test("parseChessComGames maps a raw archive games array, dropping non-matches", () => {
  const games = [chessComGame(), chessComGame({ rules: "bughouse" })];
  const records = parseChessComGames(games, "hikaru");
  assert.equal(records.length, 1);
  assert.equal(records[0].color, "white");
});

// ---------------------------------------------------------------------------
// filterRecords
// ---------------------------------------------------------------------------

function record(overrides = {}) {
  return {
    moves: ["e4", "e5"],
    color: "white",
    outcome: "win",
    speed: "blitz",
    rated: true,
    playedAt: 1700000000000,
    url: "https://example.com/game/1",
    ...overrides,
  };
}

test("filterRecords narrows by speed", () => {
  const records = [record({ speed: "bullet" }), record({ speed: "blitz" })];
  assert.deepEqual(filterRecords(records, { speeds: ["blitz"] }), [records[1]]);
});

test("filterRecords narrows by rated-only", () => {
  const records = [record({ rated: true }), record({ rated: false })];
  assert.deepEqual(filterRecords(records, { rated: true }), [records[0]]);
});

test("filterRecords with no filters returns every record unchanged", () => {
  const records = [record(), record({ speed: "bullet" })];
  assert.deepEqual(filterRecords(records, {}), records);
});

// ---------------------------------------------------------------------------
// buildTree / childrenOf / nodeAtPath
// ---------------------------------------------------------------------------

test("buildTree aggregates total games and win/draw/loss at the root", () => {
  const records = [
    record({ moves: ["e4", "e5"], outcome: "win" }),
    record({ moves: ["e4", "c5"], outcome: "loss" }),
    record({ moves: ["d4", "d5"], outcome: "draw" }),
  ];
  const root = buildTree(records);
  assert.equal(root.total, 3);
  assert.equal(root.wins, 1);
  assert.equal(root.losses, 1);
  assert.equal(root.draws, 1);
});

test("buildTree merges games sharing a move prefix into the same node", () => {
  const records = [
    record({ moves: ["e4", "e5"], outcome: "win" }),
    record({ moves: ["e4", "c5"], outcome: "loss" }),
  ];
  const root = buildTree(records);
  assert.equal(root.children.e4.total, 2);
  assert.equal(root.children.e4.children.e5.total, 1);
  assert.equal(root.children.e4.children.c5.total, 1);
});

test("buildTree caps how many plies deep it records (maxPly)", () => {
  const records = [record({ moves: ["e4", "e5", "Nf3", "Nc6"] })];
  const root = buildTree(records, { maxPly: 2 });
  assert.ok(root.children.e4.children.e5);
  assert.deepEqual(Object.keys(root.children.e4.children.e5.children), []);
});

test("buildTree tracks which games reached each node, so a variation's actual games can be opened", () => {
  const gameA = record({ moves: ["e4", "e5"], outcome: "win", url: "https://x/a" });
  const gameB = record({ moves: ["e4", "c5"], outcome: "loss", url: "https://x/b" });
  const root = buildTree([gameA, gameB]);

  assert.equal(root.games.length, 2);
  assert.equal(root.children.e4.games.length, 2);
  assert.deepEqual(
    root.children.e4.children.e5.games.map((g) => g.url),
    ["https://x/a"],
  );
  assert.deepEqual(
    root.children.e4.children.c5.games.map((g) => g.url),
    ["https://x/b"],
  );
});

test("buildTree's per-node games entries carry outcome/speed/rated/playedAt alongside the url", () => {
  const game = record({
    moves: ["e4"],
    outcome: "win",
    speed: "rapid",
    rated: false,
    playedAt: 1234,
    url: "https://x/a",
  });
  const root = buildTree([game]);

  assert.deepEqual(root.children.e4.games[0], {
    url: "https://x/a",
    outcome: "win",
    speed: "rapid",
    rated: false,
    playedAt: 1234,
  });
});

test("childrenOf sorts by popularity and computes rates", () => {
  const root = buildTree([
    record({ moves: ["e4"], outcome: "win" }),
    record({ moves: ["e4"], outcome: "win" }),
    record({ moves: ["d4"], outcome: "loss" }),
  ]);
  const children = childrenOf(root);
  assert.deepEqual(
    children.map((c) => c.san),
    ["e4", "d4"],
  );
  assert.equal(children[0].total, 2);
  assert.equal(children[0].winRate, 1);
  assert.equal(children[1].lossRate, 1);
});

test("childrenOf returns an empty array for a leaf node", () => {
  const root = buildTree([record({ moves: [] })]);
  assert.deepEqual(childrenOf(root), []);
});

test("nodeAtPath walks down a sequence of SAN moves", () => {
  const root = buildTree([record({ moves: ["e4", "e5", "Nf3"] })]);
  const node = nodeAtPath(root, ["e4", "e5"]);
  assert.equal(node.total, 1);
  assert.ok(node.children.Nf3);
});

test("nodeAtPath returns null for a path the tree doesn't contain", () => {
  const root = buildTree([record({ moves: ["e4"] })]);
  assert.equal(nodeAtPath(root, ["d4"]), null);
});

test("nodeAtPath with an empty path returns the root itself", () => {
  const root = buildTree([record({ moves: ["e4"] })]);
  assert.equal(nodeAtPath(root, []), root);
});
