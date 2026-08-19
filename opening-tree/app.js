// DOM wiring only — no logic lives here beyond gluing user input to engine.js/client.js and
// painting the result. Deliberately not unit tested, same convention as chess-classroom's
// app.js/projector.js: there's nothing here worth testing in isolation once engine.js and
// client.js (the parts that actually have logic) are covered. See CLAUDE.md.

import { Chess } from "./vendor/chess-js/chess.js";
import { fetchLichessGames, fetchChessComGames } from "./client.js";
import { parseLichessNdjson, parseChessComGames, filterRecords, buildTree, childrenOf, nodeAtPath } from "./engine.js";

const LICHESS_MAX_GAMES = 500;
const CHESSCOM_MAX_MONTHS = 24; // ~2 years back

const WHITE_GLYPHS = { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" };
const BLACK_GLYPHS = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };

const state = {
  platform: "lichess",
  username: "",
  records: [], // every fetched record, both colors, unfiltered
  color: "white",
  speedFilter: [], // empty = all speeds
  ratedFilter: null, // null = any, true = rated only, false = casual only
  path: [], // SAN moves from the starting position to the currently viewed node
  loading: false,
  error: null,
  hasResults: false,
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

// ---------------------------------------------------------------------------
// Data fetch + parse
// ---------------------------------------------------------------------------

async function lookupRecords(platform, username) {
  if (platform === "lichess") {
    const text = await fetchLichessGames(username, { max: LICHESS_MAX_GAMES });
    return parseLichessNdjson(text, username);
  }
  const games = await fetchChessComGames(username, { maxMonths: CHESSCOM_MAX_MONTHS });
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
  state.error = null;
  state.hasResults = false;
  render();

  try {
    const records = await lookupRecords(platform, username);
    state.records = records;
    state.color = defaultColorFor(records);
    state.speedFilter = [];
    state.ratedFilter = null;
    state.path = [];
    state.hasResults = true;
  } catch (error) {
    // client.js already produces user-presentable messages (unknown user, rate-limited,
    // platform request failed); anything else is a genuinely unexpected failure.
    state.error = error instanceof Error ? error : new Error("Something went wrong fetching those games. Please try again.");
  } finally {
    state.loading = false;
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
  render();
}

function toggleSpeed(speed, checked) {
  state.speedFilter = checked
    ? [...state.speedFilter, speed]
    : state.speedFilter.filter((s) => s !== speed);
  state.path = [];
  render();
}

function setRatedFilter(value) {
  state.ratedFilter = value === "any" ? null : value === "rated";
  state.path = [];
  render();
}

function descend(san) {
  state.path = [...state.path, san];
  render();
}

function jumpTo(plyCount) {
  state.path = state.path.slice(0, plyCount);
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
    return el("p", { class: "status loading", text: `Fetching ${state.username}'s games from ${state.platform === "lichess" ? "Lichess" : "Chess.com"}…` });
  }
  if (state.error) {
    return el("p", { class: "status error", text: state.error.message });
  }
  return null;
}

function renderResults() {
  const section = el("section", { class: "results" });
  const { filtered, tree } = currentTree();
  const node = nodeAtPath(tree, state.path) ?? tree;

  section.appendChild(
    el("p", {
      class: "summary",
      text: `${filtered.length} of ${state.records.filter((r) => r.color === state.color).length} games as ${state.color} match the current filters (${state.records.length} total fetched).`,
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
    if (!chess.move(san)) break; // defensive: stop replay on an unexpected SAN mismatch
  }
  return chess.fen();
}

function renderBoardPane(node) {
  const wrap = el("div", { class: "board-wrap" });
  const fen = computeFen(state.path);
  wrap.appendChild(renderBoard(fen, state.color));

  const record = `${node.wins}W ${node.draws}D ${node.losses}L`;
  wrap.appendChild(
    el("p", {
      class: "node-summary",
      text: node.total ? `${node.total} game${node.total === 1 ? "" : "s"} reach this position — ${record}` : "No games match these filters.",
    }),
  );
  return wrap;
}

function renderBoard(fen, orientation) {
  const chess = new Chess(fen);
  const rows = chess.board();

  const cells = [];
  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    for (let colIndex = 0; colIndex < 8; colIndex += 1) {
      const rankNumber = 8 - rowIndex;
      const isLight = (colIndex + rankNumber) % 2 === 0;
      cells.push({ piece: rows[rowIndex][colIndex], isLight });
    }
  }
  // A 180° rotation of the flat, row-major cell list is exactly a board flip.
  const ordered = orientation === "black" ? [...cells].reverse() : cells;

  const boardEl = el("div", { class: "board" });
  for (const cell of ordered) {
    const square = el("div", { class: `square ${cell.isLight ? "light" : "dark"}` });
    if (cell.piece) {
      const glyphs = cell.piece.color === "w" ? WHITE_GLYPHS : BLACK_GLYPHS;
      square.appendChild(
        el("span", { class: cell.piece.color === "w" ? "white-piece" : "black-piece", text: glyphs[cell.piece.type] }),
      );
    }
    boardEl.appendChild(square);
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

render();
