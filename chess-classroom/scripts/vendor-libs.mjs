#!/usr/bin/env node
// Copies the browser-loadable files of our third-party libraries out of
// node_modules (installed as devDependencies, see package.json + CLAUDE.md
// for why) into the committed vendor/ directory that the app actually loads
// from at runtime. Re-run after bumping a version in package.json.
//
// This does NOT bundle or transform anything — it copies files verbatim.
// chess-classroom stays zero-build-step; this script is a dev-time
// convenience, not a build step the app depends on at runtime.

import { cpSync, mkdirSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nodeModules = join(root, "node_modules");
const vendor = join(root, "vendor");

function freshDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function vendorChessJs() {
  const dest = join(vendor, "chess-js");
  freshDir(dest);
  copyFileSync(
    join(nodeModules, "chess.js", "dist", "esm", "chess.js"),
    join(dest, "chess.js")
  );
  copyFileSync(
    join(nodeModules, "chess.js", "LICENSE"),
    join(dest, "LICENSE")
  );
  console.log("vendored chess.js -> vendor/chess-js/chess.js");
}

function vendorPgnParser() {
  const dest = join(vendor, "pgn-parser");
  freshDir(dest);
  copyFileSync(
    join(nodeModules, "@mliebelt", "pgn-parser", "lib", "index.umd.js"),
    join(dest, "pgn-parser.js")
  );
  copyFileSync(
    join(nodeModules, "@mliebelt", "pgn-parser", "LICENSE"),
    join(dest, "LICENSE")
  );
  console.log("vendored @mliebelt/pgn-parser -> vendor/pgn-parser/pgn-parser.js");
}

function vendorCmChessboard() {
  const dest = join(vendor, "cm-chessboard");
  freshDir(dest);
  cpSync(join(nodeModules, "cm-chessboard", "src"), join(dest, "src"), {
    recursive: true,
  });
  cpSync(join(nodeModules, "cm-chessboard", "assets"), join(dest, "assets"), {
    recursive: true,
    filter: (path) => !path.endsWith(".scss") && !path.endsWith(".sketch"),
  });
  if (existsSync(join(nodeModules, "cm-chessboard", "LICENSE"))) {
    copyFileSync(
      join(nodeModules, "cm-chessboard", "LICENSE"),
      join(dest, "LICENSE")
    );
  }
  console.log("vendored cm-chessboard -> vendor/cm-chessboard/{src,assets}");
}

vendorChessJs();
vendorPgnParser();
vendorCmChessboard();
console.log("done.");
