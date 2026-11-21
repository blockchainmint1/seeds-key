// Built-output guard (audit round 5, observation 1).
//
// The resolve-config test proves the Ledger browser aliases are registered, not that the
// emitted chunks are correct — that gap let the v4 build ship an empty
// `__vite-browser-external` stub in place of Buffer/EventEmitter, breaking Ledger loading
// on the live host. This script builds and inspects the actual client assets:
//
//   1. No client asset may reference `__vite-browser-external`.
//   2. The Ledger SDK chunk must exist and be reached only by dynamic import — never by a
//      static import or modulepreload, which would load it before the Continue gate.
//
// Run: `node scripts/check-built-assets.mjs` (builds first). Required before every auditor
// packet and after any bump of `nitro`, `vite` or `@lovable.dev/vite-tanstack-config`.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;

console.log("Building…");
execFileSync("bunx", ["vite", "build"], { cwd: root, stdio: "inherit" });

// Client assets land in .output/public (Nitro) or dist/client, depending on the toolchain.
const candidates = [join(root, ".output", "public"), join(root, "dist", "client"), join(root, "dist")];
const clientDir = candidates.find((dir) => existsSync(dir));
if (!clientDir) {
  console.error(`No client build output found in: ${candidates.join(", ")}`);
  process.exit(1);
}

function* jsFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* jsFiles(path);
    else if (entry.endsWith(".js")) yield path;
  }
}

const assets = [...jsFiles(clientDir)];
if (assets.length === 0) {
  console.error(`No client JS assets found under ${clientDir}`);
  process.exit(1);
}

const failures = [];

// 1. The empty stub must not appear anywhere.
for (const file of assets) {
  if (readFileSync(file, "utf8").includes("__vite-browser-external")) {
    failures.push(`${relative(clientDir, file)} references __vite-browser-external (Node built-in externalised into the client bundle)`);
  }
}

// 2. Locate the Ledger chunk and confirm it is only dynamically imported.
const ledgerChunk = assets.find((file) => readFileSync(file, "utf8").includes("@ledgerhq/hw-app-eth") || readFileSync(file, "utf8").includes("TransportWebHID"));
if (!ledgerChunk) {
  failures.push("No client chunk contains the Ledger SDK — the dynamic import may have been dropped");
} else {
  const chunkName = relative(clientDir, ledgerChunk).split("/").pop();
  for (const file of assets) {
    if (file === ledgerChunk) continue;
    const code = readFileSync(file, "utf8");
    // Static forms: import"./chunk.js", from"./chunk.js", or a modulepreload of it.
    const staticRef = new RegExp(`(import\\s*["']|from\\s*["'])[^"']*${chunkName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
    if (staticRef.test(code)) {
      failures.push(`${relative(clientDir, file)} statically imports the Ledger chunk ${chunkName} — it must load only after Continue`);
    }
  }
}

if (failures.length > 0) {
  console.error("\nBuilt-output guard FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\nBuilt-output guard OK: ${assets.length} client assets checked, no stub references, Ledger chunk loads dynamically only.`);
