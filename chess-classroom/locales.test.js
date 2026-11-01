// Guards against the three locale files drifting apart, and against a
// data-i18n / t("...") key in the app that no dictionary defines.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUPPORTED_LANGUAGES } from "./i18n.js";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const dictionaries = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lang) => [lang, JSON.parse(read(`./locales/${lang}.json`))])
);

test("every language defines exactly the same keys", () => {
  const all = new Set(SUPPORTED_LANGUAGES.flatMap((lang) => Object.keys(dictionaries[lang])));
  for (const lang of SUPPORTED_LANGUAGES) {
    const missing = [...all].filter((key) => !(key in dictionaries[lang]));
    assert.deepEqual(missing, [], `${lang}.json is missing keys`);
  }
});

test("no translation is empty", () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const [key, value] of Object.entries(dictionaries[lang])) {
      assert.ok(String(value).trim() !== "", `${lang}.${key} is empty`);
    }
  }
});

test("placeholders match across languages", () => {
  const placeholders = (text) => (String(text).match(/\{\w+\}/g) || []).sort().join(",");
  for (const key of Object.keys(dictionaries.nl)) {
    for (const lang of SUPPORTED_LANGUAGES) {
      assert.equal(
        placeholders(dictionaries[lang][key]),
        placeholders(dictionaries.nl[key]),
        `${lang}.${key} placeholders differ from nl`
      );
    }
  }
});

test("every key used in the HTML and JS exists in the dictionaries", () => {
  const used = new Set();
  for (const file of ["./index.html", "./projector.html"]) {
    for (const m of read(file).matchAll(/data-i18n(?:-title)?="(\w+)"/g)) used.add(m[1]);
  }
  for (const file of ["./app.js", "./projector.js"]) {
    for (const m of read(file).matchAll(/\bt\("(\w+)"/g)) used.add(m[1]);
  }
  const unknown = [...used].filter((key) => !(key in dictionaries.nl));
  assert.deepEqual(unknown, []);
});

test("no dictionary key is dead (unused anywhere in the app)", () => {
  const source = ["./index.html", "./projector.html", "./app.js", "./projector.js", "./engineAnalysis.js"]
    .map(read)
    .join("\n");
  const dead = Object.keys(dictionaries.nl).filter((key) => !source.includes(key));
  assert.deepEqual(dead, []);
});
