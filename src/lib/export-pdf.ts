import { mixJoin } from "@/lib/harmonic";
import { trackFilePath } from "@/lib/export-booth";
import { stickAlternativesPlaylistName } from "@/lib/stick-names";
import { tDe, type Translate } from "@/lib/i18n/core";
import {
  phaseLabel as domainPhaseLabel,
  slotLabel,
  transitionLabel as domainTransitionLabel,
} from "@/lib/i18n/domain";
import { LocalizedError } from "@/lib/i18n/error";
import {
  PHASES,
  SLOT_KINDS,
  TRANSITIONS,
  phaseWindowLabel,
  formatDuration,
  performanceTracks,
  playedDurationMs,
  playedTotalMs,
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

/** Inline set-arc mark for print popups (no network). */
const BRAND_MARK_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#181818"/><rect x="8" y="40" width="8" height="12" rx="2" fill="#4A4A4A"/><rect x="18" y="32" width="8" height="20" rx="2" fill="#6A6A6A"/><rect x="28" y="22" width="8" height="30" rx="2" fill="#9A9A9A"/><rect x="38" y="12" width="8" height="40" rx="2" fill="#1ED760"/><rect x="48" y="30" width="8" height="22" rx="2" fill="#5A5A5A"/><path d="M12 46 C18 42, 22 36, 28 28 C32 22, 36 14, 42 14 C46 14, 50 26, 52 36" stroke="#1ED760" stroke-width="2" stroke-linecap="round" opacity="0.55" fill="none"/></svg>`,
  );

function transitionLabel(track: SetTrack, t: Translate): string {
  if (track.transition === "unset") return "";
  return TRANSITIONS.some((item) => item.id === track.transition)
    ? domainTransitionLabel(t, track.transition)
    : track.transition;
}

function phaseLabel(phase: SetPhaseId, t: Translate): string {
  return PHASES.some((item) => item.id === phase) ? domainPhaseLabel(t, phase) : phase;
}

/** Only what the DJ wrote down on purpose: a cue note, or the plan-B hint. */
function cueNote(track: SetTrack, t: Translate): string {
  const note = track.note?.trim() || "";
  const path = trackFilePath(track);
  const parts = [
    note && note !== path ? note : "",
    track.safetyAlt ? t("exports.pdf.backupNote", { text: track.safetyAlt }) : "",
  ].filter(Boolean);
  return parts.length ? `<div class="note">${escapeHtml(parts.join(" · "))}</div>` : "";
}

function trackCell(track: SetTrack, t: Translate): string {
  const artists = track.artists.filter((name) => name && name !== "Unknown");
  return `<strong>${escapeHtml(track.name)}</strong>${
    artists.length ? ` <span class="by">${escapeHtml(artists.join(", "))}</span>` : ""
  }${track.durationMs ? ` <span class="dur">${formatDuration(track.durationMs)}</span>` : ""}${cueNote(
    track,
    t,
  )}`;
}

