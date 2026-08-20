// Pure opening-trainer logic: no DOM, no network, no chess.js — see CONTEXT.md for the
// Repertoire/Node/Path glossary and docs/adr/0001 for why a Node's identity is its SAN path
// rather than a FEN (no automatic transposition merging). Every function here takes plain data
// in and returns plain data out, which is what makes `node --test` sufficient for it — see
// engine.test.js. app.js (DOM glue) is the only place chess.js gets involved, purely to turn a
// SAN path into a FEN for the on-screen board — same split as opening-tree/engine.js.

const RESULT_TOKENS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);

/**
 * Splits one uploaded PGN file's text into its games. A file can hold one game (a header
 * block, a blank line, then movetext) or many, each separated by a blank line. Movetext that
 * itself contains a blank line (rare — inside a `{...}` comment) would incorrectly split here;
 * v1 doesn't guard against that, matching the simplifying assumption opening-tree's own PGN
 * handling already makes.
 */
export function splitPgnGames(pgnText) {
  const paragraphs = pgnText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const games = [];
  let headers = null;
  let movetextParts = [];

  const flush = () => {
    if (headers !== null) games.push({ headers, movetext: movetextParts.join(" ") });
  };

  for (const paragraph of paragraphs) {
    if (/^\[\w+\s/.test(paragraph)) {
      flush();
      headers = paragraph;
      movetextParts = [];
    } else {
      movetextParts.push(paragraph);
    }
  }
  flush();

  return games;
}

/** A header block ("[Tag \"value\"]" per line) -> a plain {Tag: value} object. */
export function parseHeaders(headerBlock) {
  const headers = {};
  for (const match of headerBlock.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
    headers[match[1]] = match[2];
  }
  return headers;
}

/**
 * Movetext -> a flat token stream of just SAN moves, "(", and ")" — move numbers ("1.", "1..."),
 * `{...}` comments, `$n` NAGs, and result tokens are all stripped before the recursive
 * variation parser (mergeMovetextIntoTree) ever sees them, so that parser only has to deal with
 * moves and variation boundaries.
 */
function tokenizeMovetext(movetext) {
  const withoutComments = movetext.replace(/\{[^}]*\}/g, " ");
  const spaced = withoutComments.replace(/([()])/g, " $1 ");

  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => {
      if (token === "(" || token === ")") return true;
      if (RESULT_TOKENS.has(token)) return false;
      if (/^\d+\.(\.\.)?$/.test(token)) return false; // move numbers: "1." / "1..."
      if (/^\$\d+$/.test(token)) return false; // NAGs
      return true;
    })
    // Traditional annotation glyphs ("e4!", "Nf3?!", ...) are appended straight onto the move
    // itself rather than expressed as a separate "$n" NAG — strip them so the SAN stays a valid
    // tree key.
    .map((token) => (token === "(" || token === ")" ? token : token.replace(/[!?]+$/, "")));
}

function emptyNode() {
  return { children: {} };
}

function childOf(node, san) {
  if (!node.children[san]) node.children[san] = emptyNode();
  return node.children[san];
}

/**
 * Recursive-descent RAV parser: walks `tokens` from `pos.i` onward, playing moves out of
 * `node` until it hits the `)` that closes the variation it was called for (or the end of the
 * token stream, for the outermost call). A `(` branches from the position *before* the most
 * recently played move — i.e. it's a sibling of that move, not a child of it — so entering one
 * recurses with `beforeLastMove` as its starting node; the recursive call consumes its own
 * closing `)` and returns, and this loop then resumes exactly where it left off (`current`,
 * `beforeLastMove` are both untouched by a nested variation's own moves).
 */
function playTokens(tokens, pos, node) {
  let current = node;
  let beforeLastMove = node;

  while (pos.i < tokens.length) {
    const token = tokens[pos.i];

    if (token === ")") {
      pos.i += 1;
      return;
    }

    if (token === "(") {
      pos.i += 1;
      playTokens(tokens, pos, beforeLastMove);
      continue;
    }

    beforeLastMove = current;
    current = childOf(current, token);
    pos.i += 1;
  }
}

