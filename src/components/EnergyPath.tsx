"use client";

import type { CSSProperties } from "react";
import {
  PHASE_ENERGY,
  PLAN_B_MIN,
  energyFitsPhase,
  energyStep,
  planBCount,
} from "@/lib/energy";
import {
  PHASES,
  performanceTracks,
  type SetTrack,
} from "@/lib/set";

type Props = {
  tracks: SetTrack[];
};

export function EnergyPath({ tracks }: Props) {
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
    <section className="energy-path" aria-label="Energie-Verlauf">
      <div className="panel-head">
        <div>
          <h3>Energie-Verlauf</h3>
          <p className="section-note">
            Energy Level 1–10 pro Track gegen das Zielband der Phase. Energie
            entscheidet, wie der Raum sich anfühlt. Der Key sorgt nur dafür, dass
            es nicht schief klingt.
          </p>
        </div>
      </div>

      <div className="harm-stats">
        <div>
          <strong>
            {known}/{performance.length}
          </strong>
          <span>Tracks mit Energie</span>
        </div>
        <div>
          <strong>{jumps}</strong>
          <span>Sprünge ab 3 Stufen</span>
        </div>
        <div>
          <strong>{outside}</strong>
          <span>Außerhalb Phasenband</span>
        </div>
      </div>

      {known === 0 ? (
        <p className="energy-hint">
          Noch keine Energy Levels. Mixed In Key schreibt sie als Kommentar
          („7A - Energy 6“) in deine rekordbox-Tracks. In rekordbox die Tags neu
          laden („Reload Tags“), dann Stick oder Collection erneut laden. Du
          kannst die Energie auch in der Setliste pro Track von Hand setzen.
        </p>
      ) : null}

      {performance.length > 0 ? (
        <div className="energy-phases">
          {PHASES.map((phase) => {
            const group = performance.filter((track) => track.phase === phase.id);
            if (!group.length) return null;
            const band = PHASE_ENERGY[phase.id];
            const backup = planBCount(tracks, phase.id);
            return (
              <div key={phase.id} className="energy-phase">
                <div className="energy-phase-head">
                  <strong>{phase.label}</strong>
                  <span>Ziel {band.min}–{band.max}</span>
                  <em className={backup < PLAN_B_MIN ? "thin" : undefined}>
                    Plan B: {backup}
                    {backup < PLAN_B_MIN ? ` · mind. ${PLAN_B_MIN} empfohlen` : ""}
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
                    <span>Ziel</span>
                  </div>
                <ol
                  className="energy-bars"
                  style={
                    {
                      "--bars-h": `${
                        44 +
                        Math.max(
                          band.max,
                          ...group.map((track) => track.energyLevel ?? 0),
                        ) *
                          8
                      }px`,
                    } as CSSProperties
                  }
                >
                  {group.map((track) => {
                    const index = performance.indexOf(track);
                    const prev = index > 0 ? performance[index - 1] : null;
                    const jump = energyStep(prev?.energyLevel, track.energyLevel) === "jump";
                    const fit = energyFitsPhase(track.energyLevel, phase.id);
                    const level = track.energyLevel;
                    return (
                      <li
                        key={track.id}
                        title={`${track.name}${level != null ? ` · Energy ${level}` : " · Energy offen"}`}
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

      <details className="explain-fold nested">
        <summary>
          <span>Energie, Key und BPM: was zählt wann</span>
          <em className="fold-toggle" />
        </summary>
        <div className="explain-body">
          <ul className="explain-steps">
            <li>
              <strong>1. Energie zuerst</strong>
              <span>
                Gleiche Stufe oder ±1 ist weich. Ein Sprung von 5 auf 7 wirkt
                abrupt, 9 auf 5 verliert die Tanzfläche, außer als bewusster
                Reset. Ein Set ist eine Welle: aufwärmen bei 3–5, stufenweise auf
                7–8, Peak 8–10, dann 2–3 Stufen runter und neu aufbauen.
              </span>
            </li>
            <li>
              <strong>2. Dann der Key</strong>
              <span>
                Sicher sind gleicher Key, ±1 Zahl und A↔B auf derselben Zahl.
                Energy Boost ist +2 mit gleichem Buchstaben, sparsam einsetzen.
                Alles andere geht nur mit kurzem Übergang, Break oder EQ.
              </span>
            </li>
            <li>
              <strong>3. Dann BPM</strong>
              <span>
                Kleine Schritte gleicht der Pitch aus. Größere Sprünge brauchen
                einen Break oder Reset. Phrasen sauber auf 16 oder 32 Takte
                legen.
              </span>
            </li>
            <li>
              <strong>Hören schlägt Analyse</strong>
              <span>
                Mixed In Key liegt beim Key bei etwa 89 %. Klingt ein Übergang
                falsch, den relativen Dur- oder Moll-Key probieren. Kritische
                Übergänge vorher testen und pro Richtung zwei Ausweichtracks
                bereithalten.
              </span>
            </li>
          </ul>
        </div>
      </details>
    </section>
  );
}
