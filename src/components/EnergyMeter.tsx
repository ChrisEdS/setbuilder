"use client";

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n/react";

const TICKS = 10;

function knownLevel(level: number | undefined): number | undefined {
  if (level == null || !Number.isInteger(level) || level < 1 || level > TICKS) {
    return undefined;
  }
  return level;
}

/** 1–10 number plus ten amber ticks, matching openkey’s TrackRow meter. */
export function EnergyMeter({
  level,
  busy = false,
  name,
}: {
  level?: number;
  busy?: boolean;
  name?: string;
}) {
  const { t } = useI18n();
  const known = knownLevel(level);
  const label =
    known != null
      ? t("builder.energy.meterAria", { level: known, name: name ?? "" })
      : t("builder.energy.meterUnknown");
  return (
    <span
      className={busy ? "energy-meter is-busy" : "energy-meter"}
      aria-label={label}
      aria-busy={busy || undefined}
    >
      <strong className="energy-meter-value">{known ?? "—"}</strong>
      <span className="energy-meter-ticks" aria-hidden="true">
        {Array.from({ length: TICKS }, (_, index) => (
          <i key={index} className={known != null && index < known ? "on" : undefined} />
        ))}
      </span>
    </span>
  );
}

/** Determinate done/total bar used on playlist rows, set chrome, and the status banner. */
export function EnergyProgressBar({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label?: string;
}) {
  const safeTotal = Math.max(0, total);
  const clamped = Math.min(Math.max(0, done), safeTotal);
  const percent = safeTotal > 0 ? (clamped / safeTotal) * 100 : 0;
  return (
    <span
      className="energy-progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      style={{ "--energy-progress": `${percent}%` } as CSSProperties}
    >
      <span />
    </span>
  );
}
