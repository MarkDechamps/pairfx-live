// DOM wiring only — no logic lives here beyond gluing user input to engine.js/db.js and
// painting the result. Deliberately not unit tested, same convention as opening-tree/app.js.

import { Chess } from "./vendor/chess-js/chess.js";
import {
  openIndexedDbStore,
  listRepertoires,
  createRepertoire,
  renameRepertoire,
  deleteRepertoire,
  saveRepertoireTree,
} from "./db.js";
import {
  splitPgnGames,
  mergeMovetextIntoTree,
  childrenOf,
  nodeAtPath,
  resolveSquareClick,
  nodesInScope,
  trainableNodesInScope,
  isTraineeMove,
  isDue,
  initCard,
  gradeCard,
  pickNextDue,
  leastRecentFirst,
} from "./engine.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const PIECE_SPRITE_URL = "./vendor/chess-pieces/standard.svg";

const state = {
  store: null,
  repertoires: [],
  colorTab: "white",
  view: "list", // "list" | "browse" | "settings" | "train" | "summary"
  activeRepertoireId: null,
  path: [], // browse: SAN moves from the root to the currently viewed node
  selectedSquare: null, // browse board's click-to-move source square
  boardFlipped: false,
  newRepertoireName: "",
  uploadTargetId: "", // "" | a repertoire id | "__new__"
  uploadNewName: "",
  settingsContext: null, // {kind: "repertoire", repertoireId} | {kind: "all", color}
  settingsForm: { method: "spaced-repetition", boardOrientation: "auto", wrongMoveHandling: "strict" },
  session: null,
  error: null,
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

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

// Same Cburnett sprite as opening-tree, drawn the same way — see that app's CLAUDE.md.
function pieceIcon(piece) {
  const svg = svgEl("svg", { viewBox: "0 0 40 40", class: "piece" });
  svg.appendChild(svgEl("use", { href: `#${piece.color}${piece.type}` }));
  return svg;
}

async function loadPieceSprite() {
  const response = await fetch(PIECE_SPRITE_URL);
  const host = document.createElement("div");
  host.hidden = true;
  host.innerHTML = await response.text();
  document.body.appendChild(host);
}

function getRepertoireById(id) {
  return state.repertoires.find((r) => r.id === id) ?? null;
}

function repertoiresForColor(color) {
  return state.repertoires.filter((r) => r.color === color);
}

async function refreshRepertoires() {
  state.repertoires = await listRepertoires(state.store);
}

function runAction(promise) {
  promise
    .catch((err) => {
      state.error = err instanceof Error ? err : new Error(String(err));
    })
    .finally(render);
}

// ---------------------------------------------------------------------------
// Board: FEN replay + piece placement, shared by the browsing board and the training board.
// ---------------------------------------------------------------------------

function computeFen(path) {
  const chess = new Chess();
  for (const san of path) {
    try {
      chess.move(san); // chess.js throws (rather than returning falsy) on a bad SAN — see opening-tree/app.js
    } catch {
      break;
    }
  }
  return chess.fen();
}

function boardCells(fen, orientation) {
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
  return orientation === "black" ? [...cells].reverse() : cells;
}

// Wires native HTML5 drag-and-drop onto one square so dragging a piece behaves exactly like
// "click the source square, then click the destination" — both boards' move-resolution logic
// (resolveSquareClick for browsing, the legal-move lookup for training) only ever needs a from
// and a to square, however they were supplied. `dragstart` plays the role of that first click
// (selecting the source, via `setSelectedSquare`) and `drop` plays the second (`handleClick`,
// the exact same closure the square's own `onclick` uses) — so dragging and clicking are two
// input methods for one gesture, not two separate code paths.
function wireDragAndDrop(squareEl, pieceEl, square, canDragFrom, setSelectedSquare, handleClick) {
  squareEl.addEventListener("dragover", (event) => event.preventDefault());
  squareEl.addEventListener("dragenter", (event) => event.currentTarget.classList.add("drag-over"));
  squareEl.addEventListener("dragleave", (event) => event.currentTarget.classList.remove("drag-over"));
  squareEl.addEventListener("drop", (event) => {
    event.preventDefault();
    squareEl.classList.remove("drag-over");
    handleClick();
  });

  if (!pieceEl || !canDragFrom) return;
  // `draggable` has to live on the square (an HTML <div>), not the piece (an inline <svg>).
  // Chromium accepts draggable="true" on an <svg> without complaint, but never actually fires
  // dragstart for it on a real mouse gesture — only synthetic, JS-dispatched DragEvents "work",
  // which is exactly why that's a poor way to test this (see CLAUDE.md's Judgment calls: a real
  // mouse drag was the only thing that caught this). `setDragImage` keeps the *visual* drag
  // ghost as just the piece, not the whole square tile, so this doesn't look any different from
  // dragging the SVG would have.
  squareEl.setAttribute("draggable", "true");
  squareEl.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", square); // Firefox won't start a drag without this
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setDragImage(pieceEl, pieceEl.clientWidth / 2, pieceEl.clientHeight / 2);
    setSelectedSquare(square);
  });
  // Re-render on dragend (fires after drop, success or not) so a drop outside any square — or
  // one that only reselects rather than completes a move — still reflects the new selection.
  // Never render synchronously inside dragstart itself: that would tear down the very DOM node
  // the browser is currently dragging and abort the gesture.
  squareEl.addEventListener("dragend", () => render());
}

