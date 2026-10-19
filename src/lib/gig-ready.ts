import { hasKnownEnergy, PLAN_B_MIN, planBCount } from "@/lib/energy";
import { performanceTracks, PHASES, type SetPhaseId, type SetTrack } from "@/lib/set";
import type { StickHealthVerdict } from "@/lib/stick-health";

export type GigAction = "stick" | "booth" | "desk";

export type GigCheckId = "files" | "keys" | "energy" | "planB" | "player" | "heard";

export type GigPlanBPhase = {
  phase: SetPhaseId;
  have: number;
  need: number;
};

export type GigCheck = {
  id: GigCheckId;
  severity: "block" | "ack";
  count: number;
  phases?: GigPlanBPhase[];
  verdict?: StickHealthVerdict;
};

export type GigReadyInput = {
  tracks: Array<
    Pick<SetTrack, "role" | "phase" | "filePath" | "keyCamelot" | "energyLevel" | "energySource">
  >;
  action: GigAction;
  fileInSession: (filePath: string) => boolean;
  health?: { verdict: StickHealthVerdict } | null;
};

const PLAYER_BLOCK = new Set<StickHealthVerdict>(["broken", "empty", "needsRekordbox"]);
const PLAYER_ACK = new Set<StickHealthVerdict>(["hiddenFolder", "incomplete"]);

/** What still stands between this set and the gig, for one take-with-you action. */
export function assessGigReady(input: GigReadyInput): GigCheck[] {
  const main = performanceTracks(input.tracks as SetTrack[]);
  const stick = input.action === "stick";
  const checks: GigCheck[] = [];

  const missingFiles = main.filter((track) => {
    const path = track.filePath?.trim() ?? "";
    return !path || !input.fileInSession(path);
  }).length;
  if (missingFiles > 0) {
    checks.push({ id: "files", severity: stick ? "block" : "ack", count: missingFiles });
  }

  const missingKeys = main.filter((track) => !track.keyCamelot?.trim()).length;
  if (missingKeys > 0) checks.push({ id: "keys", severity: "ack", count: missingKeys });

  const missingEnergy = main.filter((track) => !hasKnownEnergy(track)).length;
  if (missingEnergy > 0) checks.push({ id: "energy", severity: "ack", count: missingEnergy });

  const thin = PHASES.map((phase) => ({
    phase: phase.id,
    have: planBCount(input.tracks, phase.id),
    need: PLAN_B_MIN,
  })).filter(
    (item) => main.some((track) => track.phase === item.phase) && item.have < item.need,
  );
  if (thin.length > 0) {
    checks.push({ id: "planB", severity: "ack", count: thin.length, phases: thin });
  }

  const verdict = input.health?.verdict;
  if (verdict && verdict !== "ready") {
    const blocks = PLAYER_BLOCK.has(verdict);
    if (blocks || PLAYER_ACK.has(verdict)) {
      checks.push({
        id: "player",
        severity: stick && blocks ? "block" : "ack",
        count: 1,
        verdict,
      });
    }
  }

  checks.push({ id: "heard", severity: "ack", count: 1 });
  return checks;
}

export function gigReadyBlocks(checks: GigCheck[]): boolean {
  return checks.some((item) => item.severity === "block");
}
