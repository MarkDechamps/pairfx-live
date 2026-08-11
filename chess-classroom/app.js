// app.js — teacher tab wiring. DOM rendering, cm-chessboard setup, and the
// actual Web Storage/BroadcastChannel calls live here; the logic being wired
// together (i18n lookup, library rules, move-tree/cursor, sync protocol) is
// all in the co-located pure modules with their own tests. This file has no
// logic of its own worth unit-testing — see CLAUDE.md.

import { Chess } from "./vendor/chess-js/chess.js";
import { Chessboard, INPUT_EVENT_TYPE } from "./vendor/cm-chessboard/src/Chessboard.js";
import { RightClickAnnotator } from "./vendor/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";
import { Markers } from "./vendor/cm-chessboard/src/extensions/markers/Markers.js";

import * as I18n from "./i18n.js";
import * as Lib from "./pgnLibrary.js";
import * as MoveTree from "./moveTree.js";
import * as Sync from "./syncProtocol.js";
import { getAllLibraryEntries, putLibraryEntry, deleteLibraryEntry } from "./idbLibraryStore.js";

const ASSETS_URL = "vendor/cm-chessboard/assets/";
const LANG_STORAGE_KEY = "chess-classroom:lang";
const LAST_ENTRY_STORAGE_KEY = "chess-classroom:lastEntryId";
// "Lock PGN" is a teacher-only input preference (it never reaches the
// projector — see CLAUDE.md), so it's a plain localStorage key read/written
// directly here, the same way LANG_STORAGE_KEY/LAST_ENTRY_STORAGE_KEY are —
// not routed through syncProtocol.js's overlay-prefs machinery, which exists
// specifically to broadcast a *projector-facing* preference (ticket 0003).
const LOCK_PGN_STORAGE_KEY = "chess-classroom:lockPgn";
const LAST_MOVE_MARKER_TYPE = { class: "marker-last-move", slice: "markerSquare" };

// cm-chessboard's RightClickAnnotator draws with its own ARROW_TYPE/
// MARKER_TYPE class-name objects; the sync protocol only ever carries plain
// "success"/"info"/"danger"/"warning" strings (matching moveTree.js's %cal
// color mapping), so these two small codecs translate between the two at
// the DOM boundary — this is wiring, not logic worth unit-testing on its own.
function colorKeyFromClassName(className) {
  if (className.includes("danger")) return "danger";
  if (className.includes("info")) return "info";
  if (className.includes("warning")) return "warning";
  return "success";
}
const ARROW_TYPE_BY_COLOR = {
  success: { class: "arrow-success" },
  info: { class: "arrow-info" },
  danger: { class: "arrow-danger" },
  warning: { class: "arrow-warning" },
};
const MARKER_TYPE_BY_COLOR = {
  success: { class: "marker-circle-success", slice: "markerCircle" },
  info: { class: "marker-circle-info", slice: "markerCircle" },
  danger: { class: "marker-circle-danger", slice: "markerCircle" },
  warning: { class: "marker-circle-warning", slice: "markerCircle" },
};

function serializeBoardAnnotations(board) {
  const { arrows, markers } = board.getAnnotations();
  return {
    arrows: arrows.map((a) => ({ color: colorKeyFromClassName(a.type.class), from: a.from, to: a.to })),
    markers: markers.map((m) => ({ color: colorKeyFromClassName(m.type.class), square: m.square })),
  };
}

function applyAnnotationsToBoard(board, annotations) {
  board.setAnnotations({
    arrows: (annotations.arrows || []).map((a) => ({ type: ARROW_TYPE_BY_COLOR[a.color], from: a.from, to: a.to })),
    markers: (annotations.markers || []).map((m) => ({ type: MARKER_TYPE_BY_COLOR[m.color], square: m.square })),
  });
}

// ---- state -----------------------------------------------------------

