// Pure opening-tree logic: no DOM, no network, no chess.js. Every function here takes plain
// data in and returns plain data out, which is what makes `node --test` sufficient for it — see
// engine.test.js. app.js (DOM/fetch glue) is the only place chess.js gets involved, purely to
// turn a SAN path into a FEN for the on-screen board.
//
// A "record" is this module's platform-agnostic shape for one game, produced by
// lichessGameToRecord/chessComGameToRecord from each source's raw API shape:
//   { moves: string[] (SAN, mainline only), color: "white"|"black" (the studied player's side),
//     outcome: "win"|"draw"|"loss" (from the studied player's side), speed: string,
//     rated: boolean, playedAt: number|null (ms epoch) }

const RESULT_TOKENS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);

/**
 * Pulls a plain SAN move list out of PGN movetext (headers, move numbers, `{...}` clock/eval
 * comments, `$n` NAGs, and — defensively, though neither source emits them — `(...)` sidelines
 * are all stripped). Both Lichess's PGN export and Chess.com's `pgn` field share this shape.
 */
export function extractSanMoves(pgn) {
  const movetext = pgn.split(/\n\s*\n/).pop() ?? "";
  const withoutComments = movetext.replace(/\{[^}]*\}/g, " ");
  const withoutSidelines = withoutComments.replace(/\([^()]*\)/g, " ");
  const tokens = withoutSidelines.split(/\s+/).filter(Boolean);

  return tokens.filter((token) => {
    if (RESULT_TOKENS.has(token)) return false;
    if (/^\d+\.(\.\.)?$/.test(token)) return false; // move numbers: "1." / "1..."
    if (/^\$\d+$/.test(token)) return false; // NAGs
    return true;
  });
}

function matchColor(username, whiteName, blackName) {
  const needle = username.toLowerCase();
  if (whiteName && whiteName.toLowerCase() === needle) return "white";
  if (blackName && blackName.toLowerCase() === needle) return "black";
  return null;
}

/** One Lichess games-export NDJSON line -> a record, or null if it doesn't apply. */
export function lichessGameToRecord(game, username) {
  if (game.variant !== "standard") return null;

  const whiteName = game.players?.white?.user?.name;
  const blackName = game.players?.black?.user?.name;
  const color = matchColor(username, whiteName, blackName);
  if (!color) return null;

  const outcome = !game.winner ? "draw" : game.winner === color ? "win" : "loss";

  return {
    moves: (game.moves ?? "").split(/\s+/).filter(Boolean),
    color,
    outcome,
    speed: game.speed,
    rated: Boolean(game.rated),
    playedAt: game.createdAt ?? null,
  };
}

/** The raw NDJSON text from `GET /api/games/user/{username}` -> an array of records. */
export function parseLichessNdjson(text, username) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => lichessGameToRecord(JSON.parse(line), username))
    .filter((record) => record !== null);
}

function chessComOutcome(white, black, color) {
  const winner = white.result === "win" ? "white" : black.result === "win" ? "black" : null;
  if (!winner) return "draw";
  return winner === color ? "win" : "loss";
}

/** One Chess.com monthly-archive game object -> a record, or null if it doesn't apply. */
export function chessComGameToRecord(game, username) {
  if (game.rules !== "chess") return null;

  const color = matchColor(username, game.white?.username, game.black?.username);
  if (!color) return null;

  return {
    moves: extractSanMoves(game.pgn),
    color,
    outcome: chessComOutcome(game.white, game.black, color),
    speed: game.time_class,
    rated: Boolean(game.rated),
    playedAt: typeof game.end_time === "number" ? game.end_time * 1000 : null,
  };
}

/** A raw array of Chess.com game objects (as returned by one or more monthly archives) -> records. */
export function parseChessComGames(games, username) {
  return games
    .map((game) => chessComGameToRecord(game, username))
    .filter((record) => record !== null);
}

/** Narrows a record list by speed (array of allowed speeds) and/or rated-only. Both optional. */
export function filterRecords(records, { speeds, rated } = {}) {
  return records.filter((record) => {
    if (speeds && speeds.length && !speeds.includes(record.speed)) return false;
    if (rated === true && !record.rated) return false;
    if (rated === false && record.rated) return false;
    return true;
  });
}

function emptyNode() {
  return { total: 0, wins: 0, draws: 0, losses: 0, children: {} };
}

function addOutcome(node, outcome) {
  node.total += 1;
  if (outcome === "win") node.wins += 1;
  else if (outcome === "loss") node.losses += 1;
  else node.draws += 1;
}

const DEFAULT_MAX_PLY = 40;

/**
 * Merges every record's move sequence into one tree. The root's own stats are the totals across
 * every record passed in; each descendant node's stats are the totals across every record whose
 * move sequence passes through that exact position. `maxPly` bounds how many plies deep a single
 * game can extend the tree (a prep tool has no use for a 300-move correspondence game producing
 * a 300-node-deep single-child chain).
 */
export function buildTree(records, { maxPly = DEFAULT_MAX_PLY } = {}) {
  const root = emptyNode();

  for (const record of records) {
    let node = root;
    addOutcome(node, record.outcome);

    for (const san of record.moves.slice(0, maxPly)) {
      if (!node.children[san]) node.children[san] = emptyNode();
      node = node.children[san];
      addOutcome(node, record.outcome);
    }
  }

  return root;
}

/** The next moves out of `node`, most-played first, each annotated with win/draw/loss rates. */
export function childrenOf(node) {
  return Object.entries(node.children)
    .map(([san, child]) => ({
      san,
      total: child.total,
      wins: child.wins,
      draws: child.draws,
      losses: child.losses,
      winRate: child.total ? child.wins / child.total : 0,
      drawRate: child.total ? child.draws / child.total : 0,
      lossRate: child.total ? child.losses / child.total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Walks `path` (an array of SAN moves) down from `root`; null if the tree doesn't contain it. */
export function nodeAtPath(root, path) {
  let node = root;
  for (const san of path) {
    node = node.children[san];
    if (!node) return null;
  }
  return node;
}
