// idbLibraryStore.js is a thin IndexedDB wrapper; fake-indexeddb (dev-only)
// stands in for the browser's IndexedDB so the real code runs under Node.
import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;
const { getAllLibraryEntries, putLibraryEntry, deleteLibraryEntry } = await import("./idbLibraryStore.js");

const entry = (id, name = id) => ({ id, name, pgnText: `[Event "${name}"]\n\n1. e4 *`, selectedGameIndex: 0, createdAt: 1 });

test("starts empty", async () => {
  assert.deepEqual(await getAllLibraryEntries(), []);
});

test("put then getAll returns the entries", async () => {
  await putLibraryEntry(entry("a"));
  await putLibraryEntry(entry("b"));
  const all = await getAllLibraryEntries();
  assert.deepEqual(all.map((e) => e.id).sort(), ["a", "b"]);
});

test("put with an existing id replaces the entry", async () => {
  await putLibraryEntry({ ...entry("a"), name: "Renamed", selectedGameIndex: 2 });
  const a = (await getAllLibraryEntries()).find((e) => e.id === "a");
  assert.equal(a.name, "Renamed");
  assert.equal(a.selectedGameIndex, 2);
  assert.equal((await getAllLibraryEntries()).length, 2);
});

test("delete removes only that entry, and deleting a missing id is harmless", async () => {
  await deleteLibraryEntry("a");
  assert.deepEqual((await getAllLibraryEntries()).map((e) => e.id), ["b"]);
  await deleteLibraryEntry("never-existed");
  assert.equal((await getAllLibraryEntries()).length, 1);
});

test("entries round-trip intact (structured clone)", async () => {
  const original = entry("c", "Ruy Lopez");
  await putLibraryEntry(original);
  const stored = (await getAllLibraryEntries()).find((e) => e.id === "c");
  assert.deepEqual(stored, original);
});