const state = {
  t: (key) => key,
  entries: [],
  currentEntryId: null,
  gameTree: null,
  cursor: null,
  syncOn: true,
  lockPgn: true,
  keepAnnotations: false,
  overlays: Sync.defaultOverlayPrefs(),
  annotations: { arrows: [], markers: [] },
  pendingPickerGames: null,
  pendingPickerFilename: null,
};

const teacherSync = Sync.createTeacherSync({
  channel: new BroadcastChannel(Sync.CHANNEL_NAME),
  storage: window.localStorage,
});

// ---- DOM refs ----------------------------------------------------------

const el = {
  librarySelect: document.getElementById("librarySelect"),
  uploadBtn: document.getElementById("uploadBtn"),
  uploadInput: document.getElementById("uploadInput"),
  renameBtn: document.getElementById("renameBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  langSelect: document.getElementById("langSelect"),
  openProjectorBtn: document.getElementById("openProjectorBtn"),
  syncToggle: document.getElementById("syncToggle"),
  syncState: document.getElementById("syncState"),
  currentMove: document.getElementById("currentMove"),
  gameTitle: document.getElementById("gameTitle"),
  notesBody: document.getElementById("notesBody"),
  previewCaption: document.getElementById("previewCaption"),
  varTree: document.getElementById("varTree"),
  freeHint: document.getElementById("freeHint"),
  lockPgnCheckbox: document.getElementById("lockPgnCheckbox"),
  clearAnnotationsBtn: document.getElementById("clearAnnotationsBtn"),
  keepAnnotationsCheckbox: document.getElementById("keepAnnotationsCheckbox"),
  overlayMoveNumber: document.getElementById("overlayMoveNumber"),
  overlayLastMove: document.getElementById("overlayLastMove"),
  overlayArrows: document.getElementById("overlayArrows"),
  pickerBackdrop: document.getElementById("pickerBackdrop"),
  pickerList: document.getElementById("pickerList"),
  pickerCancelBtn: document.getElementById("pickerCancelBtn"),
};

// ---- i18n ----------------------------------------------------------------

let dictionaries = {};

async function loadDictionaries() {
  const entries = await Promise.all(
    I18n.SUPPORTED_LANGUAGES.map((lang) => fetch(`locales/${lang}.json`).then((r) => r.json()))
  );
  I18n.SUPPORTED_LANGUAGES.forEach((lang, i) => (dictionaries[lang] = entries[i]));
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((elm) => {
    elm.textContent = state.t(elm.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((elm) => {
    elm.title = state.t(elm.dataset.i18nTitle);
  });
  el.notesBody.dataset.emptyLabel = state.t("noNote");
  render();
}

let currentLang = I18n.DEFAULT_LANGUAGE;

function setLanguage(lang) {
  currentLang = lang;
  state.t = I18n.createTranslator(dictionaries, lang);
  window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  el.langSelect.value = lang;
  applyTranslations();
}

// ---- board setup -----------------------------------------------------

const teacherBoard = new Chessboard(document.getElementById("board"), {
  position: Sync.START_FEN,
  assetsUrl: ASSETS_URL,
  extensions: [{ class: RightClickAnnotator }],
});

const miniBoard = new Chessboard(document.getElementById("miniBoard"), {
  position: Sync.START_FEN,
  assetsUrl: ASSETS_URL,
  style: { showCoordinates: false },
  extensions: [{ class: Markers }],
});

function paintLastMove(board, lastMove) {
  board.removeMarkers(LAST_MOVE_MARKER_TYPE);
  if (lastMove) {
    board.addMarker(LAST_MOVE_MARKER_TYPE, lastMove.from);
    board.addMarker(LAST_MOVE_MARKER_TYPE, lastMove.to);
  }
}

// ---- library ------------------------------------------------------------

function refreshLibrarySelect() {
  el.librarySelect.innerHTML = "";
  state.entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    if (entry.id === state.currentEntryId) option.selected = true;
    el.librarySelect.appendChild(option);
  });
  const hasEntries = state.entries.length > 0;
  el.renameBtn.disabled = !hasEntries;
  el.deleteBtn.disabled = !hasEntries;
}

async function loadLibrary() {
  state.entries = await getAllLibraryEntries();
  refreshLibrarySelect();
  const lastId = window.localStorage.getItem(LAST_ENTRY_STORAGE_KEY);
  const toLoad = Lib.findEntry(state.entries, lastId) || state.entries[0] || null;
  if (toLoad) loadEntry(toLoad.id);
}

function loadEntry(id) {
  const entry = Lib.findEntry(state.entries, id);
  if (!entry) return;
  state.currentEntryId = id;
  window.localStorage.setItem(LAST_ENTRY_STORAGE_KEY, id);
  const parsed = MoveTree.parseGame(window.PgnParser.parse, entry.pgnText);
  state.gameTree = MoveTree.buildGameTree(Chess, parsed);
  state.cursor = MoveTree.createCursor(state.gameTree);
  state.annotations = { arrows: [], markers: [] };
  el.gameTitle.textContent = entry.name;
  refreshLibrarySelect();
  renderVariations();
  render();
}

async function addGameToLibrary(pgnText, tags, fallbackName) {
  if (Lib.isLibraryFull(state.entries)) {
    alert(state.t("libraryFullWarning"));
    return;
  }
  const entry = {
    id: `g${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name: Lib.nameForGame(tags, fallbackName),
    pgnText,
    createdAt: Date.now(),
  };
  state.entries = Lib.addEntry(state.entries, entry);
  await putLibraryEntry(entry);
  refreshLibrarySelect();
  loadEntry(entry.id);
}

async function handleUpload(file) {
  const text = await file.text();
  // parseGames parses each game in the file independently, so one malformed
  // game (e.g. a genuinely unbalanced parenthesis in a hand-authored or
  // OCR'd PGN) can't sink every other game in the same file — it's reported
  // via `failures` instead, not thrown.
  const { games, failures } = MoveTree.parseGames(window.PgnParser.parse, text);
  if (games.length === 0) {
    alert(state.t("invalidPgn"));
    return;
  }
  if (failures.length > 0) {
    alert(state.t("someGamesFailed", { count: failures.length, total: games.length + failures.length }));
  }
  if (!Lib.needsGamePicker(games)) {
    await addGameToLibrary(text, games[0].tags, file.name);
    return;
  }
  state.pendingPickerGames = games;
  state.pendingPickerFilename = file.name;
  openGamePicker(games, file.name);
}

function openGamePicker(games, filename) {
  const choices = Lib.gamePickerChoices(games, filename);
  el.pickerList.innerHTML = "";
  choices.forEach((choice) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = choice.label;
    btn.addEventListener("click", () => {
      closeGamePicker();
      const game = games[choice.index];
      addGameToLibrary(pgnTextForGame(game), game.tags, filename);
    });
    li.appendChild(btn);
    el.pickerList.appendChild(li);
  });
  el.pickerBackdrop.hidden = false;
}

function closeGamePicker() {
  el.pickerBackdrop.hidden = true;
  state.pendingPickerGames = null;
}

// Re-derives a standalone single-game PGN (tags + mainline SAN, including
// variations/comments as parsed) from a picked game, since the library
// stores one game's PGN text per entry (ticket 0006), not the raw upload.
function pgnTextForGame(game) {
  const tagLines = Object.entries(game.tags || {})
    .filter(([key, value]) => key !== "messages" && typeof value !== "object")
    .map(([key, value]) => `[${key} "${value}"]`)
    .join("\n");
  const result = (game.tags && game.tags.Result) || "*";
  const moveText = `${printMoves(game.moves)} ${result}`;
  return `${tagLines}\n\n${moveText}`.trim();
}

function printMoves(moves) {
  return moves
    .map((mv) => {
      let text = mv.notation.notation;
      if (mv.commentMove) text = `{${mv.commentMove}} ${text}`;
      if (mv.variations && mv.variations.length) {
        text += " " + mv.variations.map((v) => `(${printMoves(v)})`).join(" ");
      }
      if (mv.commentAfter) text += ` {${mv.commentAfter}}`;
      return text;
    })
    .join(" ");
}

// ---- rendering ------------------------------------------------------

function currentDisplay() {
  const node = state.cursor ? state.cursor.getCurrentNode() : null;
  const fen = node ? node.fen : state.gameTree ? state.gameTree.rootFen : Sync.START_FEN;
  const lastMove = node ? { from: node.from, to: node.to } : null;
  const moveLabel = node ? MoveTree.formatMoveLabel(node) : null;
  return { node, fen, lastMove, moveLabel };
}

function render() {
  const { node, fen, lastMove, moveLabel } = currentDisplay();
  teacherBoard.setPosition(fen, true);
  paintLastMove(teacherBoard, lastMove);
  el.currentMove.textContent = moveLabel || state.t("startPosition");
  el.notesBody.textContent = node ? node.commentAfter || "" : "";

  applyAnnotationsToBoard(teacherBoard, state.annotations);

  highlightActiveVariationEntry(node ? node.pathKey : "start");

  el.freeHint.hidden = state.syncOn;

  renderPreview(fen, lastMove);
  publishIfSynced(fen, lastMove, moveLabel);
}

function renderPreview(fen, lastMove) {
  miniBoard.setPosition(fen, true);
  paintLastMove(miniBoard, lastMove);
  el.previewCaption.textContent = state.syncOn ? state.t("previewCaptionOn") : state.t("previewCaptionOff");
}

function publishIfSynced(fen, lastMove, moveLabel) {
  if (!state.syncOn) return;
  const pointer = Sync.buildPointer({
    fen,
    moveLabel,
    lastMove,
    orientation: "white",
    arrows: state.overlays.arrows ? state.annotations.arrows : [],
    markers: state.overlays.arrows ? state.annotations.markers : [],
  });
  teacherSync.publishPosition(pointer);
}

// ---- variations panel -------------------------------------------------

function renderVariations() {
  el.varTree.innerHTML = "";
  if (!state.gameTree) return;
  el.varTree.appendChild(renderLine(state.gameTree.mainLine, false));
}

// Renders one line (mainline or a variation's own sequence) into a DOM node.
// `forceExpand` re-renders an already-collapsed tail without re-collapsing it
// (used by the "show more" click handler below).
function renderLine(lineNodes, isSideline, forceExpand = false) {
  const container = document.createElement(isSideline ? "span" : "div");
  if (isSideline) container.className = "var-sideline";
  lineNodes.forEach((node, i) => {
    if (!forceExpand && isSideline && MoveTree.isCollapsedByDefault(node)) {
      if (!container.querySelector(".var-expand")) {
        const remaining = lineNodes.slice(i);
        const expandBtn = document.createElement("button");
        expandBtn.className = "var-expand";
        expandBtn.textContent = state.t("showMore");
        expandBtn.addEventListener("click", () => {
          expandBtn.replaceWith(renderLine(remaining, isSideline, true));
        });
        container.appendChild(expandBtn);
      }
      return;
    }
    container.appendChild(renderMoveEntry(node));
    node.variations.forEach((variation) => {
      container.appendChild(document.createElement("br"));
      container.appendChild(renderLine(variation, true));
    });
  });
  return container;
}

function renderMoveEntry(node) {
  const btn = document.createElement("button");
  btn.className = "var-line";
  btn.dataset.pathKey = node.pathKey;
  const num = document.createElement("span");
  num.className = "num";
  num.textContent = MoveTree.formatMoveLabel(node).split(node.san)[0];
  btn.appendChild(num);
  btn.appendChild(document.createTextNode(node.san));
  btn.title = node.commentAfter || "";
  btn.addEventListener("click", () => jumpTo(node.pathKey));
  return btn;
}

function highlightActiveVariationEntry(pathKey) {
  el.varTree.querySelectorAll(".var-line.active").forEach((n) => n.classList.remove("active"));
  const active = el.varTree.querySelector(`.var-line[data-path-key="${CSS.escape(pathKey)}"]`);
  if (active) active.classList.add("active");
}

function jumpTo(pathKey) {
  state.cursor.jumpToPathKey(pathKey);
  handlePositionChanged();
}

function handlePositionChanged() {
  if (!state.keepAnnotations) {
    state.annotations = { arrows: [], markers: [] };
  }
  render();
}

// ---- board move input (ticket 0005: "clicking the board itself") -------

teacherBoard.enableMoveInput((event) => {
  if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
    return true;
  }
  if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
    return tryPlayBoardMove(event.squareFrom, event.squareTo);
  }
  return true;
});

function tryPlayBoardMove(from, to) {
  if (!state.gameTree) return false;
  const currentNode = state.cursor.getCurrentNode();
  const fen = currentNode ? currentNode.fen : state.gameTree.rootFen;
  const scratch = new Chess(fen);
  let moveResult;
  try {
    moveResult = scratch.move({ from, to, promotion: "q" });
  } catch {
    return false; // illegal chess move — always rejected, regardless of Lock PGN
  }
  const match = MoveTree.findContinuationBySan(currentNode, state.gameTree.mainLine, moveResult.san);
  if (match) {
    jumpTo(match.pathKey);
    return false; // we drive the position via setPosition ourselves in render()
  }
  if (state.lockPgn) {
    return false; // deviates from the loaded PGN and Lock PGN is on — reject (piece snaps back)
  }
  // Lock PGN is off: any legal move is playable, and it's added to the tree
  // as a real node (new sideline, or extending a line that ended here) —
  // see moveTree.js: addMove and CLAUDE.md's judgment call on this.
  const newNode = MoveTree.addMove(state.gameTree, currentNode, {
    san: moveResult.san,
    from: moveResult.from,
    to: moveResult.to,
    fenBefore: fen,
    fen: scratch.fen(),
  });
  renderVariations(); // the tree just grew — redraw so the new node is visible/clickable
  jumpTo(newNode.pathKey);
  persistGrownTree();
  return false;
}

// Persists a tree grown by addMove back to the library entry (IndexedDB), so
// a move played while Lock PGN was off survives navigating away or reloading
// — see CLAUDE.md's judgment call on this. Mirrors the immutable
// entries-array update the rename flow already does.
function persistGrownTree() {
  const entry = Lib.findEntry(state.entries, state.currentEntryId);
  if (!entry) return;
  const updated = { ...entry, pgnText: MoveTree.serializeGameTree(state.gameTree) };
  state.entries = state.entries.map((e) => (e.id === updated.id ? updated : e));
  putLibraryEntry(updated);
}

// ---- annotations --------------------------------------------------------

function republishAnnotations() {
  const { fen, lastMove, moveLabel } = currentDisplay();
  publishIfSynced(fen, lastMove, moveLabel);
}

teacherBoard.context.addEventListener("mouseup", () => {
  // Runs after RightClickAnnotator's own mouseup handler (registered first,
  // when the extension was added), so getAnnotations() already reflects the
  // just-finished drag/click.
  state.annotations = serializeBoardAnnotations(teacherBoard);
  republishAnnotations();
});

el.clearAnnotationsBtn.addEventListener("click", () => {
  state.annotations = { arrows: [], markers: [] };
  applyAnnotationsToBoard(teacherBoard, state.annotations);
  republishAnnotations();
});

el.keepAnnotationsCheckbox.addEventListener("change", (e) => {
  state.keepAnnotations = e.target.checked;
});

// ---- Lock PGN -------------------------------------------------------

el.lockPgnCheckbox.addEventListener("change", (e) => {
  state.lockPgn = e.target.checked;
  window.localStorage.setItem(LOCK_PGN_STORAGE_KEY, state.lockPgn ? "1" : "0");
});

// ---- overlays -------------------------------------------------------

function publishOverlays() {
  teacherSync.publishOverlays(state.overlays);
}

[
  [el.overlayMoveNumber, "moveNumber"],
  [el.overlayLastMove, "lastMove"],
  [el.overlayArrows, "arrows"],
].forEach(([input, key]) => {
  input.addEventListener("change", () => {
    state.overlays[key] = input.checked;
    publishOverlays();
    render(); // "arrows" overlay gates whether annotations are even sent
  });
});

// ---- Sync toggle --------------------------------------------------------

function setSync(on) {
  state.syncOn = on;
  el.syncToggle.classList.toggle("on", on);
  el.syncState.textContent = state.t(on ? "syncOn" : "syncOff");
  // No separate "push" action: render() always publishes when syncOn is
  // true, so flipping Sync back on and re-rendering immediately snaps the
  // projector to wherever the teacher currently is (tickets 0002/0004).
  render();
}

el.syncToggle.addEventListener("click", () => setSync(!state.syncOn));

// ---- library UI wiring ------------------------------------------------

el.librarySelect.addEventListener("change", (e) => loadEntry(e.target.value));

el.uploadBtn.addEventListener("click", () => el.uploadInput.click());
el.uploadInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (file) await handleUpload(file);
});

el.renameBtn.addEventListener("click", () => {
  const entry = Lib.findEntry(state.entries, state.currentEntryId);
  if (!entry) return;
  const newName = prompt(state.t("renamePrompt"), entry.name);
  if (newName === null) return;
  state.entries = Lib.renameEntry(state.entries, entry.id, newName);
  const renamed = Lib.findEntry(state.entries, entry.id);
  putLibraryEntry(renamed);
  refreshLibrarySelect();
  el.gameTitle.textContent = renamed.name;
});

el.deleteBtn.addEventListener("click", async () => {
  const entry = Lib.findEntry(state.entries, state.currentEntryId);
  if (!entry) return;
  if (!confirm(state.t("deleteConfirm").replace("{name}", entry.name))) return;
  await deleteLibraryEntry(entry.id);
  state.entries = Lib.removeEntry(state.entries, entry.id);
  state.currentEntryId = null;
  refreshLibrarySelect();
  if (state.entries.length > 0) {
    loadEntry(state.entries[0].id);
  } else {
    state.gameTree = null;
    state.cursor = null;
    el.gameTitle.textContent = "";
    el.varTree.innerHTML = "";
    render();
  }
});

el.pickerCancelBtn.addEventListener("click", closeGamePicker);

el.langSelect.addEventListener("change", (e) => setLanguage(e.target.value));

el.openProjectorBtn.addEventListener("click", () => {
  window.open("projector.html", "chess-classroom-projector");
});

document.addEventListener("keydown", (e) => {
  if (!state.cursor) return;
  if (document.activeElement && ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  if (e.key === "ArrowRight") {
    if (state.cursor.stepForward()) handlePositionChanged();
  } else if (e.key === "ArrowLeft") {
    state.cursor.stepBackward();
    handlePositionChanged();
  }
});

// ---- boot -----------------------------------------------------------

async function boot() {
  await loadDictionaries();
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  const lang = I18n.detectInitialLanguage(navigator.languages || [navigator.language], stored);
  setLanguage(lang);
  state.overlays = teacherSync.readOverlays();
  el.overlayMoveNumber.checked = state.overlays.moveNumber;
  el.overlayLastMove.checked = state.overlays.lastMove;
  el.overlayArrows.checked = state.overlays.arrows;
  // Default ON (preserves the pre-existing "board must match the loaded
  // PGN" behavior for anyone who never touches the checkbox) — but a
  // teacher's explicit choice is remembered across reloads, same as the
  // language and last-opened-library-entry preferences above.
  const storedLockPgn = window.localStorage.getItem(LOCK_PGN_STORAGE_KEY);
  state.lockPgn = storedLockPgn === null ? true : storedLockPgn === "1";
  el.lockPgnCheckbox.checked = state.lockPgn;
  await loadLibrary();
  render();
}

boot();
