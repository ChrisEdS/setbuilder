// Module hooks for `node --test`: resolve the "@/" alias and extensionless imports.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "src");

function withExtension(path) {
  for (const candidate of [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return existsSync(path) && /\.tsx?$/.test(path) ? path : null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = withExtension(resolvePath(SRC, specifier.slice(2)));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && context.parentURL) {
      const file = withExtension(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
    throw error;
  }
}
