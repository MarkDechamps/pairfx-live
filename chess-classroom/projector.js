// projector.js — the projector tab. A pure renderer: it holds no state of
// its own beyond "whatever the teacher tab last told it" (ticket 0003). No
// PGN parsing, no move tree, no library, no drawing input — just paints a
// FEN plus display text/annotations it receives via syncProtocol.js.

import { Chessboard, COLOR } from "./vendor/cm-chessboard/src/Chessboard.js";
import { Markers } from "./vendor/cm-chessboard/src/extensions/markers/Markers.js";
import { Arrows } from "./vendor/cm-chessboard/src/extensions/arrows/Arrows.js";

import * as I18n from "./i18n.js";
import * as Sync from "./syncProtocol.js";

const ASSETS_URL = "vendor/cm-chessboard/assets/";
const LANG_STORAGE_KEY = "chess-classroom:lang"; // same key as app.js — one shared language preference

const LAST_MOVE_MARKER_TYPE = { class: "marker-last-move", slice: "markerSquare" };
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

const el = {
  board: document.getElementById("board"),
  ovMoveNumber: document.getElementById("ovMoveNumber"),
  ovGameTitle: document.getElementById("ovGameTitle"),
};

const board = new Chessboard(el.board, {
  position: Sync.START_FEN,
  assetsUrl: ASSETS_URL,
  style: { showCoordinates: false },
  extensions: [{ class: Markers }, { class: Arrows }],
});

let t = (key) => key;
let overlays = Sync.defaultOverlayPrefs();

function paintLastMove(lastMove) {
  board.removeMarkers(LAST_MOVE_MARKER_TYPE);
  if (lastMove) {
    board.addMarker(LAST_MOVE_MARKER_TYPE, lastMove.from);
    board.addMarker(LAST_MOVE_MARKER_TYPE, lastMove.to);
  }
}

function paintAnnotations(annotations) {
  // Only clear the annotation-colored marker types here, not every marker on
  // the board — the last-move highlight is also a marker (a different type)
  // and must survive this call regardless of call order.
  board.removeArrows();
  Object.values(MARKER_TYPE_BY_COLOR).forEach((type) => board.removeMarkers(type));
  if (!overlays.arrows) return;
  (annotations.arrows || []).forEach((a) => {
    const type = ARROW_TYPE_BY_COLOR[a.color] || ARROW_TYPE_BY_COLOR.success;
    board.addArrow(type, a.from, a.to);
  });
  (annotations.markers || []).forEach((m) => {
    const type = MARKER_TYPE_BY_COLOR[m.color] || MARKER_TYPE_BY_COLOR.success;
    board.addMarker(type, m.square);
  });
}

let lastPointer = Sync.defaultPointer();

function applyOrientation(orientation) {
  const color = orientation === "black" ? COLOR.black : COLOR.white;
  // setOrientation always enqueues a turn-board animation, even to the
  // color it's already at - skip the call entirely on every ordinary move
  // (which re-renders the whole pointer) so only an actual flip animates.
  if (board.getOrientation() !== color) {
    board.setOrientation(color);
  }
}

function renderPointer(pointer) {
  lastPointer = pointer;
  applyOrientation(pointer.orientation);
  board.setPosition(pointer.fen, true);
  // Always shown now, not gated by an overlay checkbox: the highlighted
  // from/to squares are the board's own visual language, not a separate
  // "last move" readout - the old text pill duplicating them as words
  // ("last move: e2-e4") was removed as redundant with this.
  paintLastMove(pointer.lastMove);
  paintAnnotations(pointer);

  el.ovMoveNumber.hidden = !overlays.moveNumber || !pointer.moveLabel;
  el.ovMoveNumber.textContent = pointer.moveLabel || "";

  el.ovGameTitle.hidden = !overlays.gameTitle || !pointer.gameTitle;
  el.ovGameTitle.textContent = pointer.gameTitle || "";
}

function renderOverlays(prefs) {
  overlays = prefs;
  renderPointer(lastPointer); // re-apply visibility/gating with the new prefs
}

async function loadLanguage() {
  const dictionaries = {};
  await Promise.all(
    I18n.SUPPORTED_LANGUAGES.map((lang) =>
      fetch(`locales/${lang}.json`)
        .then((r) => r.json())
        .then((dict) => (dictionaries[lang] = dict))
    )
  );
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  const lang = I18n.detectInitialLanguage(navigator.languages || [navigator.language], stored);
  t = I18n.createTranslator(dictionaries, lang);
  document.documentElement.lang = lang;
}

async function boot() {
  await loadLanguage();
  const initial = Sync.createProjectorSync({
    channel: new BroadcastChannel(Sync.CHANNEL_NAME),
    storage: window.localStorage,
    onPosition: renderPointer,
    onOverlays: renderOverlays,
  });
  overlays = initial.overlays;
  renderPointer(initial.pointer);
}

boot();
