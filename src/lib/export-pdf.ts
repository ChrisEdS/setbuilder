import { mixJoin } from "@/lib/harmonic";
import { sourceLabel } from "@/lib/music-link";
import { trackFilePath } from "@/lib/export-booth";
import {
  ARC_GUIDE,
  PHASES,
  SLOT_KINDS,
  TRACK_ROLES,
  TRANSITIONS,
  phaseWindowLabel,
  formatDuration,
  performanceTracks,
  totalDurationMs,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
} from "@/lib/set";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function roleLabel(track: SetTrack): string {
  return TRACK_ROLES.find((role) => role.id === track.role)?.label ?? track.role;
}

function transitionLabel(track: SetTrack): string {
  if (track.transition === "unset") return "—";
  return (
    TRANSITIONS.find((item) => item.id === track.transition)?.label ??
    track.transition
  );
}

function phaseLabel(phase: SetPhaseId): string {
  return PHASES.find((item) => item.id === phase)?.label ?? phase;
}

function trackDetail(track: SetTrack): string {
  const comment = track.comment?.trim() || "";
  const note = track.note?.trim() || "";
  const path = trackFilePath(track);
  const album =
    track.album && track.album !== "Manual" ? track.album : "";
  const bits = [
    album ? `<div class="sub">${escapeHtml(album)}</div>` : "",
    track.why ? `<div class="note">Warum: ${escapeHtml(track.why)}</div>` : "",
    comment ? `<div class="note">${escapeHtml(comment)}</div>` : "",
    !comment && note && note !== path
      ? `<div class="note">${escapeHtml(note)}</div>`
      : "",
    track.safetyAlt
      ? `<div class="note">Ersatz-Notiz: ${escapeHtml(track.safetyAlt)}</div>`
      : "",
    track.durationMs
      ? ""
      : `<div class="note">Dauer offen, die Startzeit danach bleibt stehen.</div>`,
    track.externalUrl
      ? `<div class="link"><a href="${escapeHtml(track.externalUrl)}">${escapeHtml(sourceLabel(track.source))}</a> <span>${escapeHtml(track.externalUrl)}</span></div>`
      : `<div class="note">Kein Link</div>`,
    path ? `<div class="link">Datei <span>${escapeHtml(path)}</span></div>` : "",
  ];
  return bits.join("");
}

