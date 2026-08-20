// DOM wiring only — no logic lives here beyond gluing user input to engine.js/client.js and
// painting the result. Deliberately not unit tested, same convention as chess-classroom's
// app.js/projector.js: there's nothing here worth testing in isolation once engine.js and
// client.js (the parts that actually have logic) are covered. See CLAUDE.md.

import { Chess } from "./vendor/chess-js/chess.js";
import { fetchLichessGames, fetchChessComGames } from "./client.js";
import {
  lichessGameToRecord,
  chessComGameToRecord,
  parseLichessNdjson,
  parseChessComGames,
  filterRecords,
  buildTree,
  childrenOf,
  nodeAtPath,
  resolveSquareClick,
} from "./engine.js";

const LICHESS_MAX_GAMES = 500;
const CHESSCOM_MAX_MONTHS = 24; // ~2 years back
const GAMES_PANEL_DISPLAY_CAP = 30;

const SVG_NS = "http://www.w3.org/2000/svg";
const PIECE_SPRITE_URL = "./vendor/chess-pieces/standard.svg";

const state = {
  platform: "lichess",
  username: "",
  records: [], // every fetched record, both colors, unfiltered
  color: "white",
  speedFilter: [], // empty = all speeds
  ratedFilter: null, // null = any, true = rated only, false = casual only
  path: [], // SAN moves from the starting position to the currently viewed node
  selectedSquare: null, // click-to-move: the source square selected on the board, if any
  loading: false,
  progress: null, // null | { kind: "lichess", gamesLoaded } | { kind: "chesscom", completed, total }
  error: null,
  hasResults: false,
  showGames: false, // whether the "games at this position" panel is expanded
};