// ---------------------------------------------------------------------------
// Repertoire list
// ---------------------------------------------------------------------------

function setColorTab(color) {
  state.colorTab = color;
  state.uploadTargetId = "";
  render();
}

async function handleCreateRepertoire(event) {
  event.preventDefault();
  const name = state.newRepertoireName.trim();
  if (!name) return;
  await createRepertoire(state.store, { name, color: state.colorTab });
  state.newRepertoireName = "";
  await refreshRepertoires();
}

async function handleRename(repertoire) {
  const name = window.prompt("Rename repertoire", repertoire.name);
  if (!name || !name.trim() || name.trim() === repertoire.name) return;
  await renameRepertoire(state.store, repertoire.id, name.trim());
  await refreshRepertoires();
}

async function handleDelete(repertoire) {
  if (!window.confirm(`Delete "${repertoire.name}"? This can't be undone.`)) return;
  await deleteRepertoire(state.store, repertoire.id);
  if (state.activeRepertoireId === repertoire.id) openList();
  await refreshRepertoires();
}

async function handleUpload(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const files = Array.from(form.elements.pgnFiles.files ?? []);
  if (!files.length) throw new Error("Choose at least one PGN file to upload.");

  let repertoire;
  if (state.uploadTargetId === "__new__") {
    const name = state.uploadNewName.trim();
    if (!name) throw new Error("Name the new repertoire before uploading into it.");
    repertoire = await createRepertoire(state.store, { name, color: state.colorTab });
  } else {
    repertoire = getRepertoireById(state.uploadTargetId);
    if (!repertoire) throw new Error("Choose a repertoire to upload into first.");
  }

  const texts = await Promise.all(files.map((file) => file.text()));
  for (const text of texts) {
    for (const game of splitPgnGames(text)) {
      mergeMovetextIntoTree(repertoire.tree, game.movetext);
    }
  }
  await saveRepertoireTree(state.store, repertoire.id, repertoire.tree);

  state.uploadTargetId = "";
  state.uploadNewName = "";
  await refreshRepertoires();
}

function renderCreateForm() {
  const form = el("form", { class: "create-form", onsubmit: (e) => runAction(handleCreateRepertoire(e)) });
  form.appendChild(
    el("input", {
      type: "text",
      placeholder: "New repertoire name",
      value: state.newRepertoireName,
      oninput: (e) => {
        state.newRepertoireName = e.target.value;
      },
    }),
  );
  form.appendChild(el("button", { type: "submit", text: "+ Create" }));
  return form;
}

function renderUploadForm(repertoires) {
  const form = el("form", { class: "upload-form", onsubmit: (e) => runAction(handleUpload(e)) });

  const options = [el("option", { value: "", selected: state.uploadTargetId === "", text: "Choose a repertoire…" })];
  for (const repertoire of repertoires) {
    options.push(el("option", { value: repertoire.id, selected: state.uploadTargetId === repertoire.id, text: repertoire.name }));
  }
  options.push(el("option", { value: "__new__", selected: state.uploadTargetId === "__new__", text: "+ New repertoire…" }));

  form.appendChild(
    el("label", {}, [
      "Upload into",
      el("select", { name: "target", onchange: (e) => { state.uploadTargetId = e.target.value; render(); } }, options),
    ]),
  );

  if (state.uploadTargetId === "__new__") {
    form.appendChild(
      el("input", {
        type: "text",
        placeholder: "New repertoire name",
        value: state.uploadNewName,
        oninput: (e) => {
          state.uploadNewName = e.target.value;
        },
      }),
    );
  }

  form.appendChild(el("input", { type: "file", name: "pgnFiles", accept: ".pgn,.txt", multiple: "multiple" }));
  form.appendChild(el("button", { type: "submit", text: "Upload PGN(s)" }));
  return form;
}