export function buildSetPrintHtml(draft: SetDraft): string {
  const main = performanceTracks(draft.tracks);
  const alternatives = draft.tracks.filter((track) => track.role === "safety");
  const filledMs = totalDurationMs(draft.tracks);
  const targetMs = draft.durationMinutes * 60_000;
  const over = filledMs > targetMs;
  const slotKind = SLOT_KINDS.find((slot) => slot.id === draft.slotKind);

  let clock = 0;
  let lastPhase: SetPhaseId | "" = "";
  const performanceBody = main
    .map((track, index) => {
      const previous = index > 0 ? main[index - 1] : null;
      const join = mixJoin(previous, track);
      const phaseChanged = track.phase !== lastPhase;
      lastPhase = track.phase;
      const guide = ARC_GUIDE.find((item) => item.phase === track.phase);
      const start = formatDuration(clock);
      clock += track.durationMs;
      const banner = phaseChanged
        ? `<tr class="phase-row">
            <td colspan="6">
              <strong>${escapeHtml(phaseLabel(track.phase))}</strong>
              <em>${escapeHtml(phaseWindowLabel(draft.durationMinutes, track.phase))}</em>
              ${guide ? `<span>${escapeHtml(guide.focus)}</span>` : ""}
            </td>
          </tr>`
        : "";
      const artists = track.artists.filter((name) => name && name !== "Unknown");
      return `${banner}<tr>
        <td class="num">${index + 1}</td>
        <td class="clock">${start}</td>
        <td class="track">
          <strong>${escapeHtml(track.name)}</strong>
          <div class="sub">${escapeHtml(artists.join(", ") || "—")}${
            track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ""
          } · ${escapeHtml(roleLabel(track))}</div>
          ${trackDetail(track)}
        </td>
        <td class="key">${escapeHtml(track.keyCamelot || "—")}</td>
        <td class="bpm">${escapeHtml(track.bpm || "—")}</td>
        <td class="mix">
          <div>${escapeHtml(join?.label || "—")}</div>
          <div class="sub">${escapeHtml(transitionLabel(track))}</div>
        </td>
      </tr>`;
    })
    .join("");

  const alternativeBody = alternatives
    .map((track, index) => {
      const artists = track.artists.filter((name) => name && name !== "Unknown");
      return `<tr>
        <td class="num">S${index + 1}</td>
        <td class="track" colspan="2">
          <strong>${escapeHtml(track.name)}</strong>
          <div class="sub">${escapeHtml(artists.join(", ") || "—")}${
            track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ""
          } · ${escapeHtml(phaseLabel(track.phase))}</div>
          ${trackDetail(track)}
        </td>
        <td class="key">${escapeHtml(track.keyCamelot || "—")}</td>
        <td class="bpm">${escapeHtml(track.bpm || "—")}</td>
        <td class="mix"><div class="sub">${escapeHtml(transitionLabel(track))}</div></td>
      </tr>`;
    })
    .join("");

  const performanceTable = main.length
    ? `<section>
        <h2>Performance</h2>
        <p class="lead">In dieser Reihenfolge spielen. „Start“ ist die Zeit ab Set-Beginn. „Von davor“ ist Key- und BPM-Abstand zum vorherigen Track.</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Start</th>
              <th>Track</th>
              <th>Key</th>
              <th>BPM</th>
              <th>Von davor</th>
            </tr>
          </thead>
          <tbody>${performanceBody}</tbody>
        </table>
      </section>`
    : "";

  const alternativeTable = alternatives.length
    ? `<section>
        <h2>Alternativen</h2>
        <p class="lead">Nicht in der Spielzeit. Plan B, wenn der Floor dreht. In der rekordbox-XML liegen sie als zweite Playlist.</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th colspan="2">Track</th>
              <th>Key</th>
              <th>BPM</th>
              <th>Übergang</th>
            </tr>
          </thead>
          <tbody>${alternativeBody}</tbody>
        </table>
      </section>`
    : "";

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(draft.title || "SETFORM")} — Ausdruck</title>
  <style>
    :root {
      --ink: #161616;
      --muted: #5e5e5e;
      --line: #d8d8d8;
      --band: #f3f3f3;
      --paper: #fff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: #ececec;
      font: 11.5px/1.4 "Avenir Next", "Segoe UI", sans-serif;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 12px 22px;
      background: #161616;
      color: #f5f5f5;
    }
    .toolbar p { margin: 0; font-size: 12px; color: #cfcfcf; }
    .toolbar div { display: flex; gap: 8px; }
    .toolbar button {
      border: 0;
      background: #fff;
      color: #161616;
      border-radius: 999px;
      padding: 8px 14px;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }
    .toolbar button.ghost {
      background: transparent;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.35);
    }
    .sheet {
      max-width: 920px;
      margin: 18px auto 32px;
      padding: 28px 32px 36px;
      background: var(--paper);
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
    }
    .brand {
      margin: 0 0 8px;
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
    }
    h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.03em;
      line-height: 1.05;
    }
    .vibe { margin: 6px 0 0; font-size: 14px; }
    .brief {
      margin: 16px 0 0;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px 16px;
      padding: 12px 0 0;
      border-top: 2px solid var(--ink);
    }
    .brief div span {
      display: block;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .brief div strong { font-size: 12.5px; font-weight: 650; }
    .summary {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 12px;
    }
    section { margin-top: 22px; }
    h2 {
      margin: 0 0 4px;
      font-size: 16px;
      letter-spacing: -0.02em;
    }
    .lead { margin: 0 0 8px; color: var(--muted); font-size: 11.5px; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 7px 6px;
      vertical-align: top;
      text-align: left;
    }
    th {
      font-size: 9px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 650;
    }
    td.num { width: 28px; color: var(--muted); }
    td.clock { width: 48px; font-variant-numeric: tabular-nums; }
    td.key, td.bpm { width: 42px; font-variant-numeric: tabular-nums; }
    td.mix { width: 132px; }
    .track strong { font-size: 12.5px; }
    .sub, .note, .link { margin-top: 2px; color: var(--muted); font-size: 10.5px; }
    .note { white-space: pre-wrap; }
    .link span, .link a { word-break: break-all; }
    a { color: inherit; }
    tr.phase-row td {
      background: var(--band);
      border-bottom-color: #cfcfcf;
      padding-top: 9px;
      padding-bottom: 8px;
    }
    tr.phase-row strong { font-size: 13px; }
    tr.phase-row em {
      margin-left: 8px;
      font-style: normal;
      color: var(--muted);
      font-size: 11px;
    }
    tr.phase-row span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 11px;
    }
    tr { break-inside: avoid; }
    .legend {
      margin-top: 22px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 10.5px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet { margin: 0; max-width: none; padding: 0; box-shadow: none; }
      a { text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <p>Ausdruck für die Kabine. Im Druckdialog „Als PDF speichern“ wählen.</p>
    <div>
      <button type="button" onclick="window.print()">Drucken / PDF</button>
      <button type="button" class="ghost" onclick="window.close()">Schließen</button>
    </div>
  </div>
  <main class="sheet">
    <p class="brand">SETFORM · Ausdruck</p>
    <h1>${escapeHtml(draft.title || "Ohne Titel")}</h1>
    <p class="vibe">${escapeHtml(draft.vibe || "")}</p>
    <div class="brief">
      <div><span>Slot</span><strong>${escapeHtml(slotKind?.label ?? draft.slotKind)}${draft.slot ? ` · ${escapeHtml(draft.slot)}` : ""}</strong></div>
      <div><span>Dauer</span><strong>${formatDuration(filledMs)} / ${draft.durationMinutes}:00${over ? " · über dem Brief" : ""}</strong></div>
      <div><span>Tracks</span><strong>${main.length} Performance · ${alternatives.length} Alternativen</strong></div>
      <div><span>Venue</span><strong>${escapeHtml(draft.venue || "—")}</strong></div>
      <div><span>Audience</span><strong>${escapeHtml(draft.audience || "—")}</strong></div>
      <div><span>Gear</span><strong>${escapeHtml(draft.gear || "—")}</strong></div>
    </div>
    <p class="summary">${escapeHtml(slotKind?.hint || "")}</p>
    ${performanceTable}
    ${alternativeTable}
    <div class="legend">
      <span>Key ist Camelot. Der Übergang steht unter „Von davor“. Alternativen zählen nicht in die Spielzeit.</span>
      <span>${new Date().toLocaleString("de-DE")}</span>
    </div>
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 300);
    });
  </script>
</body>
</html>`;
}

export function openSetPdfExport(draft: SetDraft): void {
  const popup = window.open("", "_blank");
  if (!popup) {
    throw new Error(
      "Popup blockiert — bitte Popups für SETFORM erlauben und erneut exportieren.",
    );
  }
  popup.document.open();
  popup.document.write(buildSetPrintHtml(draft));
  popup.document.close();
}
