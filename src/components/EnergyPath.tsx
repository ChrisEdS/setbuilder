"use client";

import type { CSSProperties } from "react";
import { Hint } from "@/components/Hint";
import {
  PHASE_ENERGY,
  PLAN_B_MIN,
  energyFitsPhase,
  energyStep,
  planBCount,
} from "@/lib/energy";
import { phaseLabel } from "@/lib/i18n/domain";
import { useI18n } from "@/lib/i18n/react";
import {
  PHASES,
  performanceTracks,
  type SetTrack,
} from "@/lib/set";

type Props = {
  tracks: SetTrack[];
};

export function EnergyPath({ tracks }: Props) {
  const { t } = useI18n();
  const performance = performanceTracks(tracks);
  const known = performance.filter((track) => track.energyLevel != null).length;
  let jumps = 0;
  let outside = 0;
  performance.forEach((track, index) => {
    if (
      index > 0 &&
      energyStep(performance[index - 1].energyLevel, track.energyLevel) === "jump"
    ) {
      jumps += 1;
    }
    if (energyFitsPhase(track.energyLevel, track.phase) === false) outside += 1;
  });

  return (
    <section className="energy-path" aria-label={t("analysis.energyPath.title")}>
      <div className="panel-head">
        <div>
          <h3>{t("analysis.energyPath.title")}</h3>
          <p className="section-note">{t("analysis.energyPath.note")}</p>
        </div>
      </div>

      <details className="explain-fold nested">
        <summary>
          <span>{t("analysis.energyPath.foldTitle")}</span>
          <em className="fold-toggle" />
        </summary>
        <div className="explain-body">
          <ul className="explain-steps">
            {([1, 2, 3, 4] as const).map((step) => (
              <li key={step}>
                <strong>{t(`analysis.energyPath.step${step}.title`)}</strong>
                <span>{t(`analysis.energyPath.step${step}.body`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <div className="harm-stats">
        <div>
          <strong>
            {known}/{performance.length}
          </strong>
          <Hint
            className="stat-label"
            text={t("analysis.energyPath.statKnownHint")}
            mark={known > 0}
          >
            {t("analysis.energyPath.statKnown")}
          </Hint>
        </div>
        <div>
          <strong>{jumps}</strong>
          <Hint
            className="stat-label"
            text={t("analysis.energyPath.statJumpsHint")}
            mark={known > 0}
          >
            {t("analysis.energyPath.statJumps")}
          </Hint>
        </div>
        <div>
          <strong>{outside}</strong>
          <Hint
            className="stat-label"
            text={t("analysis.energyPath.statOutsideHint")}
            mark={known > 0}
          >
            {t("analysis.energyPath.statOutside")}
          </Hint>
        </div>
      </div>

      {known === 0 ? (
        <p className="energy-hint">{t("analysis.energyPath.noLevels")}</p>
      ) : null}

      {known > 0 && performance.length > 0 ? (
        <div className="energy-phases">
          {PHASES.map((phase, phaseIndex) => {
            const group = performance.filter((track) => track.phase === phase.id);
            if (!group.length) return null;
            const band = PHASE_ENERGY[phase.id];
            const backup = planBCount(tracks, phase.id);
            return (
              <div
                key={phase.id}
                className="energy-phase"
                style={{ "--p": phaseIndex } as CSSProperties}
              >
                <div className="energy-phase-head">
                  <strong>{phaseLabel(t, phase.id)}</strong>
                  <span title={t("analysis.energyPath.targetHint")}>
                    {t("analysis.energyPath.target", { min: band.min, max: band.max })}
                  </span>
                  <em
                    className={backup < PLAN_B_MIN ? "thin" : undefined}
                    title={t("analysis.energyPath.planBHint")}
                  >
                    {backup < PLAN_B_MIN
                      ? t("analysis.energyPath.planBThin", {
                          count: backup,
                          min: PLAN_B_MIN,
                        })
                      : t("analysis.energyPath.planB", { count: backup })}
                  </em>
                </div>
                <div className="energy-bars-wrap">
                  <div
                    className="energy-band"
                    aria-hidden
                    style={{
                      bottom: `${22 + band.min * 8}px`,
                      height: `${(band.max - band.min) * 8}px`,
                    }}
                  >
                    <span>{t("analysis.energyPath.bandLabel")}</span>
                  </div>
                <ol
                  className="energy-bars"
                  style={
                    {
                      // 10px top padding + value line + two gaps + name line, plus the tallest bar.
                      "--bars-h": `${
                        56 +
                        Math.max(
                          band.max,
                          ...group.map((track) => track.energyLevel ?? 0),
                        ) *
                          8
                      }px`,
                    } as CSSProperties
                  }
                >
                  {group.map((track, barIndex) => {
                    const index = performance.indexOf(track);
                    const prev = index > 0 ? performance[index - 1] : null;
                    const jump = energyStep(prev?.energyLevel, track.energyLevel) === "jump";
                    const fit = energyFitsPhase(track.energyLevel, phase.id);
                    const level = track.energyLevel;
                    return (
                      <li
                        key={track.id}
                        style={{ "--i": barIndex } as CSSProperties}
                        title={
                          level != null
                            ? t("analysis.energyPath.trackEnergy", { name: track.name, level })
                            : t("analysis.energyPath.trackEnergyUnknown", { name: track.name })
                        }
                        className={[
                          level == null ? "unknown" : fit ? "fit" : "off",
                          jump ? "jump" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="energy-value">{level ?? "–"}</span>
                        <i
                          style={{ height: `${level != null ? level * 8 : 6}px` }}
                          aria-hidden
                        />
                        <span className="energy-name">{track.name}</span>
                      </li>
                    );
                  })}
                </ol>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