function renderRepertoireList() {
  const section = el("section", { class: "repertoire-list" });

  section.appendChild(
    el(
      "div",
      { class: "color-tabs" },
      ["white", "black"].map((color) =>
        el("button", {
          type: "button",
          class: color === state.colorTab ? "active" : "",
          text: color === "white" ? "White repertoires" : "Black repertoires",
          onclick: () => setColorTab(color),
        }),
      ),
    ),
  );

  const repertoires = repertoiresForColor(state.colorTab);

  if (repertoires.length) {
    section.appendChild(
      el("button", {
        type: "button",
        class: "train-all",
        text: `⚙ Train all ${state.colorTab} repertoires`,
        onclick: () => openSettings({ kind: "all", color: state.colorTab }),
      }),
    );
  }

  if (repertoires.length) {
    const list = el("ul", { class: "repertoires" });
    for (const repertoire of repertoires) {
      const positionCount = nodesInScope(repertoire.tree).length;
      list.appendChild(
        el("li", { class: "repertoire-row" }, [
          el("span", { class: "repertoire-name", text: repertoire.name }),
          el("span", { class: "repertoire-count", text: `${positionCount} position${positionCount === 1 ? "" : "s"}` }),
          el("button", { type: "button", text: "Browse", onclick: () => openBrowse(repertoire.id) }),
          el("button", { type: "button", text: "Train", onclick: () => openSettings({ kind: "repertoire", repertoireId: repertoire.id }) }),
          el("button", { type: "button", text: "Rename", onclick: () => runAction(handleRename(repertoire)) }),
          el("button", { type: "button", class: "delete", text: "Delete", onclick: () => runAction(handleDelete(repertoire)) }),
        ]),
      );
    }
    section.appendChild(list);
  } else {
    section.appendChild(
      el("p", { class: "empty-list", text: `No ${state.colorTab} repertoires yet — create one below, or upload a PGN straight into a new one.` }),
    );
  }

  section.appendChild(renderCreateForm());
  section.appendChild(renderUploadForm(repertoires));

  return section;
}

// ---------------------------------------------------------------------------
// Browsing
// ---------------------------------------------------------------------------

function openList() {
  state.view = "list";
  state.activeRepertoireId = null;
  render();
}

function openBrowse(id) {
  state.activeRepertoireId = id;
  state.path = [];
  state.selectedSquare = null;
  state.boardFlipped = false;
  state.view = "browse";
  render();
}

function descend(san) {
  state.path = [...state.path, san];
  state.selectedSquare = null;
  render();
}

function jumpTo(plyCount) {
  state.path = state.path.slice(0, plyCount);
  state.selectedSquare = null;
  render();
}

function toggleBoardFlip() {
  state.boardFlipped = !state.boardFlipped;
  render();
}

// The board's default orientation is the repertoire's own color — "what you play as" reads
// naturally with that color's pieces at the bottom, same rule as opening-tree — unless flipped.
function boardOrientationForBrowse(repertoire) {
  if (!state.boardFlipped) return repertoire.color;
  return repertoire.color === "white" ? "black" : "white";
}