const app = document.getElementById("app");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2), value);
    } else if (key === "checked" || key === "disabled" || key === "selected") {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function formatPercent(rate) {
  return `${Math.round(rate * 100)}%`;
}

function formatDate(ms) {
  return typeof ms === "number" ? new Date(ms).toLocaleDateString() : "Unknown date";
}

// "white vs black", with whichever side is the looked-up player bolded — makes it easy to spot
// at a glance who their actual opponent was in each listed game.
function renderPlayersLabel(game) {
  const span = el("span", { class: "game-players" });
  [game.white, game.black].forEach((name, index) => {
    if (index === 1) span.appendChild(document.createTextNode(" vs "));
    const isStudiedPlayer = name?.toLowerCase() === state.username.toLowerCase();
    span.appendChild(isStudiedPlayer ? el("strong", { text: name }) : document.createTextNode(name ?? "Unknown"));
  });
  return span;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

// Draws one piece via a <use> reference into the sprite loaded by loadPieceSprite() — the same
// Cburnett-set artwork chess-classroom (and Lichess itself, as its default set) uses, rather
// than unicode glyphs. chess.js's {color: "w"|"b", type: "p"|"n"|"b"|"r"|"q"|"k"} happens to
// spell out the sprite's own element ids ("wk", "bp", ...) directly.
function pieceIcon(piece) {
  const svg = svgEl("svg", { viewBox: "0 0 40 40", class: "piece" });
  svg.appendChild(svgEl("use", { href: `#${piece.color}${piece.type}` }));
  return svg;
}

// Fetches the vendored piece sprite once and injects it (hidden) into the document, so any
// <use href="#wk"> elsewhere in the page can resolve against it.
async function loadPieceSprite() {
  const response = await fetch(PIECE_SPRITE_URL);
  const host = document.createElement("div");
  host.hidden = true;
  host.innerHTML = await response.text();
  document.body.appendChild(host);
}

// ---------------------------------------------------------------------------
// Data fetch + parse
// ---------------------------------------------------------------------------

// Fetches games for `platform`, reporting progress and newly-parsed records as they arrive
// (`onProgress`/`onGames`) so the caller can render a partial tree while the lookup is still in
// flight — openingtree.com does the same rather than making you wait for the whole download.
// The final return value is still the complete, authoritative record list (parsed the normal,
// non-streaming way too), so the caller doesn't have to trust that nothing was missed along the
// way — it's a convenience for responsiveness, not the source of truth.
async function lookupRecords(platform, username, { onProgress, onGames } = {}) {
  if (platform === "lichess") {
    const text = await fetchLichessGames(username, {
      max: LICHESS_MAX_GAMES,
      onProgress: (gamesLoaded) => onProgress?.({ kind: "lichess", gamesLoaded }),
      onGames: (rawGames) => {
        const records = rawGames.map((g) => lichessGameToRecord(g, username)).filter(Boolean);
        if (records.length) onGames?.(records);
      },
    });
    return parseLichessNdjson(text, username);
  }
  const games = await fetchChessComGames(username, {
    maxMonths: CHESSCOM_MAX_MONTHS,
    onProgress: (p) => onProgress?.({ kind: "chesscom", ...p }),
    onGames: (rawGames) => {
      const records = rawGames.map((g) => chessComGameToRecord(g, username)).filter(Boolean);
      if (records.length) onGames?.(records);
    },
  });
  return parseChessComGames(games, username);
}

function defaultColorFor(records) {
  const whiteCount = records.filter((r) => r.color === "white").length;
  const blackCount = records.filter((r) => r.color === "black").length;
  return blackCount > whiteCount ? "black" : "white";
}

function distinctSpeeds(records) {
  return [...new Set(records.map((r) => r.speed))].sort();
}

async function handleLookup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const platform = form.elements.platform.value;
  const username = form.elements.username.value.trim();
  if (!username) return;

  state.platform = platform;
  state.username = username;
  state.loading = true;
  state.progress = null;
  state.error = null;
  state.hasResults = false;
  state.records = [];
  render();

  // Once real data starts arriving, set the color/filters/path defaults exactly once — flipping
  // them again on every later batch would yank the tree out from under someone already browsing
  // it mid-load.
  let resultsStarted = false;
  const showFirstResults = () => {
    if (resultsStarted) return;
    resultsStarted = true;
    state.color = defaultColorFor(state.records);
    state.speedFilter = [];
    state.ratedFilter = null;
    state.path = [];
    state.showGames = false;
    state.hasResults = true;
  };

  try {
    const records = await lookupRecords(platform, username, {
      onProgress: (progress) => {
        state.progress = progress;
        render();
      },
      onGames: (newRecords) => {
        state.records = [...state.records, ...newRecords];
        showFirstResults();
        render();
      },
    });
    state.records = records; // the authoritative final list, in case it ever differs from the streamed total
    showFirstResults(); // covers the edge case of zero games ever reaching onGames (e.g. all filtered out)
  } catch (error) {
    // client.js already produces user-presentable messages (unknown user, rate-limited,
    // platform request failed); anything else is a genuinely unexpected failure.
    state.error = error instanceof Error ? error : new Error("Something went wrong fetching those games. Please try again.");
  } finally {
    state.loading = false;
    state.progress = null;
    render();
  }
}

// ---------------------------------------------------------------------------
// Derived view state
// ---------------------------------------------------------------------------

function currentTree() {
  const colorRecords = state.records.filter((r) => r.color === state.color);
  const filtered = filterRecords(colorRecords, {
    speeds: state.speedFilter.length ? state.speedFilter : undefined,
    rated: state.ratedFilter,
  });
  return { filtered, tree: buildTree(filtered) };
}

function setColor(color) {
  state.color = color;
  state.path = [];
  state.selectedSquare = null;
  state.showGames = false;
  render();
}

function toggleSpeed(speed, checked) {
  state.speedFilter = checked
    ? [...state.speedFilter, speed]
    : state.speedFilter.filter((s) => s !== speed);
  state.path = [];
  state.selectedSquare = null;
  state.showGames = false;
  render();
}

function setRatedFilter(value) {
  state.ratedFilter = value === "any" ? null : value === "rated";
  state.path = [];
  state.selectedSquare = null;
  state.showGames = false;
  render();
}

// Also how a board move completes: descend() doesn't care whether the SAN came from clicking a
// row in the move list or clicking/selecting squares on the board (see handleSquareClick) — both
// are just "browse to this child node."
function descend(san) {
  state.path = [...state.path, san];
  state.selectedSquare = null;
  state.showGames = false;
  render();
}

function jumpTo(plyCount) {
  state.path = state.path.slice(0, plyCount);
  state.selectedSquare = null;
  state.showGames = false;
  render();
}

function toggleGamesPanel() {
  state.showGames = !state.showGames;
  render();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function render() {
  app.innerHTML = "";
  app.appendChild(renderLookupForm());
  const status = renderStatus();
  if (status) app.appendChild(status);
  if (state.hasResults) app.appendChild(renderResults());
}

function renderLookupForm() {
  const form = el("form", { class: "lookup-form", onsubmit: handleLookup });

  const platformSelect = el("select", { name: "platform" }, [
    el("option", { value: "lichess", selected: state.platform === "lichess", text: "Lichess" }),
    el("option", { value: "chesscom", selected: state.platform === "chesscom", text: "Chess.com" }),
  ]);

  form.appendChild(el("label", {}, ["Platform", platformSelect]));
  form.appendChild(
    el("label", {}, [
      "Username",
      el("input", {
        name: "username",
        type: "text",
        placeholder: "e.g. DrNykterstein",
        value: state.username,
        required: "required",
      }),
    ]),
  );
  form.appendChild(el("button", { type: "submit", disabled: state.loading, text: state.loading ? "Looking up…" : "Look up" }));

  return form;
}

function renderStatus() {
  if (state.loading) {
    const platformLabel = state.platform === "lichess" ? "Lichess" : "Chess.com";
    const wrap = el("div", { class: "status loading" });
    wrap.appendChild(el("p", { text: `Fetching ${state.username}'s games from ${platformLabel}…` }));
    wrap.appendChild(renderProgressBar());
    return wrap;
  }
  if (state.error) {
    return el("p", { class: "status error", text: state.error.message });
  }
  return null;
}

// Chess.com's month-by-month fetch has a known total, so it gets a real determinate bar; a
// single streamed Lichess request doesn't (no total game count until it's done), so it gets a
// live "N games loaded" counter on an indeterminate bar instead — see client.js. The label is a
// sibling of the bar, not a child of it — the bar itself is a short, `overflow: hidden` strip
// (so the indeterminate sweep has something to clip against), and text placed inside that would
// get clipped down to a sliver too.
function renderProgressBar() {
  const wrap = el("div", { class: "progress-wrap" });

  if (state.progress?.kind === "chesscom" && state.progress.total) {
    const { completed, total } = state.progress;
    const pct = Math.round((completed / total) * 100);
    wrap.appendChild(
      el("div", { class: "progress-bar", role: "progressbar", "aria-valuenow": pct }, [
        el("div", { class: "progress-bar-fill", style: `width:${pct}%` }),
      ]),
    );
    wrap.appendChild(el("span", { class: "progress-bar-label", text: `${completed}/${total} months fetched (${pct}%)` }));
    return wrap;
  }

  const label = state.progress?.kind === "lichess" ? `${state.progress.gamesLoaded} games loaded so far…` : "Starting…";
  wrap.appendChild(el("div", { class: "progress-bar indeterminate" }, [el("div", { class: "progress-bar-fill" })]));
  wrap.appendChild(el("span", { class: "progress-bar-label", text: label }));
  return wrap;
}

function renderResults() {
  const section = el("section", { class: "results" });
  const { filtered, tree } = currentTree();
  const node = nodeAtPath(tree, state.path) ?? tree;

  const fetchedSoFar = state.loading ? `${state.records.length} fetched so far, still loading…` : `${state.records.length} total fetched`;
  section.appendChild(
    el("p", {
      class: "summary",
      text: `${filtered.length} of ${state.records.filter((r) => r.color === state.color).length} games as ${state.color} match the current filters (${fetchedSoFar}).`,
    }),
  );

  section.appendChild(renderColorTabs());
  section.appendChild(renderFilters());
  section.appendChild(renderBreadcrumb());

  const explorer = el("div", { class: "explorer" });
  explorer.appendChild(renderBoardPane(node));
  explorer.appendChild(renderMoveList(node));
  section.appendChild(explorer);

  return section;
}

function renderColorTabs() {
  const tabs = el("div", { class: "color-tabs" });
  for (const color of ["white", "black"]) {
    tabs.appendChild(
      el("button", {
        type: "button",
        class: color === state.color ? "active" : "",
        text: color === "white" ? "As White" : "As Black",
        onclick: () => setColor(color),
      }),
    );
  }
  return tabs;
}

function renderFilters() {
  const wrap = el("div", { class: "filters" });

  const speeds = distinctSpeeds(state.records.filter((r) => r.color === state.color));
  const speedWrap = el("div", { class: "speed-filters" });
  for (const speed of speeds) {
    const checkbox = el("input", {
      type: "checkbox",
      checked: state.speedFilter.includes(speed),
      onchange: (e) => toggleSpeed(speed, e.target.checked),
    });
    speedWrap.appendChild(el("label", {}, [checkbox, speed]));
  }
  wrap.appendChild(speedWrap);

  const ratedSelect = el(
    "select",
    { onchange: (e) => setRatedFilter(e.target.value) },
    [
      el("option", { value: "any", selected: state.ratedFilter === null, text: "All games" }),
      el("option", { value: "rated", selected: state.ratedFilter === true, text: "Rated only" }),
      el("option", { value: "casual", selected: state.ratedFilter === false, text: "Casual only" }),
    ],
  );
  wrap.appendChild(ratedSelect);

  return wrap;
}

function renderBreadcrumb() {
  const crumb = el("div", { class: "breadcrumb" });
  crumb.appendChild(el("button", { type: "button", text: "Start", onclick: () => jumpTo(0) }));
  state.path.forEach((san, index) => {
    crumb.appendChild(el("span", { class: "sep", text: " › " }));
    crumb.appendChild(el("button", { type: "button", text: san, onclick: () => jumpTo(index + 1) }));
  });
  return crumb;
}

function computeFen(path) {
  const chess = new Chess();
  for (const san of path) {
    // chess.js throws (rather than returning falsy) on a SAN it can't replay — defensively stop
    // rather than crash the render on an unexpected mismatch.
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess.fen();
}

// Resolves the current node's tracked children (SAN only) to board squares, so the interactive
// board can match a click against them — chess.js is what knows square coordinates for a SAN,
// so this replay happens here rather than in engine.js's chess.js-free resolveSquareClick().
function trackedMovesFromFen(fen, node) {
  const chess = new Chess(fen);
  const moves = [];
  for (const child of childrenOf(node)) {
    // A tracked SAN should always replay against its own node's FEN, but chess.js *throws*
    // (rather than returning falsy) on one it can't parse/legalize here — defensively skip
    // rather than let one bad/ambiguous historical SAN take the whole board down.
    try {
      const move = chess.move(child.san);
      moves.push({ san: child.san, from: move.from, to: move.to });
      chess.undo();
    } catch {
      continue;
    }
  }
  return moves;
}

function handleSquareClick(square, moves) {
  const { selection, san } = resolveSquareClick(state.selectedSquare, square, moves);
  if (san) {
    descend(san); // also resets state.selectedSquare and re-renders
    return;
  }
  state.selectedSquare = selection;
  render();
}

function renderBoardPane(node) {
  const wrap = el("div", { class: "board-wrap" });
  const fen = computeFen(state.path);
  const trackedMoves = trackedMovesFromFen(fen, node);
  wrap.appendChild(renderBoard(fen, state.color, trackedMoves));

  const record = `${node.wins}W ${node.draws}D ${node.losses}L`;
  wrap.appendChild(
    el("p", {
      class: "node-summary",
      text: node.total ? `${node.total} game${node.total === 1 ? "" : "s"} reach this position — ${record}` : "No games match these filters.",
    }),
  );
  wrap.appendChild(renderGamesPanel(node));
  return wrap;
}

// The actual games behind the currently-viewed position — openingtree.com-style "see the games,
// open one in a new tab." Collapsed by default (a root node's list can be the entire lookup);
// capped to the most recent GAMES_PANEL_DISPLAY_CAP so a very common position doesn't render an
// unbounded list.
function renderGamesPanel(node) {
  const wrap = el("div", { class: "games-panel" });
  if (!node.total) return wrap;

  wrap.appendChild(
    el("button", {
      type: "button",
      class: "games-toggle",
      text: state.showGames ? "Hide games ▲" : `Show games (${node.total}) ▼`,
      onclick: toggleGamesPanel,
    }),
  );

  if (!state.showGames) return wrap;

  const sorted = [...node.games].sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0));
  const shown = sorted.slice(0, GAMES_PANEL_DISPLAY_CAP);

  const list = el("ul", { class: "games-list" });
  for (const game of shown) {
    list.appendChild(
      el("li", { class: "game-row" }, [
        el("span", { class: `game-outcome ${game.outcome}`, text: game.outcome.toUpperCase() }),
        el("span", { class: "game-date", text: formatDate(game.playedAt) }),
        renderPlayersLabel(game),
        el("span", { class: "game-speed", text: game.speed }),
        el("a", { class: "game-link", href: game.url, target: "_blank", rel: "noopener noreferrer", text: "Open ↗" }),
      ]),
    );
  }
  wrap.appendChild(list);

  if (sorted.length > GAMES_PANEL_DISPLAY_CAP) {
    wrap.appendChild(
      el("p", {
        class: "games-more-note",
        text: `Showing the ${GAMES_PANEL_DISPLAY_CAP} most recent of ${sorted.length} games.`,
      }),
    );
  }

  return wrap;
}

function renderBoard(fen, orientation, trackedMoves) {
  const chess = new Chess(fen);
  const rows = chess.board();

  const cells = [];
  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    for (let colIndex = 0; colIndex < 8; colIndex += 1) {
      const rankNumber = 8 - rowIndex;
      const isLight = (colIndex + rankNumber) % 2 === 0;
      const square = `${"abcdefgh"[colIndex]}${rankNumber}`;
      cells.push({ piece: rows[rowIndex][colIndex], isLight, square });
    }
  }
  // A 180° rotation of the flat, row-major cell list is exactly a board flip.
  const ordered = orientation === "black" ? [...cells].reverse() : cells;

  // Squares reachable from the current selection, via a tracked move — highlighted so it's
  // obvious which of the (potentially several) legal-looking destinations actually have data.
  const targets = state.selectedSquare
    ? new Set(trackedMoves.filter((m) => m.from === state.selectedSquare).map((m) => m.to))
    : null;

  const boardEl = el("div", { class: "board" });
  for (const cell of ordered) {
    const classes = ["square", cell.isLight ? "light" : "dark"];
    if (cell.square === state.selectedSquare) classes.push("selected");
    if (targets?.has(cell.square)) classes.push("move-target");
    const squareEl = el("div", {
      class: classes.join(" "),
      onclick: () => handleSquareClick(cell.square, trackedMoves),
    });
    if (cell.piece) squareEl.appendChild(pieceIcon(cell.piece));
    boardEl.appendChild(squareEl);
  }
  return boardEl;
}

