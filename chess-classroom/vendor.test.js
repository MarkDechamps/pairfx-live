// The app loads vendor/, but every other test imports node_modules, so a stale
// `npm run vendor` would pass them all and still ship old library code.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

// Line endings are normalized: a Windows checkout turns vendor/'s LF into CRLF.
const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const same = (vendored, original) =>
  assert.ok(text(vendored) === text(original), `${vendored} differs from ${original} — run npm run vendor`);

test("vendor/chess-js matches node_modules/chess.js", () => {
  same("./vendor/chess-js/chess.js", "./node_modules/chess.js/dist/esm/chess.js");
});

test("vendor/pgn-parser matches node_modules/@mliebelt/pgn-parser", () => {
  same("./vendor/pgn-parser/pgn-parser.js", "./node_modules/@mliebelt/pgn-parser/lib/index.umd.js");
});

test("the files the HTML loads exist in vendor/", () => {
  for (const page of ["./index.html", "./projector.html"]) {
    const html = readFileSync(new URL(page, import.meta.url), "utf8");
    for (const m of html.matchAll(/(?:src|href)="(vendor\/[^"?#]+)/g)) {
      assert.ok(existsSync(new URL(`./${m[1]}`, import.meta.url)), `${page} references missing ${m[1]}`);
    }
  }
});