export function buildSetPrintHtml(draft: SetDraft, t: Translate = tDe): string {
  const locale = t("exports.locale");
  const main = performanceTracks(draft.tracks);
  const alternatives = draft.tracks.filter((track) => track.role === "safety");
  const filledMs = playedTotalMs(draft.tracks);
  const targetMs = draft.durationMinutes * 60_000;
  const over = filledMs > targetMs;
  const slotKind = SLOT_KINDS.find((slot) => slot.id === draft.slotKind);
  const openDuration = main.some((track) => !track.durationMs);

  let clock = 0;
  let lastPhase: SetPhaseId | "" = "";
  const performanceBody = main
    .map((track, index) => {
      const previous = index > 0 ? main[index - 1] : null;
      const join = mixJoin(previous, track, t);
      const phaseChanged = track.phase !== lastPhase;
      lastPhase = track.phase;
      const start = formatDuration(clock);
      clock += playedDurationMs(track.durationMs);
      const banner = phaseChanged
        ? `<tr class="phase-row">
            <td colspan="6">
              <strong>${escapeHtml(phaseLabel(track.phase, t))}</strong>
              <em>${escapeHtml(phaseWindowLabel(draft.durationMinutes, track.phase, t))}</em>
            </td>
          </tr>`
        : "";
      const transition = transitionLabel(track, t);
      return `${banner}<tr>
        <td class="num">${index + 1}</td>
        <td class="clock">${start}</td>
        <td class="track">${trackCell(track, t)}</td>
        <td class="key">${escapeHtml(track.keyCamelot || "—")}</td>
        <td class="bpm">${escapeHtml(track.bpm || "—")}</td>
        <td class="mix">${escapeHtml(join?.label || "—")}${
          transition ? ` <span class="by">${escapeHtml(transition)}</span>` : ""
        }</td>
      </tr>`;
    })
    .join("");

  const alternativeBody = alternatives
    .map((track, index) => {
      return `<tr>
        <td class="num">S${index + 1}</td>
        <td class="track" colspan="2">${trackCell(track, t)}</td>
        <td class="key">${escapeHtml(track.keyCamelot || "—")}</td>
        <td class="bpm">${escapeHtml(track.bpm || "—")}</td>
        <td class="mix"><span class="by">${escapeHtml(phaseLabel(track.phase, t))}</span></td>
      </tr>`;
    })
    .join("");

  const performanceTable = main.length
    ? `<table>
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
      </table>`
    : "";

  const alternativeTable = alternatives.length
    ? `<section>
        <h2>${escapeHtml(t("exports.pdf.alternatives"))}</h2>
        <p class="where">${escapeHtml(
          t("exports.pdf.alternativesWhere", {
            name: stickAlternativesPlaylistName(draft.title, t("exports.pdf.alternatives")),
          }),
        )}</p>
        <table>
          <tbody>${alternativeBody}</tbody>
        </table>
      </section>`
    : "";

  const slotName = slotKind ? slotLabel(t, slotKind.id) : draft.slotKind;
  const slotText = draft.slot?.trim() || "";
  const meta = [
    slotName,
    // "Peak Time" and "Peak Time" is no information
    slotText.toLowerCase().includes(String(slotName).toLowerCase()) ? "" : slotText,
    `${formatDuration(filledMs)} / ${draft.durationMinutes}:00${over ? t("exports.pdf.briefOverBrief") : ""}`,
    t("exports.pdf.briefTrackCounts", { performance: main.length, alternatives: alternatives.length }),
    draft.venue,
    draft.audience,
    draft.gear,
    draft.notes?.trim() || "",
  ].filter((part) => part && String(part).trim());

  return `<!doctype html>
<html lang="${locale.slice(0, 2)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t("exports.pdf.title", { title: draft.title || "SETBUILDER" }))}</title>
  <style>
    :root {
      --ink: #161616;
      --muted: #666;
      --line: #dcdcdc;
      --band: #f1f1f1;
      --paper: #fff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: #ececec;
      font: 10.5px/1.3 "Avenir Next", "Segoe UI", sans-serif;
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
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
    }
    .toolbar button.ghost {
      background: transparent;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.35);
    }
    .sheet {
      max-width: 860px;
      margin: 18px auto 32px;
      padding: 22px 28px 26px;
      background: var(--paper);
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 4px;
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .brand img {
      width: 14px;
      height: 14px;
      border-radius: 3px;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .meta {
      margin: 4px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid var(--ink);
      color: var(--muted);
      font-size: 10.5px;
    }
    section { margin-top: 14px; }
    h2 {
      margin: 0 0 3px;
      font-size: 12px;
      letter-spacing: -0.01em;
    }
    .where { margin: 0 0 6px; color: var(--muted); font-size: 10.5px; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 3px 5px;
      vertical-align: top;
      text-align: left;
    }
    th {
      font-size: 8px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 650;
    }
    td.num { width: 24px; color: var(--muted); }
    td.clock { width: 42px; font-variant-numeric: tabular-nums; }
    td.key, td.bpm { width: 36px; font-variant-numeric: tabular-nums; }
    td.mix { width: 190px; }
    .track strong { font-size: 11px; }
    .by, .dur, .note { color: var(--muted); font-size: 10px; }
    .dur { font-variant-numeric: tabular-nums; margin-left: 4px; }
    .note { white-space: pre-wrap; margin-top: 1px; }
    tr.phase-row td {
      background: var(--band);
      border-bottom-color: #cfcfcf;
      padding-top: 4px;
      padding-bottom: 3px;
    }
    tr.phase-row strong { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; }
    tr.phase-row em {
      margin-left: 8px;
      font-style: normal;
      color: var(--muted);
      font-size: 10px;
    }
    tr { break-inside: avoid; }
    .foot {
      margin-top: 10px;
      color: var(--muted);
      font-size: 9.5px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    @page { size: A4; margin: 10mm; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .sheet { margin: 0; max-width: none; padding: 0; box-shadow: none; }
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
    <p class="brand"><img src="${BRAND_MARK_DATA_URI}" alt="" />${escapeHtml(t("exports.pdf.brand"))}</p>
    <h1>${escapeHtml(draft.title || t("exports.pdf.untitled"))}</h1>
    <p class="meta">${meta.map((part) => escapeHtml(String(part))).join(" · ")}</p>
    ${performanceTable}
    ${alternativeTable}
    <div class="foot">
      <span>${openDuration ? escapeHtml(t("exports.pdf.durationOpen")) : ""}</span>
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
      "Popup blockiert — bitte Popups für SETBUILDER erlauben und erneut exportieren.",
    );
  }
  popup.document.open();
  popup.document.write(buildSetPrintHtml(draft, t));
  popup.document.close();
}
