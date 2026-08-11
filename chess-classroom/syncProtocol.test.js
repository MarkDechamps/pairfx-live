import test from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGE_TYPE,
  POINTER_STORAGE_KEY,
  OVERLAYS_STORAGE_KEY,
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

// ---- defaults / shape -------------------------------------------------

test("defaultPointer starts at the start position with no annotations", () => {
  assert.deepEqual(defaultPointer(), {
    gameId: null,
    pathKey: "start",
    orientation: "white",
    arrows: [],
    markers: [],
  });
});

test("defaultOverlayPrefs starts with all three overlays on", () => {
  assert.deepEqual(defaultOverlayPrefs(), { moveNumber: true, lastMove: true, arrows: true });
});

test("buildPointer fills in empty arrows/markers when omitted", () => {
  assert.deepEqual(buildPointer({ gameId: "g1", pathKey: "3", orientation: "white" }), {
    gameId: "g1",
    pathKey: "3",
    orientation: "white",
    arrows: [],
    markers: [],
  });
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
  const pointer = buildPointer({ gameId: "g1", pathKey: "5.v0.0", orientation: "black" });
  storage.setItem(POINTER_STORAGE_KEY, JSON.stringify(pointer));
  storage.setItem(OVERLAYS_STORAGE_KEY, JSON.stringify({ moveNumber: false, lastMove: true, arrows: false }));

  const state = readInitialState(storage);
  assert.deepEqual(state.pointer, pointer);
  assert.deepEqual(state.overlays, { moveNumber: false, lastMove: true, arrows: false });
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

  const pointer = buildPointer({ gameId: "g1", pathKey: "0", orientation: "white" });
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
  teacher.publishPosition(buildPointer({ gameId: "g1", pathKey: "0", orientation: "white" }));

  assert.deepEqual(receivedOnOwnChannel, []);
});

test("publishOverlays writes/broadcasts independently of position", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });
  const received = [];
  const projectorChannel = bus.open();
  projectorChannel.addEventListener("message", (event) => received.push(event.data));

  teacher.publishOverlays({ moveNumber: false, lastMove: true, arrows: true });

  assert.deepEqual(received, [
    { type: MESSAGE_TYPE.OVERLAYS, payload: { moveNumber: false, lastMove: true, arrows: true } },
  ]);
});

test("createProjectorSync catches up from storage at construction time", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const pointer = buildPointer({ gameId: "g9", pathKey: "2", orientation: "white" });
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

  const pointer = buildPointer({ gameId: "g1", pathKey: "1", orientation: "white" });
  teacher.publishPosition(pointer);
  teacher.publishOverlays({ moveNumber: true, lastMove: false, arrows: true });

  assert.deepEqual(positions, [pointer]);
  assert.deepEqual(overlays, [{ moveNumber: true, lastMove: false, arrows: true }]);
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
  teacher.publishPosition(buildPointer({ gameId: "g1", pathKey: "0", orientation: "white" }));
  teacher.publishPosition(buildPointer({ gameId: "g1", pathKey: "1", orientation: "white" }));

  // Sync flips "off" here (app.js simply stops calling publishPosition) — the
  // teacher keeps navigating locally, but nothing reaches storage/broadcast.
  // (Not modeled by a call here: the whole point is publishPosition is NOT
  // invoked while Sync is off.)

  // Sync flips back "on": app.js immediately republishes wherever the
  // teacher ended up, with no separate "push" action.
  teacher.publishPosition(buildPointer({ gameId: "g1", pathKey: "7", orientation: "white" }));

  assert.deepEqual(
    positions.map((p) => p.pathKey),
    ["0", "1", "7"]
  );
  assert.equal(JSON.parse(storage.getItem(POINTER_STORAGE_KEY)).pathKey, "7");
});

test("annotations travel inside the same pointer as the position (they follow the same sync rules as moves)", () => {
  const bus = fakeBroadcastBus();
  const storage = fakeStorage();
  const teacher = createTeacherSync({ channel: bus.open(), storage });
  const positions = [];
  createProjectorSync({ channel: bus.open(), storage, onPosition: (p) => positions.push(p), onOverlays() {} });

  const withArrow = buildPointer({
    gameId: "g1",
    pathKey: "4",
    orientation: "white",
    arrows: [{ color: "success", from: "e2", to: "e4" }],
  });
  teacher.publishPosition(withArrow);

  assert.deepEqual(positions[0].arrows, [{ color: "success", from: "e2", to: "e4" }]);
});
