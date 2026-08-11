// moveTree.js — glue between @mliebelt/pgn-parser (variation tree, comments,
// %cal/%csl annotations) and chess.js (move legality + FEN generation).
// Neither library talks to the other (see wayfinder/research/0001), so this
// module walks the parser's output move-by-move, replays each SAN move on a
// chess.js instance to get the resulting FEN, and builds a small addressable
// tree plus a "current move" cursor. No DOM here — both `ChessCtor` and
// `parsePgn` are injected so this is unit-testable with `node --test` against
// the real vendored libraries, without a browser.

// A path is an array of move indices, alternating with "branch descriptors"
// as it enters nested variations. `pathKey()` turns any path into a stable
// string usable as a Map key / a DOM data attribute / a sync-message field.
export const ROOT_PATH = [];

export function pathKey(path) {
  return path.length === 0 ? "start" : path.join(".");
}

// PGN's %cal/%csl single-letter color codes -> cm-chessboard's named arrow /
// marker types (see vendor/cm-chessboard's RightClickAnnotator: success=green,
// info=blue, danger=red, warning=orange). PGN has no orange, so Y(ellow) is
// the closest mapped to "warning" — a judgment call, documented in CLAUDE.md.
const ANNOTATION_COLOR_MAP = { G: "success", R: "danger", B: "info", Y: "warning" };

function parseColorArrow(entry) {
  // e.g. "Gc4f7" -> color G, from c4, to f7
  const color = ANNOTATION_COLOR_MAP[entry[0]] || "success";
  return { color, from: entry.slice(1, 3), to: entry.slice(3, 5) };
}

function parseColorField(entry) {
  // e.g. "Re4" -> color R, square e4
  const color = ANNOTATION_COLOR_MAP[entry[0]] || "success";
  return { color, square: entry.slice(1) };
}

function sideToMoveFromFen(fen) {
  return fen.split(" ")[1];
}

function fullMoveNumberFromFen(fen) {
  return parseInt(fen.split(" ")[5], 10);
}

// A move's label as teachers expect to read it: "8.c3" for White, "8...d6"
// for Black (matching the confirmed prototype's notation exactly — no space
// after the move number) — the badge above the board and the projector's
// move-number overlay both use this.
export function formatMoveLabel(node) {
  if (!node) {
    return null;
  }
  return node.turn === "w" ? `${node.moveNumber}.${node.san}` : `${node.moveNumber}...${node.san}`;
}

// The label to show for one move *inline in a running rendered sequence*
// (the variations panel), as opposed to formatMoveLabel's always-fully-
// disambiguated form (used for the standalone move badge and the
// projector's move-number overlay, where there's no "previous move" to
// read it against). Standard chess-notation convention: black's "N..."
// ellipsis is only needed when something separates a black move from its
// own white move — a comment, a sideline branching off, a "show more"
// resume point. Immediately after its own white move in the same
// sequence, plain SAN is unambiguous on its own: "1.d4 Nf6", not
// "1.d4 1...Nf6". White is never ambiguous, so it always gets the full
// "N.san" form regardless of what precedes it.
export function formatSequentialMoveLabel(node, previousNode) {
  if (!node) {
    return null;
  }
  if (node.turn === "w") {
    return formatMoveLabel(node);
  }
  const followsOwnWhiteMove =
    previousNode && previousNode.turn === "w" && previousNode.moveNumber === node.moveNumber;
  return followsOwnWhiteMove ? node.san : formatMoveLabel(node);
}

