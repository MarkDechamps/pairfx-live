// engineAnalysis.js — the UCI conversation with the in-browser Stockfish
// engine (teacher tab only — never broadcast to the projector), kept
// independent of the real Web Worker so it's unit-testable with a fake
// `send` function (node --test, no browser). app.js owns the Worker itself
// and just forwards each line the engine prints into `handleLine`.
//
// Three concerns live here:
// - parsing a UCI `info ... pv ...` line into plain data (parseInfoLine),
// - turning that into what the teacher reads: a white-perspective score
//   ("+0.35", "#3", "-#2") and a SAN principal variation with move numbers
//   (scoreForWhite/formatScore/pvToSan),
// - the session state machine (createEngineSession): restarting the search
//   whenever the position changes, and discarding the stale `info` lines a
//   just-stopped search still prints before its `bestmove`.

export const DEFAULT_MULTI_PV = 3;
export const DEFAULT_SEARCH_DEPTH = 22;
export const MAX_PV_PLIES = 10;

// Returns null for anything that isn't a scored info line (e.g. `info string
// ...`, `info currmove ...`, `uciok`, `readyok`).
export function parseInfoLine(line) {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "info") return null;
  const info = { depth: null, multipv: 1, score: null, pv: [] };
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "depth") info.depth = Number(tokens[++i]);
    else if (token === "multipv") info.multipv = Number(tokens[++i]);
    else if (token === "score") {
      const type = tokens[++i];
      const value = Number(tokens[++i]);
      if (type === "cp" || type === "mate") info.score = { type, value };
    } else if (token === "pv") {
      info.pv = tokens.slice(i + 1);
      break;
    }
  }
  if (info.depth === null || info.score === null) return null;
  return info;
}

export function sideToMove(fen) {
  return fen.split(/\s+/)[1] === "b" ? "b" : "w";
}

// UCI scores are from the side to move's point of view; the teacher reads
// them like every chess GUI does, from White's (positive = White is better).
export function scoreForWhite(score, fen) {
  if (sideToMove(fen) === "w") return score;
  // `|| 0` avoids a -0 for a mated-already "mate 0" with black to move.
  return { type: score.type, value: -score.value || 0 };
}

export function formatScore(whiteScore) {
  if (whiteScore.type === "mate") {
    if (whiteScore.value === 0) return "#";
    return whiteScore.value > 0 ? `#${whiteScore.value}` : `-#${-whiteScore.value}`;
  }
  const pawns = whiteScore.value / 100;
  if (pawns === 0) return "0.00";
  return `${pawns > 0 ? "+" : "-"}${Math.abs(pawns).toFixed(2)}`;
}

// Replays UCI moves (e.g. "e2e4", "e7e8q") from `fen` with chess.js and
// renders them as numbered SAN ("12. Nf3 Nc6 13. Bb5" or "12... Nc6 13.
// Bb5"). Stops quietly at the first move chess.js won't accept rather than
// throwing — a stale line racing a position change shouldn't break the panel.
export function pvToSan(Chess, fen, uciMoves, maxPlies = MAX_PV_PLIES) {
  const board = new Chess(fen);
  const parts = [];
  for (const uci of uciMoves.slice(0, maxPlies)) {
    const color = board.turn();
    const moveNumber = board.moveNumber();
    let move;
    try {
      move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
    if (color === "w") parts.push(`${moveNumber}. ${move.san}`);
    else if (parts.length === 0) parts.push(`${moveNumber}... ${move.san}`);
    else parts.push(move.san);
  }
  return parts.join(" ");
}

// `send(command)` writes one UCI command to the engine; `onUpdate(snapshot)`
// is called whenever the displayed analysis changes. A snapshot is
// `{fen, depth, lines: [{multipv, score, pv}]}` with lines sorted by multipv
// and `score` still in the engine's (side-to-move) perspective.
//
// A new search is never started while another is still running: changing
// position sends `stop` and only starts the next search once the old one's
// `bestmove` has arrived. Sending `position`/`go` to a still-searching
// single-threaded stockfish.js crashes its wasm ("unreachable") when the
// teacher steps through moves quickly — found in browser testing.
export function createEngineSession({ send, onUpdate, multiPv = DEFAULT_MULTI_PV, depth = DEFAULT_SEARCH_DEPTH }) {
  let currentFen = null; // what the teacher wants analyzed (null = engine off)
  let searchFen = null; // what the running search is analyzing (null = idle)
  let stopSent = false;
  let restartPending = false; // start a search for currentFen on the next bestmove
  let linesByPv = new Map();
  let reportedDepth = 0;

  send("uci");
  send(`setoption name MultiPV value ${multiPv}`);
  send("isready");

  function snapshot() {
    const lines = [...linesByPv.values()].sort((a, b) => a.multipv - b.multipv);
    return { fen: currentFen, depth: reportedDepth, lines };
  }

  function startSearch() {
    searchFen = currentFen;
    send(`position fen ${currentFen}`);
    send(`go depth ${depth}`);
  }

  function stopRunningSearch() {
    if (searchFen === null || stopSent) return;
    send("stop");
    stopSent = true;
  }

  return {
    // Restarts the search for `fen`; a no-op when that position is already
    // being (or has been) analyzed, so callers can invoke it on every render.
    analyze(fen) {
      if (fen === currentFen) return;
      currentFen = fen;
      linesByPv = new Map();
      reportedDepth = 0;
      if (searchFen === null) {
        startSearch();
      } else {
        restartPending = true;
        stopRunningSearch();
      }
      onUpdate(snapshot());
    },

    // Stops searching and forgets the position, so a later analyze() of the
    // same FEN starts afresh rather than being treated as a no-op.
    stop() {
      currentFen = null;
      restartPending = false;
      stopRunningSearch();
    },

    handleLine(line) {
      if (line.startsWith("bestmove")) {
        searchFen = null;
        stopSent = false;
        if (restartPending) {
          restartPending = false;
          startSearch();
        }
        return;
      }
      if (stopSent || searchFen === null || searchFen !== currentFen) return;
      const info = parseInfoLine(line);
      if (!info || info.multipv > multiPv) return;
      linesByPv.set(info.multipv, { multipv: info.multipv, score: info.score, pv: info.pv });
      reportedDepth = Math.max(reportedDepth, info.depth);
      onUpdate(snapshot());
    },

    isSearching: () => searchFen !== null,
  };
}
