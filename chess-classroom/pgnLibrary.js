// pgnLibrary.js — pure logic for the teacher's local PGN library: naming (of
// both a library entry and of one game inside it), the 50-entry cap, delete
// confirmation, and which game within a (possibly multi-game) entry is
// selected/shown. No DOM, no IndexedDB here — app.js owns the actual storage
// calls and hands this module plain arrays/objects. See
// wayfinder/tickets/0006-define-pgn-library-ux.md and CLAUDE.md's judgment
// call superseding that ticket's "picked game becomes the library entry"
// resolution — an entry now stores the whole uploaded file.

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

// Names a *library entry* (box 1's identity — "which uploaded PGN is this"),
// as opposed to nameForGame, which names one game inside it (box 2's
// per-item label). A single-game upload's entry is still named after that
// one game (unchanged from before this feature). A multi-game upload's
// entry is named after the uploaded filename instead: naming a whole file
// "White vs Black" from just one of the games it contains would misrepresent
// what's actually stored (see CLAUDE.md's judgment call superseding ticket
// 0006 — the entry now holds the whole file, not one picked-out game).
export function nameForEntry(parsedGames, fallbackFilename = "PGN") {
  if (parsedGames.length === 1) {
    return nameForGame(parsedGames[0].tags || {}, fallbackFilename);
  }
  return fallbackFilename;
}

// Whether box 2 (the persistent, always-visible "games in this file" list —
// see CLAUDE.md, superseding ticket 0006's one-time upload picker) should
// render at all. A single-game file hides it: a one-item list with nothing
// else to pick would just be noise for what's the common case (most
// uploads are one game).
export function showGameList(parsedGames) {
  return parsedGames.length > 1;
}

// Builds box 2's list of {index, label} choices from parsed games' tags, so
// app.js can render a plain list without re-deriving labels itself. Also
// used for the "current game" label shown next to the board, so that label
// and box 2's own entry read identically. (Formerly gamePickerChoices, for
// the one-time upload modal ticket 0006 described — same label logic, now
// serving a persistent list instead of a modal shown once.)
export function gameListChoices(parsedGames, fallbackFilename = "PGN") {
  return parsedGames.map((game, index) => ({
    index,
    label: nameForGame(game.tags || {}, `${fallbackFilename} #${index + 1}`),
  }));
}

// Keeps a requested/stored game index inside the bounds of what a multi-game
// entry's text actually reparses to — defensive against a stale or corrupted
// selectedGameIndex (e.g. the file was edited outside the app) rather than
// letting app.js index out of bounds and crash.
export function clampGameIndex(parsedGames, index) {
  const max = Math.max(parsedGames.length - 1, 0);
  const safe = Number.isInteger(index) ? index : 0;
  return Math.min(Math.max(safe, 0), max);
}
