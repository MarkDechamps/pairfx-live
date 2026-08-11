import test from "node:test";
import assert from "node:assert/strict";
import {
  LIBRARY_CAP,
  LibraryFullError,
  nameForGame,
  isLibraryFull,
  addEntry,
  removeEntry,
  renameEntry,
  findEntry,
  needsGamePicker,
  gamePickerChoices,
} from "./pgnLibrary.js";

test("nameForGame builds 'White vs Black — Event' when all three are meaningful", () => {
  assert.equal(
    nameForGame({ White: "Karpov", Black: "Kasparov", Event: "World Championship" }, "file.pgn"),
    "Karpov vs Kasparov — World Championship"
  );
});

test("nameForGame omits the event when it's missing", () => {
  assert.equal(nameForGame({ White: "Karpov", Black: "Kasparov" }, "file.pgn"), "Karpov vs Kasparov");
});

test("nameForGame falls back to the event alone when player names are placeholders", () => {
  assert.equal(nameForGame({ White: "?", Black: "?", Event: "Club Training" }, "file.pgn"), "Club Training");
});

test("nameForGame falls back to the filename when headers are entirely sparse", () => {
  assert.equal(nameForGame({}, "ruy-lopez.pgn"), "ruy-lopez.pgn");
  assert.equal(nameForGame({ White: "?", Black: "?", Event: "?" }, "ruy-lopez.pgn"), "ruy-lopez.pgn");
});

test("nameForGame treats 'Casual Game' as a non-meaningful event, like an unknown tag", () => {
  assert.equal(nameForGame({ White: "A", Black: "B", Event: "Casual Game" }, "file.pgn"), "A vs B");
});

test("isLibraryFull is false below the cap and true at/above it", () => {
  const entries = Array.from({ length: LIBRARY_CAP - 1 }, (_, i) => ({ id: String(i) }));
  assert.equal(isLibraryFull(entries), false);
  assert.equal(isLibraryFull([...entries, { id: "last" }]), true);
});

test("addEntry appends without mutating the original array", () => {
  const entries = [{ id: "a", name: "First" }];
  const result = addEntry(entries, { id: "b", name: "Second" });
  assert.deepEqual(result, [{ id: "a", name: "First" }, { id: "b", name: "Second" }]);
  assert.equal(entries.length, 1, "original array must not be mutated");
});

test("addEntry throws LibraryFullError at the cap instead of evicting the oldest entry", () => {
  const entries = Array.from({ length: LIBRARY_CAP }, (_, i) => ({ id: String(i) }));
  assert.throws(() => addEntry(entries, { id: "new" }), LibraryFullError);
  // still 50 — nothing was silently evicted or added
  assert.equal(entries.length, LIBRARY_CAP);
});

test("addEntry respects a custom cap (for testing without building 50 fixtures)", () => {
  const entries = [{ id: "a" }, { id: "b" }];
  assert.throws(() => addEntry(entries, { id: "c" }, 2), LibraryFullError);
  assert.equal(addEntry(entries, { id: "c" }, 3).length, 3);
});

test("removeEntry drops the matching id and leaves the rest untouched", () => {
  const entries = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(removeEntry(entries, "b"), [{ id: "a" }, { id: "c" }]);
});

test("renameEntry updates only the matching entry's name", () => {
  const entries = [{ id: "a", name: "Old" }, { id: "b", name: "Other" }];
  const result = renameEntry(entries, "a", "New Name");
  assert.equal(result[0].name, "New Name");
  assert.equal(result[1].name, "Other");
});

test("renameEntry ignores a blank/whitespace-only new name, keeping the old one", () => {
  const entries = [{ id: "a", name: "Old" }];
  assert.equal(renameEntry(entries, "a", "   ")[0].name, "Old");
});

test("findEntry returns the matching entry or null", () => {
  const entries = [{ id: "a", name: "A" }];
  assert.equal(findEntry(entries, "a").name, "A");
  assert.equal(findEntry(entries, "missing"), null);
});

test("needsGamePicker is false for a single-game file and true for multi-game files", () => {
  assert.equal(needsGamePicker([{ tags: {} }]), false);
  assert.equal(needsGamePicker([{ tags: {} }, { tags: {} }]), true);
});

test("gamePickerChoices labels each game and numbers unnamed ones by position", () => {
  const games = [
    { tags: { White: "A", Black: "B" } },
    { tags: {} },
  ];
  assert.deepEqual(gamePickerChoices(games, "multi.pgn"), [
    { index: 0, label: "A vs B" },
    { index: 1, label: "multi.pgn #2" },
  ]);
});
