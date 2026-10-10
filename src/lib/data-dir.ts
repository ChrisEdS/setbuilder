import path from "path";

/** Tokens and OAuth state. The Mac app points this at Application Support. */
export function dataDir(): string {
  const fromEnv = process.env.SETFORM_DATA_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), ".data");
}

export function dataPath(name: string): string {
  return path.join(/*turbopackIgnore: true*/ dataDir(), name);
}