/** Merges one game's movetext (mainline + any RAV variations) into `root`, in place. */
export function mergeMovetextIntoTree(root, movetext) {
  const tokens = tokenizeMovetext(movetext);
  playTokens(tokens, { i: 0 }, root);
}

/**
 * Merges every game in every given PGN file's text into one Repertoire tree, keyed by SAN path
 * (ADR 0001 — no FEN/transposition merging; games only share nodes where their SAN paths are
 * literally identical prefixes, the same way opening-tree/engine.js's buildTree merges games).
 */
export function buildRepertoireTree(pgnTexts) {
  const root = emptyNode();
  for (const pgnText of pgnTexts) {
    for (const game of splitPgnGames(pgnText)) {
      mergeMovetextIntoTree(root, game.movetext);
    }
  }
  return root;
}

/** The moves tracked out of `node`, in first-encountered order (typically: mainline first). */
export function childrenOf(node) {
  return Object.entries(node.children).map(([san, child]) => ({ san, node: child }));
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

// ---------------------------------------------------------------------------
// Card lifecycle — simplified SM-2, binary correct/incorrect grading (docs/adr/0002). A Card
// lives on a Node once it's been trained at least once (see CONTEXT.md); untrained nodes have
// no `card` and count as "new" to pickNextDue below.
// ---------------------------------------------------------------------------

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_INTERVAL_DAYS = 365;

/** A fresh Card, immediately due. */
export function initCard(now = new Date()) {
  return { due: now.toISOString(), interval: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0 };
}

export function isDue(card, now = new Date()) {
  return new Date(card.due).getTime() <= now.getTime();
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Grades a Card after one training attempt. Correct: the interval grows by the current ease
 * factor (or starts at 1 day, the first time this Card is ever answered correctly) and ease
 * nudges up. Incorrect: the interval resets to 0 (so the card is due again immediately — see
 * `pickNextDue`'s `excludePath`, which is how a session avoids repeating it back-to-back) and
 * ease nudges down; `reps` (consecutive correct answers) resets too, matching SM-2's own
 * "a lapse restarts learning" rule. Ease is clamped to `[MIN_EASE, MAX_EASE]` either direction.
 */
export function gradeCard(card, correct, now = new Date()) {
  if (correct) {
    const interval = card.interval === 0 ? 1 : Math.min(Math.round(card.interval * card.ease), MAX_INTERVAL_DAYS);
    return {
      due: addDays(now, interval).toISOString(),
      interval,
      ease: Math.min(card.ease + 0.1, MAX_EASE),
      reps: card.reps + 1,
      lapses: card.lapses,
    };
  }

  return {
    due: now.toISOString(),
    interval: 0,
    ease: Math.max(card.ease - 0.2, MIN_EASE),
    reps: 0,
    lapses: card.lapses + 1,
  };
}

// ---------------------------------------------------------------------------
// Scope resolution and session ordering (CONTEXT.md's Scope/Method). "review-in-order" needs no
// function of its own: nodesInScope's own pre-order walk (self, then children in childrenOf's
// first-encountered order) already *is* that traversal.
// ---------------------------------------------------------------------------

function collectDescendants(node, path) {
  const result = [];
  for (const { san, node: child } of childrenOf(node)) {
    const childPath = [...path, san];
    result.push({ path: childPath, node: child });
    result.push(...collectDescendants(child, childPath));
  }
  return result;
}

/**
 * Every trainable node at or under `path` (default: the whole tree) — a flat, pre-order list of
 * `{path, node}`. The node at `path` itself is included only when `path` is non-empty: the bare
 * root has no move to produce, so it's never itself trainable (matching CONTEXT.md: "every Node
 * *except the root* represents a move a trainee must produce").
 */
export function nodesInScope(root, path = []) {
  const startNode = nodeAtPath(root, path);
  if (!startNode) return [];

  const self = path.length > 0 ? [{ path, node: startNode }] : [];
  return [...self, ...collectDescendants(startNode, path)];
}

/**
 * The "Least recent/unseen first" Method (ChessTempo manual §17.15.1 — see
 * `wayfinder/research/0001`; there is no real "random" method, which an earlier version of
 * this app invented instead). Every never-trained (card-less) entry sorts ahead of every
 * trained one, in whatever order they were given (typically `nodesInScope`'s own pre-order,
 * i.e. main-lines-first) — relies on `Array.prototype.sort` being stable, guaranteed since
 * ES2019. Trained entries then sort by their Card's `due` date, earliest first: an
 * approximation of "least recently reviewed" using the scheduling data this app already has,
 * rather than a separate last-reviewed timestamp.
 */
export function leastRecentFirst(entries) {
  return entries.slice().sort((a, b) => {
    const aSeen = Boolean(a.node.card);
    const bSeen = Boolean(b.node.card);
    if (aSeen !== bSeen) return aSeen ? 1 : -1;
    if (!aSeen) return 0;
    return new Date(a.node.card.due) - new Date(b.node.card.due);
  });
}

function pathKey(path) {
  return path.join(">");
}

/**
 * The "spaced-repetition" Method's live picker: the most-overdue Card among `nodes`, or — if
 * nothing is due yet — the first card-less (never-trained) node, introducing new material. Pass
 * `excludePath` (the node just answered) so a lapsed card, due again immediately, doesn't repeat
 * on the very next turn; it's still eligible again on the turn after that. Returns null once
 * every node has an unexpired Card and there's nothing new left to introduce.
 */
export function pickNextDue(nodes, { now = new Date(), excludePath } = {}) {
  const excludeKey = excludePath ? pathKey(excludePath) : null;
  const candidates = excludeKey ? nodes.filter((entry) => pathKey(entry.path) !== excludeKey) : nodes;

  let mostOverdue = null;
  for (const entry of candidates) {
    const card = entry.node.card;
    if (!card || !isDue(card, now)) continue;
    if (!mostOverdue || new Date(card.due) < new Date(mostOverdue.node.card.due)) {
      mostOverdue = entry;
    }
  }
  if (mostOverdue) return mostOverdue;

  return candidates.find((entry) => !entry.node.card) ?? null;
}

/**
 * Click-to-move state machine for the browsing board — ported verbatim from
 * opening-tree/engine.js, whose doc comment this one matches. Only the *browsing* board uses
 * this: it only ever needs to move to a tracked child, so a click either matches one of the
 * given `moves` or it doesn't, with no chess-legality checking here at all. The *training*
 * board (ticket 0005) can't reuse this — it needs to accept a genuinely wrong move so wrong-move
 * handling has something to catch — so it drives chess.js's full legal-move list directly
 * instead.
 */
export function resolveSquareClick(selectedSquare, square, moves) {
  if (selectedSquare) {
    const move = moves.find((m) => m.from === selectedSquare && m.to === square);
    if (move) return { selection: null, san: move.san };
  }

  const hasMoveFromSquare = moves.some((m) => m.from === square);
  const selection = hasMoveFromSquare && square !== selectedSquare ? square : null;
  return { selection, san: null };
}

// ---------------------------------------------------------------------------
// Trainee Nodes (CONTEXT.md): only a move of the Repertoire's own color ever gets quizzed. The
// opponent's replies are auto-played during a Training Session instead of tested.
// ---------------------------------------------------------------------------

/**
 * Whether the move that leads to a node at `path` was played by `color` — i.e. whether that
 * node is a Trainee Node. The 1st ply (path length 1) is always White's move, so the mover who
 * just played is White on every odd path length, Black on every even one.
 */
export function isTraineeMove(path, color) {
  const lastMoverIsWhite = path.length % 2 === 1;
  return lastMoverIsWhite ? color === "white" : color === "black";
}

/**
 * Like nodesInScope, but keeping only Trainee Nodes — the set a Training Session ever quizzes.
 * A Training Session doesn't need a separate "auto-play the opponent's move" step: each entry's
 * own `path` already replays every move, opponent's included, exactly as some uploaded game
 * played it — app.js gets there by replaying that path through chess.js, the same way browsing
 * does (see computeFen there).
 */
export function trainableNodesInScope(root, color, path = []) {
  return nodesInScope(root, path).filter((entry) => isTraineeMove(entry.path, color));
}
