import test from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGE_TYPE,
  POINTER_STORAGE_KEY,
  OVERLAYS_STORAGE_KEY,
  START_FEN,
  defaultOverlayPrefs,
  defaultPointer,
  buildPointer,
  readInitialState,
  createTeacherSync,
  createProjectorSync,
} from "./syncProtocol.js";

// ---- fakes: in-memory stand-ins, no browser needed ------------------------

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    _map: map,
  };
}

// Simulates BroadcastChannel's real semantics: same-origin "bus" shared by
// every channel opened on it, and the sender never receives its own message.
function fakeBroadcastBus() {
  const channels = new Set();
  return {
    open() {
      const listeners = new Set();
      const self = {
        postMessage(data) {
          for (const other of channels) {
            if (other !== self) {
              other._listeners.forEach((cb) => cb({ data }));
            }
          }
        },
        addEventListener(type, cb) {
          if (type === "message") listeners.add(cb);
        },
        _listeners: listeners,
      };
      channels.add(self);
      return self;
    },
  };
}

const A_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2";

// ---- defaults / shape -------------------------------------------------

test("defaultPointer starts at the start position with no annotations", () => {
  assert.deepEqual(defaultPointer(), {
    fen: START_FEN,
    moveLabel: null,
    lastMove: null,
    orientation: "white",
    gameTitle: null,
    arrows: [],
    markers: [],
  });
});

// The projector used to also show a "last move: e2-e4" text overlay, but it
// was redundant with the highlighted from/to squares already drawn on the
// board itself (that highlighting comes from the pointer's own `lastMove`
// field below, not from an overlay preference - it's not toggleable and
// never was). Removed per direct product feedback; only moveNumber/arrows
// remain as checkboxes.
//
// gameTitle (the PGN's own "White vs Black - Event" label, same text shown
// next to the move badge on the teacher tab) was added as a third overlay
// per direct product feedback, so the room can see which game is being
// demonstrated.
test("defaultOverlayPrefs starts with all three overlays on", () => {
  assert.deepEqual(defaultOverlayPrefs(), { moveNumber: true, gameTitle: true, arrows: true });
});

test("buildPointer is render-ready: a FEN plus display text, not a move path (projector needs no tree)", () => {
  assert.deepEqual(
    buildPointer({ fen: A_FEN, moveLabel: "1...e5", lastMove: { from: "e7", to: "e5" }, gameTitle: "Teacher vs Student" }),
    {
      fen: A_FEN,
      moveLabel: "1...e5",
      lastMove: { from: "e7", to: "e5" },
      orientation: "white",
      gameTitle: "Teacher vs Student",
      arrows: [],
      markers: [],
    }
  );
});

// ---- catch-up on startup (research 0001's gap) -------------------------

test("readInitialState falls back to defaults when nothing was ever stored", () => {
  const storage = fakeStorage();
  assert.deepEqual(readInitialState(storage), {
    pointer: defaultPointer(),
    overlays: defaultOverlayPrefs(),
  });
});

test("readInitialState reads whatever was last written, synchronously, before any broadcast", () => {
  const storage = fakeStorage();
  const pointer = buildPointer({ fen: A_FEN, moveLabel: "1...e5", orientation: "black" });
  storage.setItem(POINTER_STORAGE_KEY, JSON.stringify(pointer));
  storage.setItem(OVERLAYS_STORAGE_KEY, JSON.stringify({ moveNumber: false, arrows: false }));

  const state = readInitialState(storage);
  assert.deepEqual(state.pointer, pointer);
  assert.deepEqual(state.overlays, { moveNumber: false, arrows: false });
});

test("readInitialState tolerates corrupted JSON by falling back to defaults", () => {
  const storage = fakeStorage();
  storage.setItem(POINTER_STORAGE_KEY, "{not valid json");
  assert.deepEqual(readInitialState(storage).pointer, defaultPointer());
});

// ---- teacher -> projector, live (already-open tabs) --------------------

test("publishPosition writes localStorage and broadcasts to other open tabs", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });

  const received = [];
  const projectorChannel = bus.open();
  projectorChannel.addEventListener("message", (event) => received.push(event.data));

  const pointer = buildPointer({ fen: A_FEN, moveLabel: "1...e5" });
  teacher.publishPosition(pointer);

  assert.deepEqual(received, [{ type: MESSAGE_TYPE.POSITION, payload: pointer }]);
  assert.deepEqual(JSON.parse(storage.getItem(POINTER_STORAGE_KEY)), pointer);
});

