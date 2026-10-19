/** What the set-wide Energy menu is allowed to offer. */
export type EnergyMenuGate = "actions" | "stick" | "files";

/**
 * Without a stick, or without file paths, the menu must not list four
 * zero-count actions. The stick check wins when both are missing.
 */
export function energyMenuGate(input: {
  stickReady: boolean;
  fileCount: number;
}): EnergyMenuGate {
  if (!input.stickReady) return "stick";
  if (input.fileCount < 1) return "files";
  return "actions";
}
