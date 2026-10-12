import { relationLabel } from "@/lib/harmonic";
import { sourceLabel } from "@/lib/music-link";
import {
  ARC_GUIDE,
  phaseWindowLabel,
  PHASES,
  formatDuration,
  performanceTracks,
  setPositionById,
  totalDurationMs,
  type SetDraft,
  type SetTrack,
} from "@/lib/set";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function trackNotes(track: SetTrack): string {
  const comment = track.comment?.trim() || track.note?.trim() || "";
  const bits = [
    track.why ? `<div class="why">${escapeHtml(track.why)}</div>` : "",
    comment ? `<div class="cue">${escapeHtml(comment)}</div>` : "",
    track.safetyAlt
      ? `<div class="cue">Safety: ${escapeHtml(track.safetyAlt)}</div>`
      : "",
    track.externalUrl
      ? `<div class="link">${escapeHtml(sourceLabel(track.source))} · ${escapeHtml(track.externalUrl)}</div>`
      : "",
  ];
  return bits.join("");
}

export function buildSetPrintHtml(draft: SetDraft): string {
  const main = performanceTracks(draft.tracks);
  const safeties = draft.tracks.filter((track) => track.role === "safety");
  const filled = formatDuration(totalDurationMs(draft.tracks));
  const positions = setPositionById(draft.tracks);

  const orderRows = draft.tracks
    .map((track) => {
      return `<tr>
        <td class="num">${escapeHtml(positions.get(track.id) ?? "—")}</td>
        <td>
          <strong>${escapeHtml(track.name)}</strong><br/>
          <span class="muted">${escapeHtml(track.artists.join(", ") || "—")}</span>
          ${trackNotes(track)}
        </td>
        <td>${escapeHtml(PHASES.find((phase) => phase.id === track.phase)?.label ?? track.phase)}</td>
        <td>${escapeHtml(track.role)}</td>
        <td>${escapeHtml(sourceLabel(track.source))}</td>
        <td>${escapeHtml(track.keyCamelot || "—")}</td>
        <td>${escapeHtml(track.bpm || "—")}</td>
        <td>${track.durationMs ? formatDuration(track.durationMs) : "—"}</td>
      </tr>`;
    })
    .join("");

  const orderBlock = draft.tracks.length
    ? `<section class="phase">
        <h2>Set-Reihenfolge</h2>
        <p class="focus">Manuelle Reihenfolge inkl. Comments und Quell-Links.</p>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Track</th><th>Phase</th><th>Rolle</th><th>Quelle</th><th>Key</th><th>BPM</th><th>Dauer</th>
            </tr>
          </thead>
          <tbody>${orderRows}</tbody>
        </table>
      </section>`
    : "";

  const phaseBlocks = PHASES.map((phase) => {
    const tracks = main.filter((track) => track.phase === phase.id);
    if (!tracks.length) return "";
    const guide = ARC_GUIDE.find((item) => item.phase === phase.id);
    const rows = tracks
      .map((track, index) => {
        const harm =
          track.harmonicFromPrev && track.harmonicFromPrev !== "unknown"
            ? relationLabel(track.harmonicFromPrev)
            : "—";
        return `<tr>
          <td class="num">${index + 1}</td>
          <td>
            <strong>${escapeHtml(track.name)}</strong><br/>
            <span class="muted">${escapeHtml(track.artists.join(", "))}</span>
            ${trackNotes(track)}
          </td>
          <td>${escapeHtml(track.role)}</td>
          <td>${escapeHtml(track.keyCamelot || "—")}</td>
          <td>${escapeHtml(track.bpm || "—")}</td>
          <td>${formatDuration(track.durationMs)}</td>
          <td>${escapeHtml(track.transition === "unset" ? "—" : track.transition)}</td>
          <td>${escapeHtml(harm)}</td>
        </tr>`;
      })
      .join("");

    return `<section class="phase">
      <h2>${escapeHtml(phase.label)} <span>${escapeHtml(phaseWindowLabel(draft.durationMinutes, phase.id))}</span></h2>
      ${guide ? `<p class="focus">${escapeHtml(guide.focus)}</p>` : ""}
      <table>
        <thead>
          <tr>
            <th>#</th><th>Track</th><th>Role</th><th>Key</th><th>BPM</th><th>Dur</th><th>Transition</th><th>Harmonic</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).join("");

  const safetyBlock = safeties.length
    ? `<section class="phase">
        <h2>Safety nets</h2>
        <ol class="safety">
          ${safeties
            .map(
              (track) =>
                `<li><strong>${escapeHtml(track.name)}</strong> — ${escapeHtml(track.artists.join(", "))} <span class="muted">(${formatDuration(track.durationMs)})</span></li>`,
            )
            .join("")}
        </ol>
      </section>`
    : "";

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(draft.title)} — SETFORM</title>
  <style>
    :root {
      --ink: #14201c;
      --muted: #5a6862;
      --line: #d5ddd7;
      --paper: #f7faf7;
      --accent: #c8f06c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: white;
      font: 12.5px/1.45 "IBM Plex Sans", "Segoe UI", sans-serif;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      padding: 28px 32px 48px;
    }
    .brand {
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 8px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .meta {
      margin-top: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 18px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      background: var(--paper);
    }
    .meta div span {
      display: block;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .meta div strong {
      font-size: 13px;
      font-weight: 600;
    }
    .phase { margin-top: 22px; break-inside: avoid; }
    .phase h2 {
      margin: 0 0 6px;
      font-size: 16px;
      letter-spacing: -0.02em;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 4px;
    }
    .phase h2 span {
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
    }
    .focus {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 7px 6px;
      vertical-align: top;
      text-align: left;
    }
    th {
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 600;
    }
    td.num { width: 24px; color: var(--muted); }
    .muted { color: var(--muted); }
    .why, .cue, .link { margin-top: 3px; font-size: 11px; color: var(--muted); word-break: break-all; }
    .safety { margin: 8px 0 0; padding-left: 18px; }
    .footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .toolbar {
      position: sticky;
      top: 0;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 10px 32px;
      background: rgba(255,255,255,0.92);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(8px);
    }
    .toolbar button {
      border: 1px solid var(--ink);
      background: var(--ink);
      color: #f4faf4;
      padding: 8px 12px;
      cursor: pointer;
      font: inherit;
    }
    .toolbar button.ghost {
      background: white;
      color: var(--ink);
    }
    @media print {
      .toolbar { display: none !important; }
      .sheet { padding: 0; max-width: none; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Als PDF speichern…</button>
    <button type="button" class="ghost" onclick="window.close()">Schließen</button>
  </div>
  <main class="sheet">
    <p class="brand">SETFORM</p>
    <h1>${escapeHtml(draft.title)}</h1>
    <div class="meta">
      <div><span>Vibe</span><strong>${escapeHtml(draft.vibe)}</strong></div>
      <div><span>Dauer</span><strong>${filled} / ${draft.durationMinutes}:00 · ${main.length} Tracks</strong></div>
      <div><span>Venue</span><strong>${escapeHtml(draft.venue)}</strong></div>
      <div><span>Slot</span><strong>${escapeHtml(draft.slot)}${draft.slotKind ? ` · ${escapeHtml(draft.slotKind)}` : ""}</strong></div>
      <div><span>Audience</span><strong>${escapeHtml(draft.audience)}</strong></div>
      <div><span>Gear</span><strong>${escapeHtml(draft.gear)}</strong></div>
    </div>
    ${orderBlock}
    ${phaseBlocks}
    ${safetyBlock}
    <div class="footer">
      <span>Exportiert mit SETFORM · Harmonic Arc Prep</span>
      <span>${new Date().toLocaleString("de-DE")}</span>
    </div>
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;
}

export function openSetPdfExport(draft: SetDraft): void {
  const html = buildSetPrintHtml(draft);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=960,height=900");
  if (!popup) {
    throw new Error(
      "Popup blockiert — bitte Popups für SETFORM erlauben und erneut exportieren.",
    );
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
