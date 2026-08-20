import test from "node:test";
import assert from "node:assert/strict";
import {
  createRepertoire,
  listRepertoires,
  getRepertoire,
  renameRepertoire,
  deleteRepertoire,
  saveRepertoireTree,
} from "./db.js";

// In-memory stand-in for the {get, getAll, put, delete} store interface every function above
// is written against — the real IndexedDB-backed implementation (openIndexedDbStore in db.js)
// is browser-API glue and isn't exercised here, same as opening-tree/client.js's injectable
// fetchImpl pattern for the network.
function createFakeStore() {
  const records = new Map();
  return {
    async get(id) {
      return records.get(id) ?? undefined;
    },
    async getAll() {
      return Array.from(records.values());
    },
    async put(record) {
      records.set(record.id, record);
    },
    async delete(id) {
      records.delete(id);
    },
  };
}

test("createRepertoire persists a new repertoire with a generated id, empty tree, and timestamps", async () => {
  const store = createFakeStore();
  const record = await createRepertoire(store, { name: "Main White", color: "white" });

  assert.ok(record.id);
  assert.equal(record.name, "Main White");
  assert.equal(record.color, "white");
  assert.deepEqual(record.tree, { children: {} });
  assert.equal(typeof record.createdAt, "string");
  assert.equal(record.updatedAt, record.createdAt);

  assert.deepEqual(await getRepertoire(store, record.id), record);
});

test("createRepertoire rejects a blank name", async () => {
  const store = createFakeStore();
  await assert.rejects(() => createRepertoire(store, { name: "  ", color: "white" }));
});

test("createRepertoire rejects an invalid color", async () => {
  const store = createFakeStore();
  await assert.rejects(() => createRepertoire(store, { name: "X", color: "purple" }));
});

test("createRepertoire rejects a duplicate name within the same color", async () => {
  const store = createFakeStore();
  await createRepertoire(store, { name: "Main", color: "white" });
  await assert.rejects(() => createRepertoire(store, { name: "Main", color: "white" }));
});

test("createRepertoire allows the same name across different colors", async () => {
  const store = createFakeStore();
  await createRepertoire(store, { name: "Main", color: "white" });
  const black = await createRepertoire(store, { name: "Main", color: "black" });
  assert.equal(black.name, "Main");
  assert.equal(black.color, "black");
});

test("listRepertoires returns every stored repertoire sorted by name", async () => {
  const store = createFakeStore();
  await createRepertoire(store, { name: "Zebra", color: "white" });
  await createRepertoire(store, { name: "Anti-Sicilian", color: "white" });

  const names = (await listRepertoires(store)).map((r) => r.name);
  assert.deepEqual(names, ["Anti-Sicilian", "Zebra"]);
});

test("getRepertoire returns null for an id that doesn't exist", async () => {
  const store = createFakeStore();
  assert.equal(await getRepertoire(store, "missing"), null);
});

test("renameRepertoire updates the name and touches updatedAt", async () => {
  const store = createFakeStore();
  const created = await createRepertoire(store, { name: "Old", color: "white" });

  const renamed = await renameRepertoire(store, created.id, "New");

  assert.equal(renamed.name, "New");
  assert.equal(typeof renamed.updatedAt, "string");
  assert.deepEqual(await getRepertoire(store, created.id), renamed);
});

test("renameRepertoire rejects an id that doesn't exist", async () => {
  const store = createFakeStore();
  await assert.rejects(() => renameRepertoire(store, "missing", "New"));
});

test("deleteRepertoire removes it from the store", async () => {
  const store = createFakeStore();
  const created = await createRepertoire(store, { name: "Gone", color: "white" });

  await deleteRepertoire(store, created.id);

  assert.equal(await getRepertoire(store, created.id), null);
});

test("saveRepertoireTree replaces the stored tree and touches updatedAt", async () => {
  const store = createFakeStore();
  const created = await createRepertoire(store, { name: "Main", color: "white" });
  const newTree = { children: { e4: { children: {} } } };

  const updated = await saveRepertoireTree(store, created.id, newTree);

  assert.deepEqual(updated.tree, newTree);
  assert.deepEqual((await getRepertoire(store, created.id)).tree, newTree);
});

test("saveRepertoireTree rejects an id that doesn't exist", async () => {
  const store = createFakeStore();
  await assert.rejects(() => saveRepertoireTree(store, "missing", { children: {} }));
});
