import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  detectInitialLanguage,
  translate,
  createTranslator,
} from "./i18n.js";

test("DEFAULT_LANGUAGE is Dutch, per ticket 0007", () => {
  assert.equal(DEFAULT_LANGUAGE, "nl");
  assert.deepEqual(SUPPORTED_LANGUAGES, ["nl", "fr", "en"]);
});

test("isSupportedLanguage rejects unknown/undefined languages", () => {
  assert.equal(isSupportedLanguage("nl"), true);
  assert.equal(isSupportedLanguage("de"), false);
  assert.equal(isSupportedLanguage(undefined), false);
  assert.equal(isSupportedLanguage(""), false);
});

test("detectInitialLanguage prefers a stored language over browser locale", () => {
  assert.equal(detectInitialLanguage(["en-US", "en"], "fr"), "fr");
});

test("detectInitialLanguage falls back to the first supported browser locale when nothing is stored", () => {
  assert.equal(detectInitialLanguage(["de-DE", "fr-FR", "en-US"], null), "fr");
});

test("detectInitialLanguage falls back to Dutch when nothing stored and no browser locale matches", () => {
  assert.equal(detectInitialLanguage(["de-DE", "it-IT"], null), "nl");
  assert.equal(detectInitialLanguage([], undefined), "nl");
});

test("detectInitialLanguage ignores a stored value that isn't a supported language", () => {
  // e.g. a stale/corrupted localStorage value from a future language addition
  assert.equal(detectInitialLanguage(["fr-FR"], "de"), "fr");
});

const dictionaries = {
  nl: { greeting: "Hallo {name}", onlyNl: "alleen NL" },
  fr: { greeting: "Bonjour {name}" },
  en: { greeting: "Hello {name}" },
};

test("translate looks up the requested language", () => {
  assert.equal(translate(dictionaries, "fr", "greeting", { name: "Marie" }), "Bonjour Marie");
});

test("translate falls back to Dutch when the key is missing in the requested language", () => {
  assert.equal(translate(dictionaries, "en", "onlyNl"), "alleen NL");
});

test("translate falls back to the raw key when missing everywhere (visible, not blank)", () => {
  assert.equal(translate(dictionaries, "en", "totallyUnknownKey"), "totallyUnknownKey");
});

test("translate leaves an unmatched {placeholder} untouched rather than dropping it", () => {
  assert.equal(translate(dictionaries, "en", "greeting", {}), "Hello {name}");
});

test("translate works with no vars at all for templates without placeholders", () => {
  assert.equal(translate(dictionaries, "nl", "onlyNl"), "alleen NL");
});

test("createTranslator binds language + dictionaries into a short t() helper", () => {
  const t = createTranslator(dictionaries, "fr");
  assert.equal(t("greeting", { name: "Luc" }), "Bonjour Luc");
});
