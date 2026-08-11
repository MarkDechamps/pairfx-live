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

// Parses raw PGN text into the pgn-parser library's tree shape. `parsePgn` is
// the library's own `parse` export (or window.PgnParser.parse in the browser).
export function parseGame(parsePgn, pgnText) {
  return parsePgn(pgnText, { startRule: "game" });
}

// Parses raw PGN text that may contain multiple games (upload picker, ticket
// 0006). Returns an array even for a single-game file.
export function parseGames(parsePgn, pgnText) {
  const result = parsePgn(pgnText, { startRule: "games" });
  return Array.isArray(result) ? result : [result];
}

// Builds the full move tree for one already-parsed game. `ChessCtor` is the
// chess.js `Chess` class (or a compatible fake, in tests).
export function buildGameTree(ChessCtor, parsedGame) {
  const chess = new ChessCtor();
  const rootFen = chess.fen();
  const nodesByPath = new Map();
  const mainLine = buildLine(ChessCtor, rootFen, parsedGame.moves || [], ROOT_PATH, "start", nodesByPath);
  return {
    tags: parsedGame.tags || {},
    rootFen,
    mainLine,
    nodesByPath,
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
      fenBefore,
      fen: chess.fen(),
      turn: mv.turn,
      moveNumber: mv.moveNumber || null,
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
