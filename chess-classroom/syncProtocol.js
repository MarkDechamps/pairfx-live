// syncProtocol.js — the message shapes and catch-up logic for teacher/projector
// sync, kept independent of any real BroadcastChannel/localStorage/IndexedDB so
// it's unit-testable with fake in-memory stand-ins (node --test, no browser).
// See wayfinder/research/0001 (why BroadcastChannel + localStorage) and tickets
// 0003/0004 (catch-up protocol, overlay-preference persistence, annotation rules).
//
// Two independent pieces of durable state, each with its own localStorage key
// and its own broadcast message type:
// - POINTER: "what should the projector's board show right now" — fully
//   render-ready (a FEN, not a move path), so the projector never needs its
//   own copy of the move tree to make sense of a message. This keeps the
//   projector a genuine pure renderer (ticket 0003): it doesn't parse PGN,
//   doesn't walk variations, doesn't know what a "path" is — it just paints
//   whatever FEN/label/squares/annotations it was handed. Written every time
//   the teacher moves, jumps, or draws/erases an annotation while Sync is on.
// - OVERLAYS: the projector-overlay checkboxes' state. This is a display
//   *preference*, not a lesson position — it is written/broadcast regardless of
//   the Sync toggle (ticket 0003: "remembered", not gated by Sync).

export const CHANNEL_NAME = "chess-classroom-sync";
export const POINTER_STORAGE_KEY = "chess-classroom:pointer:v1";
export const OVERLAYS_STORAGE_KEY = "chess-classroom:overlays:v1";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const MESSAGE_TYPE = {
  POSITION: "position",
  OVERLAYS: "overlays",
};

export function defaultOverlayPrefs() {
  return { moveNumber: true, arrows: true };
}

export function defaultPointer() {
  return {
    fen: START_FEN,
    moveLabel: null,
    lastMove: null,
    orientation: "white",
    arrows: [],
    markers: [],
  };
}

// The one shape every "current position" message/localStorage record uses,
// so teacher and projector code (and tests) never drift on field names.
export function buildPointer({
  fen,
  moveLabel = null,
  lastMove = null,
  orientation = "white",
  arrows = [],
  markers = [],
}) {
  return { fen, moveLabel, lastMove, orientation, arrows, markers };
}

function readJson(storage, key) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

// What a late-joining or reloaded tab reads *before* any broadcast could
// possibly arrive (BroadcastChannel has no history/replay — research 0001).
export function readInitialState(storage) {
  return {
    pointer: readJson(storage, POINTER_STORAGE_KEY) || defaultPointer(),
    overlays: readJson(storage, OVERLAYS_STORAGE_KEY) || defaultOverlayPrefs(),
  };
}

// Teacher-tab side: the only side that ever writes. `channel` needs
// postMessage(); `storage` needs getItem/setItem (both satisfied by a real
// BroadcastChannel/localStorage, or a fake in tests).
export function createTeacherSync({ channel, storage }) {
  return {
    // Publishes the lesson position unconditionally. Callers gate this on the
    // Sync toggle themselves (app.js) — this module has no opinion on when to
    // call it, only on what gets written/sent when it's called. Toggling Sync
    // back on and immediately calling this once is exactly how "flipping Sync
    // on snaps the projector over" (tickets 0002/0004) is implemented.
    publishPosition(pointer) {
      writeJson(storage, POINTER_STORAGE_KEY, pointer);
      channel.postMessage({ type: MESSAGE_TYPE.POSITION, payload: pointer });
    },
    // Always published, regardless of Sync — overlay visibility isn't part of
    // "the lesson position" (ticket 0003).
    publishOverlays(prefs) {
      writeJson(storage, OVERLAYS_STORAGE_KEY, prefs);
      channel.postMessage({ type: MESSAGE_TYPE.OVERLAYS, payload: prefs });
    },
    readOverlays() {
      return readJson(storage, OVERLAYS_STORAGE_KEY) || defaultOverlayPrefs();
    },
    readPointer() {
      return readJson(storage, POINTER_STORAGE_KEY) || defaultPointer();
    },
  };
}

// Projector-tab side: a pure receiver with no state of its own beyond what it
// was last told. Reads localStorage synchronously once at startup to catch up
// (research 0001's gap, resolved here), then dispatches every subsequent
// BroadcastChannel message to the matching callback.
export function createProjectorSync({ channel, storage, onPosition, onOverlays }) {
  const initial = readInitialState(storage);
  channel.addEventListener("message", (event) => {
    const message = event && event.data;
    if (!message || typeof message.type !== "string") {
      return;
    }
    if (message.type === MESSAGE_TYPE.POSITION && typeof onPosition === "function") {
      onPosition(message.payload);
    } else if (message.type === MESSAGE_TYPE.OVERLAYS && typeof onOverlays === "function") {
      onOverlays(message.payload);
    }
  });
  return initial;
}
