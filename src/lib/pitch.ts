/** Fader throw. -1 is fully slower, 0 is the center, 1 is fully faster. */
export type PitchRange = 10 | 25;

export const PITCH_STEP = 0.1;

export function clampPitchPosition(position: number): number {
  if (!Number.isFinite(position)) return 0;
  return Math.min(1, Math.max(-1, position));
}

/** Percent is the throw times the selected range. The throw itself does not change. */
export function pitchPercent(position: number, range: PitchRange): number {
  return clampPitchPosition(position) * range;
}

export function pitchRate(percent: number): number {
  return 1 + percent / 100;
}

export function playedBpm(fileBpm: number, percent: number): number | null {
  if (!Number.isFinite(fileBpm) || fileBpm <= 0) return null;
  return Math.round(fileBpm * pitchRate(percent) * 10) / 10;
}

export function formatPitchPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  const body = Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `-${body}`;
  return "0.0";
}

/** Move by a percent step and stay inside the selected range. */
export function nudgePitchPosition(position: number, range: PitchRange, deltaPercent: number): number {
  const current = Math.round(pitchPercent(position, range) * 10) / 10;
  const next = Math.min(range, Math.max(-range, Math.round((current + deltaPercent) * 10) / 10));
  return next / range;
}

export function positionForPercent(percent: number, range: PitchRange): number {
  if (!Number.isFinite(percent) || range <= 0) return 0;
  return clampPitchPosition(percent / range);
}

export function togglePitchRange(range: PitchRange): PitchRange {
  return range === 10 ? 25 : 10;
}
