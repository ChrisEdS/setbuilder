import { tDe, type Translate } from "./i18n/core";
import type { SetDraft, SetTrack } from "./set";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function trackFilePath(track: {
  filePath?: string;
  source?: SetTrack["source"];
  note?: string;
  uri?: string;
}): string {
  if (track.filePath?.trim()) return track.filePath.trim();
  if (track.source === "rekordbox" && track.note?.includes("/")) return track.note.trim();
  if (track.uri?.startsWith("/")) return track.uri.trim();
  return "";
}

function locationFor(track: SetTrack): string {
  const path = trackFilePath(track);
  if (path) {
    const absolute = path.startsWith("/") ? path : `/${path}`;
    return `file://localhost${encodeURI(absolute)}`;
  }
  if (track.externalUrl?.startsWith("http")) return track.externalUrl;
  return "";
}

function performance(tracks: SetTrack[]): SetTrack[] {
  return tracks.filter((track) => track.role !== "safety");
}

function xmlTrack(track: SetTrack, id: number, t: Translate): string {
  const seconds = track.durationMs ? Math.round(track.durationMs / 1000) : 0;
  const bpm = track.bpm ? Number(track.bpm).toFixed(2) : "";
  const location = locationFor(track);
  const comment = [
    track.comment?.trim(),
    location ? "" : t("exports.booth.pathMissing"),
  ]
    .filter(Boolean)
    .join(" · ");
  const attrs = [
    `TrackID="${id}"`,
    `Name="${escapeXml(track.name)}"`,
    `Artist="${escapeXml(track.artists.join(", "))}"`,
    `Album="${escapeXml(track.album || "")}"`,
    `TotalTime="${seconds}"`,
    bpm ? `AverageBpm="${bpm}"` : "",
    track.keyCamelot ? `Tonality="${escapeXml(track.keyCamelot)}"` : "",
    location ? `Location="${escapeXml(location)}"` : "",
    comment ? `Comments="${escapeXml(comment)}"` : "",
  ].filter(Boolean);
  return `<TRACK ${attrs.join(" ")} />`;
}

/** rekordbox collection XML: performance order, plus Alternativen as a second playlist. */
export function buildRekordboxXml(draft: SetDraft, t: Translate = tDe): string {
  const main = performance(draft.tracks);
  const safety = draft.tracks.filter((track) => track.role === "safety");
  const ordered = [...main, ...safety];
  const collection = ordered
    .map((track, index) => xmlTrack(track, index + 1, t))
    .join("\n");
  const mainKeys = main.map((_, index) => `<TRACK Key="${index + 1}" />`).join("");
  const safetyKeys = safety
    .map((_, index) => `<TRACK Key="${main.length + index + 1}" />`)
    .join("");
  const folders = [
    `<NODE Name="${escapeXml(draft.title || "SETFORM")}" Type="1" KeyType="0" Entries="${main.length}">${mainKeys}</NODE>`,
  ];
  if (safety.length) {
    folders.push(
      `<NODE Name="${escapeXml(t("exports.booth.alternativesPlaylist", { title: draft.title || "SETFORM" }))}" Type="1" KeyType="0" Entries="${safety.length}">${safetyKeys}</NODE>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="SETFORM" Version="0.1.0" Company="SETFORM"/>
  <COLLECTION Entries="${ordered.length}">
${collection}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="${folders.length}">
      ${folders.join("\n      ")}
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>
`;
}

export function buildM3u(draft: SetDraft): string {
  const lines = ["#EXTM3U"];
  for (const track of performance(draft.tracks)) {
    const seconds = track.durationMs ? Math.max(0, Math.round(track.durationMs / 1000)) : -1;
    const artist = track.artists.filter((name) => name && name !== "Unknown").join(", ");
    const label = artist ? `${artist} - ${track.name}` : track.name;
    lines.push(`#EXTINF:${seconds},${label}`);
    lines.push(locationFor(track) || `# ${track.name}`);
  }
  return `${lines.join("\n")}\n`;
}

export function boothFileName(title: string, extension: "m3u" | "xml"): string {
  const slug = (title || "setform-set")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "setform-set"}.${extension}`;
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
