// Storage layer: persists named, per-color Repertoires (see CONTEXT.md) in the browser's
// IndexedDB. Every CRUD function below is written against a small injectable `store` interface
// — {get(id), getAll(), put(record), delete(id)}, all async — rather than talking to IndexedDB
// directly, so db.test.js can exercise every rule (validation, uniqueness, "touch updatedAt")
// with an in-memory fake and no real browser, the same shape as opening-tree/client.js's
// injectable `fetchImpl` for the network. `openIndexedDbStore` below is the one real adapter —
// browser-API glue, untested here, matching opening-tree/app.js's own DOM-glue convention.
//
// One object store, one record shape per Repertoire: {id, name, color, tree, createdAt,
// updatedAt}. `tree` is whatever engine.js's buildRepertoireTree (ticket 0001) produced, plus —
// once ticket 0003 lands — Card state embedded on its nodes; db.js treats it as opaque.

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Every stored repertoire, sorted by name. */
export async function listRepertoires(store) {
  const all = await store.getAll();
  return all.slice().sort((a, b) => a.name.localeCompare(b.name));
}

/** One repertoire by id, or null if it doesn't exist. */
export async function getRepertoire(store, id) {
  const record = await store.get(id);
  return record ?? null;
}

/**
 * Creates a new, empty repertoire. Rejects a blank name, a color other than "white"/"black",
 * or a name already used by another repertoire of the *same* color — names only need to be
 * unique within a color, so a White and a Black repertoire can both be called "Main".
 */
export async function createRepertoire(store, { name, color }) {
  if (!name || !name.trim()) throw new Error("A repertoire needs a name.");
  if (color !== "white" && color !== "black") throw new Error(`Invalid color: "${color}".`);

  const existing = await store.getAll();
  if (existing.some((r) => r.color === color && r.name === name)) {
    throw new Error(`A ${color} repertoire named "${name}" already exists.`);
  }

  const timestamp = nowIso();
  const record = {
    id: generateId(),
    name,
    color,
    tree: { children: {} },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await store.put(record);
  return record;
}

/** Renames a repertoire in place. Rejects a blank name or an id that doesn't exist. */
export async function renameRepertoire(store, id, name) {
  if (!name || !name.trim()) throw new Error("A repertoire needs a name.");
  const record = await getRepertoire(store, id);
  if (!record) throw new Error(`No repertoire with id "${id}".`);

  const updated = { ...record, name, updatedAt: nowIso() };
  await store.put(updated);
  return updated;
}

/** Deletes a repertoire. A no-op if the id doesn't exist. */
export async function deleteRepertoire(store, id) {
  await store.delete(id);
}

/** Replaces a repertoire's stored tree (after a new PGN upload, or a card-state update). */
export async function saveRepertoireTree(store, id, tree) {
  const record = await getRepertoire(store, id);
  if (!record) throw new Error(`No repertoire with id "${id}".`);

  const updated = { ...record, tree, updatedAt: nowIso() };
  await store.put(updated);
  return updated;
}

const DB_NAME = "opening-trainer";
const STORE_NAME = "repertoires";
const DB_VERSION = 1;

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Opens (creating on first run) this app's IndexedDB database and returns a store object
 * conforming to the {get, getAll, put, delete} interface every function above is written
 * against. Real browser-API glue, so it's exercised by hand in the running app, not by
 * db.test.js.
 */
export function openIndexedDbStore(indexedDBImpl = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDBImpl.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = () => {
      openRequest.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };

    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const objectStore = (mode) => database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);

      resolve({
        get: (id) => promisifyRequest(objectStore("readonly").get(id)),
        getAll: () => promisifyRequest(objectStore("readonly").getAll()),
        put: (record) => promisifyRequest(objectStore("readwrite").put(record)),
        delete: (id) => promisifyRequest(objectStore("readwrite").delete(id)),
      });
    };

    openRequest.onerror = () => reject(openRequest.error);
  });
}
