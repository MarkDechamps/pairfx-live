#!/usr/bin/env node
// Copies chess.js's browser-loadable ESM dist, and cm-chessboard's piece-art sprite, out of
// node_modules (installed as devDependencies, see package.json + CLAUDE.md) into the committed
// vendor/ directory the app actually loads from at runtime. Re-run after bumping a version in
// package.json.
//
// This does NOT bundle or transform anything — it copies files verbatim. opening-tree stays
// zero-build-step; this script is a dev-time convenience, not a build step the app depends on.
// Mirrors chess-classroom/scripts/vendor-libs.mjs, trimmed to what this app actually needs:
// chess.js for board FEN generation (no move-tree/PGN-variation parsing), and only
// cm-chessboard's bundled piece-art SVG (no board-UI library — this board is read-only, no
// drag/annotation input, so none of cm-chessboard's JS is used, only its art). See
// wayfinder/map.md for why.

import { mkdirSync, rmSync, copyFileSync } from "node:fs";
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
  copyFileSync(join(nodeModules, "chess.js", "dist", "esm", "chess.js"), join(dest, "chess.js"));
  copyFileSync(join(nodeModules, "chess.js", "LICENSE"), join(dest, "LICENSE"));
  console.log("vendored chess.js -> vendor/chess-js/chess.js");
}

function vendorPieceSprite() {
  const dest = join(vendor, "chess-pieces");
  freshDir(dest);
  copyFileSync(
    join(nodeModules, "cm-chessboard", "assets", "pieces", "standard.svg"),
    join(dest, "standard.svg"),
  );
  copyFileSync(join(nodeModules, "cm-chessboard", "LICENSE"), join(dest, "LICENSE-cm-chessboard"));
  console.log("vendored cm-chessboard's piece sprite -> vendor/chess-pieces/standard.svg");
}

vendorChessJs();
vendorPieceSprite();
console.log("done.");