// Real-world PGNs copied or OCR'd from Russian-language chess sources
// sometimes carry Cyrillic letters that are visually indistinguishable from
// their Latin look-alikes (a book export was reported with "Qхb4" — Cyrillic
// х, U+0445 — instead of "Qxb4"). @mliebelt/pgn-parser's grammar validates
// SAN character-by-character and rejects these outright, and chess.js's own
// move parser would reject them just as strictly even if the grammar let
// them through. Applied to the whole file rather than only inside move
// text: harmless wherever it's not needed (a Cyrillic look-alike inside a
// comment or a name header renders identically once normalized to Latin),
// and this app has no legitimate use for Cyrillic text.
const CYRILLIC_HOMOGLYPHS = {
  а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", у: "y",
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X",
};
const CYRILLIC_HOMOGLYPH_RE = new RegExp(Object.keys(CYRILLIC_HOMOGLYPHS).join("|"), "g");

export function sanitizeCyrillicHomoglyphs(pgnText) {
  return pgnText.replace(CYRILLIC_HOMOGLYPH_RE, (match) => CYRILLIC_HOMOGLYPHS[match]);
}

// Some chess books/authors write informal "slight edge" evaluations as
// superscript digits (²/³) glued directly onto a move, instead of the
// standard NAG glyphs (±/∓ — "slight advantage to White/Black") the
// pgn-parser grammar actually recognizes. Map to the closest accepted
// glyph rather than dropping the annotation: the grammar turns ± into NAG
// $16 and ∓ into $17 on its own, so this is a one-line character swap, not
// a reimplementation of NAG handling.
const EVALUATION_SYMBOLS = { "²": "±", "³": "∓" };
const EVALUATION_SYMBOL_RE = new RegExp(Object.keys(EVALUATION_SYMBOLS).join("|"), "g");

export function normalizeEvaluationSymbols(pgnText) {
  return pgnText.replace(EVALUATION_SYMBOL_RE, (match) => EVALUATION_SYMBOLS[match]);
}

// The full set of non-ASCII glyphs @mliebelt/pgn-parser's grammar itself
// accepts outside comments/headers (NAG-style annotation symbols), read
// directly off the grammar's own "Expected ... but X found" parse-error
// token lists rather than guessed. Anything non-ASCII NOT in this set,
// appearing outside a comment or a quoted header value, is grammar noise —
// almost always leftover font-mapping artifacts from however a PGN was
// generated (a real example: a book export used "²"/"³"/"µ" as informal,
// non-standard evaluation marks glued directly onto moves).
const GRAMMAR_ACCEPTED_GLYPHS = new Set([
  "±", // ± slight/moderate advantage White ($16 as parsed)
  "∓", // ∓ slight/moderate advantage Black ($17)
  "⩱", // ⩱ slight advantage Black ($15)
  "⩲", // ⩲ slight advantage White ($14)
  "‼", // ‼ ($3, brilliant move)
  "⁇", // ⁇ ($4, blunder)
  "⁈", // ⁈ ($6, dubious move)
  "⁉", // ⁉ ($5, interesting move)
  "↑", // ↑ (initiative)
  "→", // → (attack)
  "⇆", // ⇆ (counterplay)
  "∞", // ∞ (unclear)
  "□", // □ (only move)
  "⟳", // ⟳ (development)
  "⨀", // ⨀ (zugzwang)
  "﻿", // BOM, tolerated at the very start of a file
]);

// Deletes any character the grammar doesn't accept, but only in the "bare"
// move-list text the grammar actually validates token-by-token — never
// inside a `{...}` comment or a `"..."` header value, both of which the
// grammar already treats as opaque text (confirmed: this file's own
// Cyrillic/accented prose inside either survives untouched). Deletion (not
// translation) is only safe here because there is no reliable way to
// recover the original intended symbol; comments/headers are skipped
// entirely so a teacher's own prose or a player's name is never touched.
export function stripUnrecognizedMoveGlyphs(pgnText) {
  let result = "";
  let inComment = false;
  let inQuotes = false;

  for (const ch of pgnText) {
    if (inComment) {
      result += ch;
      if (ch === "}") inComment = false;
      continue;
    }
    if (inQuotes) {
      result += ch;
      if (ch === '"') inQuotes = false;
      continue;
    }
    if (ch === "{") {
      inComment = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      result += ch;
      continue;
    }
    if (ch.codePointAt(0) > 127 && !GRAMMAR_ACCEPTED_GLYPHS.has(ch)) {
      continue; // drop it
    }
    result += ch;
  }

  return result;
}