function renderMoveList(node) {
  const wrap = el("div", { class: "move-list" });
  const children = childrenOf(node);

  if (!children.length) {
    wrap.appendChild(
      el("p", { class: "empty-node", text: node.total ? "No further games recorded from this position." : "Nothing to show yet." }),
    );
    return wrap;
  }

  wrap.appendChild(
    el("div", { class: "legend" }, [
      el("span", { class: "win", text: "Win" }),
      el("span", { class: "draw", text: "Draw" }),
      el("span", { class: "loss", text: "Loss" }),
    ]),
  );

  const tbody = el("tbody");
  for (const child of children) {
    const bar = el("div", { class: "result-bar" }, [
      el("div", { class: "win", style: `width:${child.winRate * 100}%` }),
      el("div", { class: "draw", style: `width:${child.drawRate * 100}%` }),
      el("div", { class: "loss", style: `width:${child.lossRate * 100}%` }),
    ]);
    tbody.appendChild(
      el("tr", { onclick: () => descend(child.san) }, [
        el("td", { class: "san", text: child.san }),
        el("td", { class: "count", text: `${child.total} (${formatPercent(child.winRate)}/${formatPercent(child.drawRate)}/${formatPercent(child.lossRate)})` }),
        el("td", {}, [bar]),
      ]),
    );
  }

  wrap.appendChild(
    el("table", {}, [
      el("thead", {}, [
        el("tr", {}, [el("th", { text: "Move" }), el("th", { text: "Games (W/D/L)" }), el("th", { text: "" })]),
      ]),
      tbody,
    ]),
  );

  return wrap;
}

await loadPieceSprite();
render();