function trackedMovesFromFen(fen, node) {
  const chess = new Chess(fen);
  const moves = [];
  for (const child of childrenOf(node)) {
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

function handleBrowseSquareClick(square, moves) {
  const { selection, san } = resolveSquareClick(state.selectedSquare, square, moves);
  if (san) {
    descend(san);
    return;
  }
  state.selectedSquare = selection;
  render();
}

function renderStaticBoard(fen, orientation, trackedMoves, onSquareClick) {
  const cells = boardCells(fen, orientation);
  const targets = state.selectedSquare
    ? new Set(trackedMoves.filter((m) => m.from === state.selectedSquare).map((m) => m.to))
    : null;

  const boardEl = el("div", { class: "board" });
  for (const cell of cells) {
    const classes = ["square", cell.isLight ? "light" : "dark"];
    if (cell.square === state.selectedSquare) classes.push("selected");
    if (targets?.has(cell.square)) classes.push("move-target");

    const handleClick = () => onSquareClick(cell.square, trackedMoves);
    const squareEl = el("div", { class: classes.join(" "), "data-square": cell.square, onclick: handleClick });
    const pieceEl = cell.piece ? pieceIcon(cell.piece) : null;
    if (pieceEl) squareEl.appendChild(pieceEl);

    const canDragFrom = trackedMoves.some((m) => m.from === cell.square);
    wireDragAndDrop(squareEl, pieceEl, cell.square, canDragFrom, (sq) => { state.selectedSquare = sq; }, handleClick);

    boardEl.appendChild(squareEl);
  }
  return boardEl;
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

function moveBadge(repertoire, childPath, childNode) {
  if (!isTraineeMove(childPath, repertoire.color)) return "opponent";
  if (!childNode.card) return "new";
  return isDue(childNode.card) ? "due" : "learned";
}

const BADGE_LABEL = { opponent: "opponent's reply", new: "not trained yet", due: "due for review", learned: "learned" };

function renderMoveList(repertoire, node) {
  const wrap = el("div", { class: "move-list" });
  const children = childrenOf(node);

  if (!children.length) {
    wrap.appendChild(el("p", { class: "empty-node", text: "Nothing tracked beyond this position yet." }));
    return wrap;
  }

  const tbody = el("tbody");
  for (const child of children) {
    const childPath = [...state.path, child.san];
    const badge = moveBadge(repertoire, childPath, child.node);
    tbody.appendChild(
      el("tr", { onclick: () => descend(child.san) }, [
        el("td", { class: "san", text: child.san }),
        el("td", { class: `badge badge-${badge}`, text: BADGE_LABEL[badge] }),
      ]),
    );
  }

  wrap.appendChild(
    el("table", {}, [el("thead", {}, [el("tr", {}, [el("th", { text: "Move" }), el("th", { text: "Status" })])]), tbody]),
  );
  return wrap;
}

function renderBrowseBoardPane(repertoire, node) {
  const wrap = el("div", { class: "board-wrap" });
  const fen = computeFen(state.path);
  const trackedMoves = trackedMovesFromFen(fen, node);

  wrap.appendChild(
    el("div", { class: "board-toolbar" }, [
      el("button", { type: "button", class: "drill-branch", text: "▶ Drill from here", onclick: () => startDrill(repertoire, state.path) }),
      el("button", { type: "button", class: "flip-board", text: "⇅ Flip board", onclick: toggleBoardFlip }),
    ]),
  );
  wrap.appendChild(renderStaticBoard(fen, boardOrientationForBrowse(repertoire), trackedMoves, handleBrowseSquareClick));

  const continuationCount = childrenOf(node).length;
  wrap.appendChild(
    el("p", {
      class: "node-summary",
      text: continuationCount
        ? `${continuationCount} tracked continuation${continuationCount === 1 ? "" : "s"} from here.`
        : "End of this line — nothing tracked beyond here.",
    }),
  );
  return wrap;
}

function renderBrowse() {
  const repertoire = getRepertoireById(state.activeRepertoireId);
  if (!repertoire) {
    openList();
    return el("div");
  }
  const node = nodeAtPath(repertoire.tree, state.path) ?? repertoire.tree;

  const section = el("section", { class: "browse" });
  section.appendChild(
    el("div", { class: "browse-header" }, [
      el("button", { type: "button", class: "back-to-list", text: "← All repertoires", onclick: openList }),
      el("h2", { text: `${repertoire.name} · ${repertoire.color === "white" ? "White" : "Black"}` }),
      el("button", {
        type: "button",
        class: "train-repertoire",
        text: "⚙ Train this repertoire",
        onclick: () => openSettings({ kind: "repertoire", repertoireId: repertoire.id }),
      }),
    ]),
  );
  section.appendChild(renderBreadcrumb());

  const explorer = el("div", { class: "explorer" });
  explorer.appendChild(renderBrowseBoardPane(repertoire, node));
  explorer.appendChild(renderMoveList(repertoire, node));
  section.appendChild(explorer);

  return section;
}

// ---------------------------------------------------------------------------
// Training settings screen
// ---------------------------------------------------------------------------

function openSettings(context) {
  state.settingsContext = context;
  state.view = "settings";
  render();
}

function settingsLabel(context) {
  if (context.kind === "repertoire") return getRepertoireById(context.repertoireId)?.name ?? "Repertoire";
  return `All ${context.color} repertoires`;
}

function renderSettings() {
  const context = state.settingsContext;
  const wrap = el("section", { class: "settings-screen" });
  wrap.appendChild(el("h2", { text: `Train: ${settingsLabel(context)}` }));

  wrap.appendChild(
    el("label", {}, [
      "Method",
      el(
        "select",
        { onchange: (e) => { state.settingsForm.method = e.target.value; } },
        [
          el("option", { value: "spaced-repetition", selected: state.settingsForm.method === "spaced-repetition", text: "Spaced repetition (recommended)" }),
          el("option", { value: "review-in-order", selected: state.settingsForm.method === "review-in-order", text: "Review in order" }),
          el("option", { value: "least-recent", selected: state.settingsForm.method === "least-recent", text: "Least recent / unseen first" }),
        ],
      ),
    ]),
  );

  wrap.appendChild(
    el("label", {}, [
      "Board orientation",
      el(
        "select",
        { onchange: (e) => { state.settingsForm.boardOrientation = e.target.value; } },
        [
          el("option", { value: "auto", selected: state.settingsForm.boardOrientation === "auto", text: "Auto (match repertoire color)" }),
          el("option", { value: "white", selected: state.settingsForm.boardOrientation === "white", text: "White at bottom" }),
          el("option", { value: "black", selected: state.settingsForm.boardOrientation === "black", text: "Black at bottom" }),
        ],
      ),
    ]),
  );

  wrap.appendChild(
    el("label", {}, [
      "Wrong-move handling",
      el(
        "select",
        { onchange: (e) => { state.settingsForm.wrongMoveHandling = e.target.value; } },
        [
          el("option", { value: "strict", selected: state.settingsForm.wrongMoveHandling === "strict", text: "Strict — must play the correct move" }),
          el("option", { value: "lenient", selected: state.settingsForm.wrongMoveHandling === "lenient", text: "Lenient — show it, then continue" }),
        ],
      ),
    ]),
  );

  wrap.appendChild(
    el("div", { class: "settings-actions" }, [
      el("button", { type: "button", class: "start-training", text: "Start training ▶", onclick: () => startSession(context, { ...state.settingsForm }) }),
      el("button", { type: "button", class: "cancel-settings", text: "Cancel", onclick: openList }),
    ]),
  );

  return wrap;
}

// ---------------------------------------------------------------------------
// Training session
// ---------------------------------------------------------------------------

function buildEntries(scope) {
  if (scope.kind === "branch" || scope.kind === "repertoire") {
    const repertoire = getRepertoireById(scope.repertoireId);
    const path = scope.kind === "branch" ? scope.path : [];
    return trainableNodesInScope(repertoire.tree, repertoire.color, path).map((entry) => ({ ...entry, repertoireId: repertoire.id }));
  }
  // "all"
  return repertoiresForColor(scope.color).flatMap((repertoire) =>
    trainableNodesInScope(repertoire.tree, repertoire.color, []).map((entry) => ({ ...entry, repertoireId: repertoire.id })),
  );
}

function sessionColorFor(scope) {
  if (scope.kind === "all") return scope.color;
  return getRepertoireById(scope.repertoireId).color;
}

function startDrill(repertoire, path) {
  startSession({ kind: "branch", repertoireId: repertoire.id, path }, { method: "review-in-order", boardOrientation: "auto", wrongMoveHandling: "strict" });
}

function startSession(scope, settings) {
  const entries = buildEntries(scope);
  if (!entries.length) {
    state.error = new Error("Nothing to train in that scope yet — browse to a position with tracked moves, or upload more PGNs.");
    render();
    return;
  }

  state.session = {
    scope,
    settings,
    color: sessionColorFor(scope),
    entries: settings.method === "least-recent" ? leastRecentFirst(entries) : entries,
    index: 0, // fixed-order methods only
    current: null,
    selectedSquare: null,
    boardFlipped: false, // manual override of settings.boardOrientation, like browse's flip button
    wrongThisTurn: false,
    gradedThisTurn: false,
    results: { correct: 0, incorrect: 0 },
  };
  state.view = "train";
  advanceSession();
}

function advanceSession() {
  const session = state.session;
  const next =
    session.settings.method === "spaced-repetition"
      ? pickNextDue(session.entries, { excludePath: session.current?.path })
      : session.entries[session.index++] ?? null;

  if (!next) {
    state.view = "summary";
    render();
    return;
  }

  session.current = next;
  session.selectedSquare = null;
  session.wrongThisTurn = false;
  session.gradedThisTurn = false;
  render();
}

// Grades the card currently being tested — exactly once per turn (a repeated wrong attempt, or
// the eventual correct one after a strict retry, must never grade twice), which is why setting
// `gradedThisTurn` lives here rather than at each call site: callers only ever need to check it
// before calling, never remember to set it afterward.
function gradeCurrentCard(correct) {
  const session = state.session;
  const { node, repertoireId } = session.current;
  node.card = gradeCard(node.card ?? initCard(), correct);
  session.results[correct ? "correct" : "incorrect"] += 1;
  session.gradedThisTurn = true;

  const repertoire = getRepertoireById(repertoireId);
  runAction(saveRepertoireTree(state.store, repertoire.id, repertoire.tree).then(refreshRepertoires));
}

function handleAttempt(attemptedSan) {
  const session = state.session;
  const { path } = session.current;
  const expectedSan = path[path.length - 1];

  if (attemptedSan === expectedSan) {
    if (!session.gradedThisTurn) gradeCurrentCard(true);
    advanceSession();
    return;
  }

  session.wrongThisTurn = true;
  if (!session.gradedThisTurn) gradeCurrentCard(false);
  render();
}

function continueAfterLenientMiss() {
  advanceSession();
}

function endSession() {
  state.view = "summary";
  render();
}

function toggleSessionBoardFlip() {
  state.session.boardFlipped = !state.session.boardFlipped;
  render();
}

// The settings-screen orientation choice (auto/white/black) is the session's default; flipping
// during training is a purely visual override on top of it, same relationship browse's flip
// button has to the color-tab default — it never touches session.current or move input.
function sessionBoardOrientation(session) {
  const base = session.settings.boardOrientation === "auto" ? session.color : session.settings.boardOrientation;
  if (!session.boardFlipped) return base;
  return base === "white" ? "black" : "white";
}

// A pawn reaching the last rank offers one legal move per promotion piece, all sharing the same
// from/to — default to queen, same simplification opening-tree's board input never had to make
// (its board is browse-only, never asked to produce a *new* move).
function resolveLegalMove(legalMoves, from, to) {
  const candidates = legalMoves.filter((m) => m.from === from && m.to === to);
  if (!candidates.length) return null;
  return candidates.find((m) => !m.promotion || m.promotion === "q") ?? candidates[0];
}

function attemptTrainingMove(square, legalMoves) {
  const session = state.session;

  if (session.selectedSquare) {
    const move = resolveLegalMove(legalMoves, session.selectedSquare, square);
    session.selectedSquare = null;
    if (!move) {
      render();
      return;
    }
    handleAttempt(move.san);
    return;
  }

  const hasMoveFromSquare = legalMoves.some((m) => m.from === square);
  session.selectedSquare = hasMoveFromSquare ? square : null;
  render();
}

function renderTrainingBoard(fen, orientation, expectedSan) {
  const session = state.session;
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });
  const cells = boardCells(fen, orientation);

  const targets = session.selectedSquare
    ? new Set(legalMoves.filter((m) => m.from === session.selectedSquare).map((m) => m.to))
    : null;

  let hintFrom = null;
  let hintTo = null;
  if (session.wrongThisTurn && session.settings.wrongMoveHandling === "strict") {
    const correctMove = legalMoves.find((m) => m.san === expectedSan);
    if (correctMove) {
      hintFrom = correctMove.from;
      hintTo = correctMove.to;
    }
  }

  const boardEl = el("div", { class: "board" });
  for (const cell of cells) {
    const classes = ["square", cell.isLight ? "light" : "dark"];
    if (cell.square === session.selectedSquare) classes.push("selected");
    if (targets?.has(cell.square)) classes.push("move-target");
    if (cell.square === hintFrom || cell.square === hintTo) classes.push("hint");

    const handleClick = () => attemptTrainingMove(cell.square, legalMoves);
    const squareEl = el("div", { class: classes.join(" "), "data-square": cell.square, onclick: handleClick });
    const pieceEl = cell.piece ? pieceIcon(cell.piece) : null;
    if (pieceEl) squareEl.appendChild(pieceEl);

    const canDragFrom = legalMoves.some((m) => m.from === cell.square);
    wireDragAndDrop(squareEl, pieceEl, cell.square, canDragFrom, (sq) => { session.selectedSquare = sq; }, handleClick);

    boardEl.appendChild(squareEl);
  }
  return boardEl;
}

function renderTrainingSession() {
  const session = state.session;
  const { path } = session.current;
  const repertoire = getRepertoireById(session.current.repertoireId);
  const expectedSan = path[path.length - 1];
  const beforeFen = computeFen(path.slice(0, -1));
  const orientation = sessionBoardOrientation(session);
  const answered = session.results.correct + session.results.incorrect;

  const section = el("section", { class: "training" });
  section.appendChild(
    el("div", { class: "training-header" }, [
      el("span", { class: "training-repertoire", text: `${repertoire.name} · ${repertoire.color}` }),
      el("span", { class: "training-progress", text: `${answered} answered · ${session.results.correct} correct` }),
      el("button", { type: "button", class: "end-session", text: "End session", onclick: endSession }),
    ]),
  );

  if (session.wrongThisTurn) {
    const message =
      session.settings.wrongMoveHandling === "strict"
        ? `Not quite — the prepared move is ${expectedSan}. Play it (highlighted) to continue.`
        : `Not quite — the prepared move was ${expectedSan}.`;
    section.appendChild(el("p", { class: "training-feedback wrong", text: message }));
    if (session.settings.wrongMoveHandling === "lenient") {
      section.appendChild(el("button", { type: "button", class: "continue-training", text: "Continue ▶", onclick: continueAfterLenientMiss }));
    }
  } else {
    section.appendChild(el("p", { class: "training-feedback prompt", text: "Your move — what's the prepared response here?" }));
  }

  section.appendChild(
    el("div", { class: "board-wrap" }, [
      el("div", { class: "board-toolbar" }, [
        el("button", { type: "button", class: "flip-board", text: "⇅ Flip board", onclick: toggleSessionBoardFlip }),
      ]),
      renderTrainingBoard(beforeFen, orientation, expectedSan),
    ]),
  );
  return section;
}

function renderSessionSummary() {
  const session = state.session;
  const total = session.results.correct + session.results.incorrect;

  const section = el("section", { class: "summary-screen" });
  section.appendChild(el("h2", { text: "Session complete" }));
  section.appendChild(
    el("p", {
      text: total ? `${session.results.correct} / ${total} correct.` : "Nothing was due — you're all caught up!",
    }),
  );
  section.appendChild(
    el("button", {
      type: "button",
      text: "Back to repertoires",
      onclick: () => {
        state.session = null;
        openList();
      },
    }),
  );
  return section;
}

// ---------------------------------------------------------------------------
// Render dispatch + bootstrap
// ---------------------------------------------------------------------------

function render() {
  app.innerHTML = "";

  if (state.error) {
    app.appendChild(
      el("div", { class: "error-banner" }, [
        el("span", { text: state.error.message }),
        el("button", { type: "button", text: "✕", onclick: () => { state.error = null; render(); } }),
      ]),
    );
  }

  if (!state.store) {
    app.appendChild(el("p", { class: "loading-store", text: "Loading your repertoires…" }));
    return;
  }

  if (state.view === "browse") app.appendChild(renderBrowse());
  else if (state.view === "settings") app.appendChild(renderSettings());
  else if (state.view === "train") app.appendChild(renderTrainingSession());
  else if (state.view === "summary") app.appendChild(renderSessionSummary());
  else app.appendChild(renderRepertoireList());
}

async function init() {
  await loadPieceSprite();
  try {
    state.store = await openIndexedDbStore();
    state.repertoires = await listRepertoires(state.store);
  } catch (err) {
    state.error = err instanceof Error ? err : new Error("Couldn't open local storage.");
  }
  render();
}

await init();
