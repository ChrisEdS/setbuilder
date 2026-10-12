import { mixJoin } from "@/lib/harmonic";
import { sourceLabel } from "@/lib/music-link";
import { trackFilePath } from "@/lib/export-booth";
import { tDe, type Translate } from "@/lib/i18n/core";
import {
  phaseLabel as domainPhaseLabel,
  roleLabel as domainRoleLabel,
  slotHint,
  slotLabel,
  transitionLabel as domainTransitionLabel,
} from "@/lib/i18n/domain";
import { LocalizedError } from "@/lib/i18n/error";
import {
  arcGuideFor,
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

function roleLabel(track: SetTrack, t: Translate): string {
  return TRACK_ROLES.some((role) => role.id === track.role)
    ? domainRoleLabel(t, track.role)
    : track.role;
}

function transitionLabel(track: SetTrack, t: Translate): string {
  if (track.transition === "unset") return "—";
  return TRANSITIONS.some((item) => item.id === track.transition)
    ? domainTransitionLabel(t, track.transition)
    : track.transition;
}

function phaseLabel(phase: SetPhaseId, t: Translate): string {
  return PHASES.some((item) => item.id === phase) ? domainPhaseLabel(t, phase) : phase;
}

function trackDetail(track: SetTrack, t: Translate): string {
  const comment = track.comment?.trim() || "";
  const note = track.note?.trim() || "";
  const path = trackFilePath(track);
  const album =
    track.album && track.album !== "Manual" ? track.album : "";
  const bits = [
    album ? `<div class="sub">${escapeHtml(album)}</div>` : "",
    track.why ? `<div class="note">${escapeHtml(t("exports.pdf.why", { text: track.why }))}</div>` : "",
    comment ? `<div class="note">${escapeHtml(comment)}</div>` : "",
    !comment && note && note !== path
      ? `<div class="note">${escapeHtml(note)}</div>`
      : "",
    track.safetyAlt
      ? `<div class="note">${escapeHtml(t("exports.pdf.backupNote", { text: track.safetyAlt }))}</div>`
      : "",
    track.durationMs
      ? ""
      : `<div class="note">${escapeHtml(t("exports.pdf.durationOpen"))}</div>`,
    track.externalUrl
      ? `<div class="link"><a href="${escapeHtml(track.externalUrl)}">${escapeHtml(sourceLabel(track.source))}</a> <span>${escapeHtml(track.externalUrl)}</span></div>`
      : `<div class="note">${escapeHtml(t("exports.pdf.noLink"))}</div>`,
    path ? `<div class="link">${escapeHtml(t("exports.pdf.file"))} <span>${escapeHtml(path)}</span></div>` : "",
  ];
  return bits.join("");
}

export function buildSetPrintHtml(draft: SetDraft, t: Translate = tDe): string {
  const locale = t("exports.locale");
  const arcGuide = arcGuideFor(t);
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
      const join = mixJoin(previous, track, t);
      const phaseChanged = track.phase !== lastPhase;
      lastPhase = track.phase;
      const guide = arcGuide.find((item) => item.phase === track.phase);
      const start = formatDuration(clock);
      clock += track.durationMs;
      const banner = phaseChanged
        ? `<tr class="phase-row">
            <td colspan="6">
              <strong>${escapeHtml(phaseLabel(track.phase, t))}</strong>
              <em>${escapeHtml(phaseWindowLabel(draft.durationMinutes, track.phase, t))}</em>
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
          } · ${escapeHtml(roleLabel(track, t))}</div>
          ${trackDetail(track, t)}
        </td>
        <td class="key">${escapeHtml(track.keyCamelot || "—")}</td>
        <td class="bpm">${escapeHtml(track.bpm || "—")}</td>
        <td class="mix">
          <div>${escapeHtml(join?.label || "—")}</div>
          <div class="sub">${escapeHtml(transitionLabel(track, t))}</div>
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
          } · ${escapeHtml(phaseLabel(track.phase, t))}</div>
          ${trackDetail(track, t)}
        </td>
        <td class="key">${escapeHtml(track.keyCamelot || "—")}</td>
        <td class="bpm">${escapeHtml(track.bpm || "—")}</td>
        <td class="mix"><div class="sub">${escapeHtml(transitionLabel(track, t))}</div></td>
      </tr>`;
    })
    .join("");

  const performanceTable = main.length
    ? `<section>
        <h2>${escapeHtml(t("exports.pdf.performance"))}</h2>
        <p class="lead">${escapeHtml(t("exports.pdf.performanceLead"))}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t("exports.pdf.colStart"))}</th>
              <th>${escapeHtml(t("exports.pdf.colTrack"))}</th>
              <th>${escapeHtml(t("exports.pdf.colKey"))}</th>
              <th>${escapeHtml(t("exports.pdf.colBpm"))}</th>
              <th>${escapeHtml(t("exports.pdf.colFromPrevious"))}</th>
            </tr>
          </thead>
          <tbody>${performanceBody}</tbody>
        </table>
      </section>`
    : "";

  const alternativeTable = alternatives.length
    ? `<section>
        <h2>${escapeHtml(t("exports.pdf.alternatives"))}</h2>
        <p class="lead">${escapeHtml(t("exports.pdf.alternativesLead"))}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th colspan="2">${escapeHtml(t("exports.pdf.colTrack"))}</th>
              <th>${escapeHtml(t("exports.pdf.colKey"))}</th>
              <th>${escapeHtml(t("exports.pdf.colBpm"))}</th>
              <th>${escapeHtml(t("exports.pdf.colTransition"))}</th>
            </tr>
          </thead>
          <tbody>${alternativeBody}</tbody>
        </table>
      </section>`
    : "";

  return `<!doctype html>
<html lang="${locale.slice(0, 2)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t("exports.pdf.title", { title: draft.title || "SETFORM" }))}</title>
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
    <p>${escapeHtml(t("exports.pdf.toolbarHint"))}</p>
    <div>
      <button type="button" onclick="window.print()">${escapeHtml(t("exports.pdf.print"))}</button>
      <button type="button" class="ghost" onclick="window.close()">${escapeHtml(t("exports.pdf.close"))}</button>
    </div>
  </div>
  <main class="sheet">
    <p class="brand">${escapeHtml(t("exports.pdf.brand"))}</p>
    <h1>${escapeHtml(draft.title || t("exports.pdf.untitled"))}</h1>
    <p class="vibe">${escapeHtml(draft.vibe || "")}</p>
    <div class="brief">
      <div><span>${escapeHtml(t("exports.pdf.briefSlot"))}</span><strong>${escapeHtml(slotKind ? slotLabel(t, slotKind.id) : draft.slotKind)}${draft.slot ? ` · ${escapeHtml(draft.slot)}` : ""}</strong></div>
      <div><span>${escapeHtml(t("exports.pdf.briefDuration"))}</span><strong>${formatDuration(filledMs)} / ${draft.durationMinutes}:00${over ? escapeHtml(t("exports.pdf.briefOverBrief")) : ""}</strong></div>
      <div><span>${escapeHtml(t("exports.pdf.briefTracks"))}</span><strong>${escapeHtml(t("exports.pdf.briefTrackCounts", { performance: main.length, alternatives: alternatives.length }))}</strong></div>
      <div><span>Venue</span><strong>${escapeHtml(draft.venue || "—")}</strong></div>
      <div><span>Audience</span><strong>${escapeHtml(draft.audience || "—")}</strong></div>
      <div><span>Gear</span><strong>${escapeHtml(draft.gear || "—")}</strong></div>
    </div>
    <p class="summary">${escapeHtml(slotKind ? slotHint(t, slotKind.id) : "")}</p>
    ${performanceTable}
    ${alternativeTable}
    <div class="legend">
      <span>${escapeHtml(t("exports.pdf.legend"))}</span>
      <span>${new Date().toLocaleString(locale)}</span>
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

export function openSetPdfExport(draft: SetDraft, t: Translate = tDe): void {
  const popup = window.open("", "_blank");
  if (!popup) {
    throw new LocalizedError(
      "exports.pdf.popupBlocked",
      undefined,
      "Popup blockiert — bitte Popups für SETFORM erlauben und erneut exportieren.",
    );
  }
  popup.document.open();
  popup.document.write(buildSetPrintHtml(draft, t));
  popup.document.close();
}