// Single entry point for all "real-world PGN text the strict grammar would
// otherwise reject outright" normalization. Add new categories here (and as
// their own tested function above) rather than growing any one function
// past a single clear responsibility. Order matters: the translation passes
// (safe everywhere, including inside comments/headers) run first, so any
// symbol they can rescue into a grammar-accepted glyph is preserved;
// stripping — the only lossy, deletion-based pass — runs last and only
// touches whatever's left over outside comments/headers.
// Some puzzle/exercise PGN generators write the answer entirely inside
// parentheses with no real move preceding them - e.g.
// "{Aanval op gepend stuk!} ( 1. ... Rc8 )" instead of a normal mainline.
// This isn't valid PGN (a "(...)" variation needs a preceding mainline move
// to branch from) and the grammar rejects it outright with a syntax error,
// but the intent is unambiguous: the bracketed line *is* the answer. Finds
// the first non-whitespace, non-comment token in the movetext (skipping the
// header block); if it's "(", strips exactly that opening paren and its
// matching close (respecting nesting), promoting the bracketed line to be
// the real mainline. Leaves the text untouched if the movetext doesn't
// start this way, or if the leading paren is unbalanced (nothing safe to
// guess there).
export function promoteLeadingBracketedLine(pgnText) {
  const headerEnd = pgnText.indexOf("\n\n");
  if (headerEnd === -1) {
    return pgnText;
  }
  const headers = pgnText.slice(0, headerEnd);
  const movetext = pgnText.slice(headerEnd);

  let i = 0;
  while (i < movetext.length) {
    if (/\s/.test(movetext[i])) {
      i++;
      continue;
    }
    if (movetext[i] === "{") {
      const close = movetext.indexOf("}", i);
      if (close === -1) {
        return pgnText; // malformed comment - don't touch
      }
      i = close + 1;
      continue;
    }
    break;
  }

  if (movetext[i] !== "(") {
    return pgnText;
  }

  let depth = 0;
  let j = i;
  for (; j < movetext.length; j++) {
    if (movetext[j] === "(") depth++;
    else if (movetext[j] === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) {
    return pgnText; // unbalanced - don't guess
  }

  const withoutClose = movetext.slice(0, j) + movetext.slice(j + 1);
  const withoutBoth = withoutClose.slice(0, i) + withoutClose.slice(i + 1);
  return headers + withoutBoth;
}

export function sanitizePgnText(pgnText) {
  return promoteLeadingBracketedLine(
    stripUnrecognizedMoveGlyphs(normalizeEvaluationSymbols(sanitizeCyrillicHomoglyphs(pgnText)))
  );
}

// Parses raw PGN text into the pgn-parser library's tree shape. `parsePgn` is
// the library's own `parse` export (or window.PgnParser.parse in the browser).
export function parseGame(parsePgn, pgnText) {
  return parsePgn(sanitizePgnText(pgnText), { startRule: "game" });
}

// Splits raw multi-game PGN text into one text chunk per game, using PGN's
// own convention: a new game's tag section starts at a line beginning with
// "[", immediately preceded by a blank line. (Tag lines within one game's
// own header never have a blank line between them, so this only fires at
// true game boundaries.) Pure string splitting, done on the raw text before
// any sanitization — sanitizePgnText never removes or adds newlines, so
// split-then-sanitize-each-chunk and sanitize-then-split would find the same
// boundaries either way.
export function splitPgnGames(pgnText) {
  const lines = pgnText.split("\n");
  const chunks = [];
  let current = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startsNewGame =
      i > 0 && lines[i - 1].trim() === "" && line.startsWith("[") && current.some((l) => l.trim() !== "");
    if (startsNewGame) {
      chunks.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }
  if (current.some((l) => l.trim() !== "")) {
    chunks.push(current.join("\n"));
  }

  return chunks;
}

// Parses raw PGN text that may contain multiple games (upload picker, ticket
// 0006). Parses each game independently (via splitPgnGames) rather than as
// one grammar pass over the whole file, so a single malformed game — e.g. a
// genuinely unbalanced parenthesis, an authoring defect no sanitization can
// safely auto-correct — doesn't prevent every other game in the file from
// loading. Returns `{ games, failures }`: `games` is every game that parsed
// successfully; `failures` is `{ index, message }` for each chunk (indexed
// into the original split, not into `games`) that didn't. Callers (the
// upload picker) should tell the teacher when `failures` is non-empty rather
// than silently dropping games.
export function parseGames(parsePgn, pgnText) {
  const chunks = splitPgnGames(pgnText);
  const games = [];
  const failures = [];

  chunks.forEach((chunk, index) => {
    try {
      games.push(parseGame(parsePgn, chunk));
    } catch (err) {
      failures.push({ index, message: err.message });
    }
  });

  return { games, failures };
}

// Rewrites the raw text of a multi-game (or single-game) PGN file, replacing
// only the game at `gameIndex` with `newGameText` and leaving every other
// game's own chunk of text byte-for-byte as `splitPgnGames` found it. This is
// the write-back half of the library storing the whole uploaded file rather
// than one picked-out game (see CLAUDE.md's judgment call superseding ticket
// 0006): a move played while "Lock PGN" is off must land back in the correct
// game's slot within that file, not clobber the other games sharing the same
// library entry. Throws RangeError on an out-of-range index rather than
// silently appending/dropping a game, since that would corrupt the file.
export function replaceGameInPgnText(pgnText, gameIndex, newGameText) {
  const chunks = splitPgnGames(pgnText);
  if (gameIndex < 0 || gameIndex >= chunks.length) {
    throw new RangeError(`gameIndex ${gameIndex} is out of range for a ${chunks.length}-game file`);
  }
  return chunks.map((chunk, i) => (i === gameIndex ? newGameText.trim() : chunk.trim())).join("\n\n");
}

// Builds the full move tree for one already-parsed game. `ChessCtor` is the
// chess.js `Chess` class (or a compatible fake, in tests).
// A puzzle/exercise-style PGN entry (common in book exports) sets up a
// mid-game diagram via a [FEN] header tag instead of starting from move 1
// of a full game — a normal, legitimate PGN feature, not something to
// sanitize away. Without this, buildGameTree always assumed the standard
// starting position, so a puzzle's first move (legal from its diagram, but
// not from move 1 of a fresh game) failed with a spurious "illegal move".
export function buildGameTree(ChessCtor, parsedGame) {
  const startingFen = (parsedGame.tags || {}).FEN;
  const chess = startingFen ? new ChessCtor(startingFen) : new ChessCtor();
  const rootFen = chess.fen();
  const nodesByPath = new Map();
  const mainLine = buildLine(ChessCtor, rootFen, parsedGame.moves || [], ROOT_PATH, "start", nodesByPath);
  return {
    tags: parsedGame.tags || {},
    rootFen,
    mainLine,
    nodesByPath,
    // Text before move 1 - e.g. a book "preface" entry that is nothing but
    // prose, with zero moves - isn't attached to any move node (there may
    // be none), so pgn-parser surfaces it separately as `gameComment`.
    // Shown in the Notes card at the start position, same as any other
    // move's comment is shown there once you step onto it.
    gameComment: (parsedGame.gameComment || {}).comment || null,
  };
}

// Recursively builds one line (the mainline, or one variation's continuation)
// of moves, replaying each on a fresh chess.js instance seeded at `startFen`.
// `entryPointKey` is the pathKey to step back to from this line's first move
// (ROOT for the mainline, or the branch point's preceding move for a variation).
function buildLine(ChessCtor, startFen, pgnMoves, parentPath, entryPointKey, nodesByPath) {
  const chess = new ChessCtor(startFen);
  const lineNodes = [];

  pgnMoves.forEach((mv, index) => {
    const fenBefore = chess.fen();
    const path = [...parentPath, index];
    const san = mv.notation.notation;

    let moveResult;
    try {
      moveResult = chess.move(san);
    } catch (err) {
      throw new Error(`Illegal move "${san}" at path ${pathKey(path)}: ${err.message}`);
    }

    const commentDiag = mv.commentDiag || {};
    const node = {
      path,
      pathKey: pathKey(path),
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      fenBefore,
      fen: chess.fen(),
      // Derived from fenBefore's own fields rather than trusted from mv:
      // @mliebelt/pgn-parser leaves moveNumber null on black's half of a
      // move pair, but a FEN always carries an authoritative side-to-move
      // and fullmove number, valid at any nesting depth.
      turn: sideToMoveFromFen(fenBefore),
      moveNumber: fullMoveNumberFromFen(fenBefore),
      commentBefore: mv.commentMove || null,
      commentAfter: mv.commentAfter || null,
      arrows: (commentDiag.colorArrows || []).map(parseColorArrow),
      markers: (commentDiag.colorFields || []).map(parseColorField),
      variationDepth: parentPath.length === 0 ? countBranches(path) : countBranches(path),
      lineNodes,
      indexInLine: index,
      entryPointKey,
      variations: [],
    };

    if (mv.variations && mv.variations.length > 0) {
      const backTo = index === 0 ? entryPointKey : lineNodes[index - 1].pathKey;
      node.variations = mv.variations.map((variationMoves, variationIndex) =>
        buildLine(
          ChessCtor,
          fenBefore,
          variationMoves,
          [...path, "v" + variationIndex],
          backTo,
          nodesByPath
        )
      );
    }

    nodesByPath.set(node.pathKey, node);
    lineNodes.push(node);
  });

  return lineNodes;
}

// Counts how many variation-branch tokens ("v0", "v1", ...) appear in a path —
// 0 for the mainline, 1 for a sideline branching directly off it, 2 for a
// sideline nested inside a sideline, etc.
function countBranches(path) {
  return path.filter((token) => typeof token === "string" && token.startsWith("v")).length;
}

// Ticket 0005: sidelines nested more than ~2 ply deep default to collapsed.
// Read as "2 ply deep" = the first 2 moves of a sideline stay expanded; the
// rest of that same line collapses behind a click, keeping any single
// heavily-annotated sideline from becoming a wall of text (judgment call —
// see CLAUDE.md).
export function isCollapsedByDefault(node) {
  return node.variationDepth > 0 && node.indexInLine >= 2;
}

// A small cursor abstraction over a built game tree: "what's the current
// move", and how clicking a variations/notes entry, stepping forward/back,
// or jumping to an arbitrary path all update that one shared pointer
// (ticket 0005: "one current-move pointer drives everything").
export function createCursor(gameTree, initialPathKey = "start") {
  let currentKey = initialPathKey;

  function nodeFor(key) {
    return key === "start" ? null : gameTree.nodesByPath.get(key) || null;
  }

  return {
    getCurrentPathKey() {
      return currentKey;
    },
    getCurrentNode() {
      return nodeFor(currentKey);
    },
    getCurrentFen() {
      const node = nodeFor(currentKey);
      return node ? node.fen : gameTree.rootFen;
    },
    // Jumps straight to any path, at any nesting depth (ticket 0005).
    jumpTo(path) {
      const key = pathKey(path);
      if (key !== "start" && !gameTree.nodesByPath.has(key)) {
        throw new Error(`Unknown path: ${key}`);
      }
      currentKey = key;
      return nodeFor(currentKey);
    },
    jumpToPathKey(key) {
      if (key !== "start" && !gameTree.nodesByPath.has(key)) {
        throw new Error(`Unknown path: ${key}`);
      }
      currentKey = key;
      return nodeFor(currentKey);
    },
    stepForward() {
      const node = nodeFor(currentKey);
      if (!node) {
        if (gameTree.mainLine.length === 0) return null;
        currentKey = gameTree.mainLine[0].pathKey;
        return nodeFor(currentKey);
      }
      const next = node.lineNodes[node.indexInLine + 1];
      if (!next) return null;
      currentKey = next.pathKey;
      return nodeFor(currentKey);
    },
    stepBackward() {
      const node = nodeFor(currentKey);
      if (!node) return null; // already at the start
      if (node.indexInLine > 0) {
        currentKey = node.lineNodes[node.indexInLine - 1].pathKey;
      } else {
        currentKey = node.entryPointKey;
      }
      return nodeFor(currentKey);
    },
    reset() {
      currentKey = "start";
    },
  };
}

// The set of moves the teacher could play next on the board and still stay
// on the loaded tree: the standard continuation plus every variation attached
// to it (a variation is stored on the move it replaces, so they all live one
// step ahead of `node`). Used to validate a drag/click move on the teacher's
// board against the loaded PGN instead of allowing open-ended free play,
// which is explicitly out of scope for v1 (map.md: "no provision for a
// freeform/no-PGN-loaded mode" is still-open fog, not something this build
// takes on). Returns [] at the end of a line with no more options.
export function continuationsFrom(node, mainLine) {
  const nextInLine = node ? node.lineNodes[node.indexInLine + 1] : mainLine[0];
  if (!nextInLine) {
    return [];
  }
  return [nextInLine, ...nextInLine.variations.map((variation) => variation[0])];
}

// Finds which continuation (if any) matches a SAN string the teacher just
// played on the board, so app.js can jump the cursor there instead of
// re-deriving tree knowledge itself.
export function findContinuationBySan(node, mainLine, san) {
  return continuationsFrom(node, mainLine).find((candidate) => candidate.san === san) || null;
}

// "Lock PGN" off (see CLAUDE.md judgment calls): the teacher played a legal
// move that findContinuationBySan couldn't match, so it needs to become a
// real, addressable node in the tree — not just a transient board position —
// the same way a real PGN editor grows a game while you're annotating it.
//
// `node` is the cursor's current node (null at the start position, matching
// createCursor/continuationsFrom's own convention). `moveResult` carries
// exactly what a chess.js move plus its pre-move FEN gives you: { san, from,
// to, fenBefore, fen }. Two attachment cases, both reusing the exact
// pathKey/entryPointKey shape buildLine already establishes so the result is
// indistinguishable from a node that was in the original PGN all along:
//
// 1. The cursor is at the end of its line (no continuation recorded yet) —
//    the move simply extends that same lineNodes array one ply further.
// 2. The cursor already has a recorded continuation (mainline and/or one or
//    more sidelines) that this move doesn't match — the move becomes a new
//    sideline attached to that continuation's node, alongside any existing
//    ones (`continuationsFrom` will then offer it too).
export function addMove(gameTree, node, moveResult) {
  const nextInLine = node ? node.lineNodes[node.indexInLine + 1] : gameTree.mainLine[0];
  const currentPathKey = node ? node.pathKey : "start";

  let path;
  let lineNodes;
  let indexInLine;
  let entryPointKey;

  if (!nextInLine) {
    // Case 1: extend the current line one ply further.
    lineNodes = node ? node.lineNodes : gameTree.mainLine;
    indexInLine = lineNodes.length;
    const parentPath = node ? node.path.slice(0, -1) : ROOT_PATH;
    path = [...parentPath, indexInLine];
    entryPointKey = node ? node.entryPointKey : "start";
  } else {
    // Case 2: attach as a new sideline alongside whatever's already recorded
    // one step ahead of the cursor (nextInLine's own mainline/sideline
    // siblings) — mirrors exactly how buildLine attaches a PGN-authored
    // variation to the move it replaces.
    const variationIndex = nextInLine.variations.length;
    lineNodes = [];
    nextInLine.variations.push(lineNodes);
    indexInLine = 0;
    path = [...nextInLine.path, `v${variationIndex}`, 0];
    entryPointKey = currentPathKey;
  }

  const newNode = {
    path,
    pathKey: pathKey(path),
    san: moveResult.san,
    from: moveResult.from,
    to: moveResult.to,
    fenBefore: moveResult.fenBefore,
    fen: moveResult.fen,
    turn: sideToMoveFromFen(moveResult.fenBefore),
    moveNumber: fullMoveNumberFromFen(moveResult.fenBefore),
    commentBefore: null,
    commentAfter: null,
    arrows: [],
    markers: [],
    variationDepth: countBranches(path),
    lineNodes,
    indexInLine,
    entryPointKey,
    variations: [],
  };

  lineNodes.push(newNode);
  gameTree.nodesByPath.set(newNode.pathKey, newNode);
  return newNode;
}

// The inverse of ANNOTATION_COLOR_MAP, for writing %cal/%csl back out when
// serializing. Several PGN letters could in principle map to the same
// cm-chessboard color; only one direction is ever needed the other way
// (there's exactly one letter per color actually produced by this app).
const REVERSE_ANNOTATION_COLOR_MAP = { success: "G", danger: "R", info: "B", warning: "Y" };

function formatColorArrow(arrow) {
  return `${REVERSE_ANNOTATION_COLOR_MAP[arrow.color] || "G"}${arrow.from}${arrow.to}`;
}

function formatColorField(marker) {
  return `${REVERSE_ANNOTATION_COLOR_MAP[marker.color] || "G"}${marker.square}`;
}

// Rebuilds one node's trailing `{...}` comment, folding its plain-text
// commentAfter back together with any %cal/%csl annotation it carries (both
// live on the same node but arrived from the parser as separate fields —
// see buildLine). Returns null when there's nothing to write.
function commentAfterText(node) {
  const parts = [];
  if (node.commentAfter) parts.push(node.commentAfter);
  if (node.arrows.length > 0) parts.push(`[%cal ${node.arrows.map(formatColorArrow).join(",")}]`);
  if (node.markers.length > 0) parts.push(`[%csl ${node.markers.map(formatColorField).join(",")}]`);
  return parts.length > 0 ? parts.join(" ") : null;
}

function serializeLine(lineNodes) {
  return lineNodes
    .map((node) => {
      let text = node.san;
      if (node.commentBefore) text = `{${node.commentBefore}} ${text}`;
      const after = commentAfterText(node);
      if (after) text += ` {${after}}`;
      if (node.variations.length > 0) {
        text += " " + node.variations.map((variation) => `(${serializeLine(variation)})`).join(" ");
      }
      return text;
    })
    .join(" ");
}

// Turns a (possibly grown-since-loading, see addMove) game tree back into
// PGN text, so a move played while "Lock PGN" was off can be persisted to
// the library entry (idbLibraryStore.js) and survive a reload — see
// CLAUDE.md's judgment call on this. Deliberately omits move numbers, the
// same way app.js's existing pgnTextForGame (the multi-game-picker
// serializer this was modeled on) does: @mliebelt/pgn-parser's grammar
// accepts a bare move list just fine, and not tracking "was the last move
// White's or Black's" through nested variations sidesteps a whole class of
// off-by-one numbering bugs for no visible benefit (the numbers are
// re-derived from FEN on every reparse anyway — see buildLine).
export function serializeGameTree(gameTree) {
  const tagLines = Object.entries(gameTree.tags || {})
    .filter(([key, value]) => key !== "messages" && typeof value !== "object")
    .map(([key, value]) => `[${key} "${value}"]`)
    .join("\n");
  const result = (gameTree.tags && gameTree.tags.Result) || "*";
  const moveText = `${serializeLine(gameTree.mainLine)} ${result}`.trim();
  return `${tagLines}\n\n${moveText}`.trim();
}
