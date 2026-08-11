// idbLibraryStore.js — thin IndexedDB wiring for the teacher's PGN library.
// Deliberately not unit-tested (per CLAUDE.md's architecture split): this is
// a handful of promisified IndexedDB calls, not logic — the naming/cap/
// rename/delete rules it stores data for live in pgnLibrary.js instead.
//
// Chosen over localStorage per wayfinder/research/0001: a school-year's
// worth of PGNs could exceed localStorage's ~5-10MB cap; IndexedDB has no
// such practical limit for this data's size.

const DB_NAME = "chess-classroom";
const DB_VERSION = 1;
const STORE_NAME = "pgnLibrary";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, work) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = work(store);
        tx.oncomplete = () => resolve(result && result.result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export function getAllLibraryEntries() {
  return runTransaction("readonly", (store) => store.getAll());
}

export function putLibraryEntry(entry) {
  return runTransaction("readwrite", (store) => store.put(entry));
}

export function deleteLibraryEntry(id) {
  return runTransaction("readwrite", (store) => store.delete(id));
}
