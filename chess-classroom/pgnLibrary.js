// pgnLibrary.js — pure logic for the teacher's local PGN library: naming,
// the 50-entry cap, delete confirmation, and the multi-game upload picker.
// No DOM, no IndexedDB here — app.js owns the actual storage calls and hands
// this module plain arrays/objects. See wayfinder/tickets/0006-define-pgn-library-ux.md.

export const LIBRARY_CAP = 50;

export class LibraryFullError extends Error {
  constructor(cap) {
    super(`Library is full (${cap} entries) — delete an entry before adding another.`);
    this.name = "LibraryFullError";
    this.cap = cap;
  }
}

// Auto-names a library entry from PGN header tags, falling back to the
// uploaded filename when headers are missing/placeholder values (chess.js
// and most PGN sources use "?" for an unknown tag).
export function nameForGame(tags = {}, fallbackFilename = "PGN") {
  const white = meaningfulTag(tags.White);
  const black = meaningfulTag(tags.Black);
  const event = meaningfulTag(tags.Event);

  if (white && black) {
    return event ? `${white} vs ${black} — ${event}` : `${white} vs ${black}`;
  }
  if (event) {
    return event;
  }
  return fallbackFilename;
}

function meaningfulTag(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed === "?" || trimmed.toLowerCase() === "casual game") {
    return null;
  }
  return trimmed;
}

export function isLibraryFull(entries, cap = LIBRARY_CAP) {
  return entries.length >= cap;
}

// Returns a new array with `entry` appended. Throws LibraryFullError instead
// of silently evicting the oldest entry — the cap requires the teacher to
// delete something first (ticket 0006's explicit "no silent eviction" call).
export function addEntry(entries, entry, cap = LIBRARY_CAP) {
  if (isLibraryFull(entries, cap)) {
    throw new LibraryFullError(cap);
  }
  return [...entries, entry];
}

export function removeEntry(entries, id) {
  return entries.filter((entry) => entry.id !== id);
}

export function renameEntry(entries, id, newName) {
  const trimmed = String(newName || "").trim();
  return entries.map((entry) => (entry.id === id ? { ...entry, name: trimmed || entry.name } : entry));
}

export function findEntry(entries, id) {
  return entries.find((entry) => entry.id === id) || null;
}

// A multi-game upload shows the per-game picker once, at upload time
// (ticket 0006) — single-game files skip the picker entirely.
export function needsGamePicker(parsedGames) {
  return parsedGames.length > 1;
}

// Builds the picker's list of {index, label} choices from parsed games'
// tags, so app.js can render a plain list without re-deriving labels itself.
export function gamePickerChoices(parsedGames, fallbackFilename = "PGN") {
  return parsedGames.map((game, index) => ({
    index,
    label: nameForGame(game.tags || {}, `${fallbackFilename} #${index + 1}`),
  }));
}