test("the publishing tab never receives its own broadcast (BroadcastChannel semantics)", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const channel = bus.open();
  const receivedOnOwnChannel = [];
  channel.addEventListener("message", (event) => receivedOnOwnChannel.push(event.data));

  const teacher = createTeacherSync({ channel, storage });
  teacher.publishPosition(buildPointer({ fen: A_FEN }));

  assert.deepEqual(receivedOnOwnChannel, []);
});

test("publishOverlays writes/broadcasts independently of position", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });
  const received = [];
  const projectorChannel = bus.open();
  projectorChannel.addEventListener("message", (event) => received.push(event.data));

  teacher.publishOverlays({ moveNumber: false, arrows: true });

  assert.deepEqual(received, [{ type: MESSAGE_TYPE.OVERLAYS, payload: { moveNumber: false, arrows: true } }]);
});

test("createProjectorSync catches up from storage at construction time", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const pointer = buildPointer({ fen: A_FEN, moveLabel: "1...e5" });
  storage.setItem(POINTER_STORAGE_KEY, JSON.stringify(pointer));

  const initial = createProjectorSync({ channel: bus.open(), storage, onPosition() {}, onOverlays() {} });
  assert.deepEqual(initial.pointer, pointer);
});

test("createProjectorSync dispatches live position/overlay messages to the right callback", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });

  const positions = [];
  const overlays = [];
  createProjectorSync({
    channel: bus.open(),
    storage,
    onPosition: (p) => positions.push(p),
    onOverlays: (o) => overlays.push(o),
  });

  const pointer = buildPointer({ fen: A_FEN, moveLabel: "1...e5" });
  teacher.publishPosition(pointer);
  teacher.publishOverlays({ moveNumber: true, arrows: false });

  assert.deepEqual(positions, [pointer]);
  assert.deepEqual(overlays, [{ moveNumber: true, arrows: false }]);
});

test("ignores malformed messages without a type instead of throwing", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const channel = bus.open();
  const otherChannel = bus.open();
  let calls = 0;
  createProjectorSync({ channel, storage, onPosition: () => calls++, onOverlays: () => calls++ });

  otherChannel.postMessage({ garbage: true });
  otherChannel.postMessage(null);

  assert.equal(calls, 0);
});

// ---- Sync toggle-off/on-again resync (tickets 0002/0004) ----------------

test("toggling Sync back on and republishing the teacher's current position snaps a listening projector over", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });
  const positions = [];
  createProjectorSync({ channel: bus.open(), storage, onPosition: (p) => positions.push(p), onOverlays() {} });

  // Sync is "on": every navigation publishes.
  teacher.publishPosition(buildPointer({ fen: START_FEN, moveLabel: null }));
  teacher.publishPosition(buildPointer({ fen: A_FEN, moveLabel: "1...e5" }));

  // Sync flips "off" here (app.js simply stops calling publishPosition) — the
  // teacher keeps navigating locally, but nothing reaches storage/broadcast.
  // (Not modeled by a call here: the whole point is publishPosition is NOT
  // invoked while Sync is off.)

  // Sync flips back "on": app.js immediately republishes wherever the
  // teacher ended up, with no separate "push" action.
  const finalFen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
  teacher.publishPosition(buildPointer({ fen: finalFen, moveLabel: "2...Nc6" }));

  assert.deepEqual(
    positions.map((p) => p.fen),
    [START_FEN, A_FEN, finalFen]
  );
  assert.equal(JSON.parse(storage.getItem(POINTER_STORAGE_KEY)).fen, finalFen);
});

test("annotations travel inside the same pointer as the position (they follow the same sync rules as moves)", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });
  const positions = [];
  createProjectorSync({ channel: bus.open(), storage, onPosition: (p) => positions.push(p), onOverlays() {} });

  const withArrow = buildPointer({
    fen: A_FEN,
    moveLabel: "1...e5",
    arrows: [{ color: "success", from: "e2", to: "e4" }],
  });
  teacher.publishPosition(withArrow);

  assert.deepEqual(positions[0].arrows, [{ color: "success", from: "e2", to: "e4" }]);
});
