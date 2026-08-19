#!/usr/bin/env node
// Copies chess.js's browser-loadable ESM dist out of node_modules (installed as a
// devDependency, see package.json + CLAUDE.md) into the committed vendor/ directory the app
// actually loads from at runtime. Re-run after bumping the version in package.json.
//
// This does NOT bundle or transform anything — it copies files verbatim. opening-tree stays
// zero-build-step; this script is a dev-time convenience, not a build step the app depends on.
// Mirrors chess-classroom/scripts/vendor-libs.mjs, trimmed to the one library this app needs
// (board FEN generation only — no move-tree/PGN-variation parsing, no board-UI library; see
// wayfinder/map.md for why).

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

vendorChessJs();
console.log("done.");
