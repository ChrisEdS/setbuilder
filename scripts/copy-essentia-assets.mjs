import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "essentia.js", "dist");
const out = join(root, "public", "essentia");

if (!existsSync(join(dist, "essentia-wasm.web.js"))) {
  console.warn("[essentia] package missing — skip copy");
  process.exit(0);
}

mkdirSync(out, { recursive: true });
for (const name of ["essentia-wasm.web.js", "essentia-wasm.web.wasm"]) {
  copyFileSync(join(dist, name), join(out, name));
}
console.log("[essentia] copied web WASM assets to public/essentia/");
