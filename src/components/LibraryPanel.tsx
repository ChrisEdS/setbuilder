"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyKeyImport,
  applyKeyImportRows,
  parseKeyValue,
  type KeyImportRow,
} from "@/lib/key-import";
import { parseRekordboxFile } from "@/lib/rekordbox";
import { energyStep } from "@/lib/energy";
import { bpmDelta } from "@/lib/harmonic";
import { sidePhrase } from "@/lib/replace-track";
import { RekordboxStick } from "@/components/RekordboxStick";
import { libraryTrackToSetTrack, type StickTrack } from "@/lib/rekordbox-stick";
import { stickFileCount } from "@/lib/stick-audio";
import { errorText, phaseLabel, roleLabel } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import {
  PHASES,
  TRACK_ROLES,
  performanceTracks,
  trackCount,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
  type TrackRole,
} from "@/lib/set";

type Props = {
  draft: SetDraft;
  onApply: (draft: SetDraft, message: string) => void;
  /** Put a library track into the set (Crate). */
  onAddTrack?: (track: SetTrack) => void;
  /** Play a library track in the player dock. */
  onPlayTrack?: (track: SetTrack) => void;
  /** Library lives in the parent so other views (Ersatz) can use it. */
  rows: LibraryRow[];
  onRows: (rows: LibraryRow[]) => void;
};

export type LibraryRow = {
  artist: string;
  title: string;
  key: string;
  bpm: string;
  /** Energy Level 1–10 when the source has it */
  energy?: number;
  stick?: StickTrack;
};

type SourceTab = "rekordbox" | "tidal" | "csv";

const EXAMPLE = `Artist,Title,Key,BPM
Floating Points,Ratio - Edit,8A,122
Kleintierschaukel,Motomia,9A,118
Crussen,Breakfast in the Hut,Am,120`;

/** Fills `{name}` placeholders of a translated text with elements (code, strong …). */
function rich(text: string, parts: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/).map((chunk, index) => {
    const name = /^\{(\w+)\}$/.exec(chunk)?.[1];
    return name && name in parts ? <Fragment key={index}>{parts[name]}</Fragment> : chunk;
  });
}

function toImportRows(rows: LibraryRow[]): KeyImportRow[] {
  return rows.map((row) => ({
    artist: row.artist,
    title: row.title,
    keyRaw: row.key,
    keyCamelot: parseKeyValue(row.key),
    bpm: row.bpm,
    energyLevel: row.energy ?? row.stick?.energyLevel,
  }));
}

export function LibraryPanel({
  draft,
  onApply,
  onAddTrack,
  onPlayTrack,
  rows: libraryRows,
  onRows: setLibraryRows,
}: Props) {
  const { t } = useI18n();
  const [fitTo, setFitTo] = useState("");
  const [addPhase, setAddPhase] = useState<SetPhaseId>("open");
  const [addRole, setAddRole] = useState<TrackRole>("groove");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [tidalNote, setTidalNote] = useState<string | null>(null);
  const [tidalConfigured, setTidalConfigured] = useState<boolean | null>(null);
  const [source, setSource] = useState<SourceTab>("rekordbox");

  const keyStats = useMemo(() => {
    const main = performanceTracks(draft.tracks);
    const keyed = main.filter((track) => track.keyCamelot).length;
    const total = main.length;
    const share = total ? Math.round((keyed / total) * 100) : 0;
    return { keyed, total, share };
  }, [draft.tracks]);

  const inSet = useMemo(
    () =>
      new Set(
        draft.tracks.map((track) => `${track.artists.join(",")}|${track.name}`.toLowerCase()),
      ),
    [draft.tracks],
  );

  const fitReference = useMemo(
    () => draft.tracks.find((track) => track.id === fitTo) ?? null,
    [draft.tracks, fitTo],
  );

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q
      ? libraryRows.filter(
          (row) =>
            row.title.toLowerCase().includes(q) ||
            row.artist.toLowerCase().includes(q) ||
            row.key.toLowerCase().includes(q),
        )
      : libraryRows;
    if (fitReference) {
      // Only tracks that can follow the chosen one: no clash, BPM within 6.
      const ref = {
        keyCamelot: fitReference.keyCamelot,
        bpm: fitReference.bpm,
        energyLevel: fitReference.energyLevel,
      };
      rows = rows
        .map((row) => {
          const side = sidePhrase(
            ref,
            {
              keyCamelot: parseKeyValue(row.key) || row.key,
              bpm: row.bpm,
              energyLevel: row.energy,
            },
            t("analysis.side.after"),
            t,
          );
          const delta = bpmDelta(ref.bpm, row.bpm);
          const energyJump = energyStep(ref.energyLevel, row.energy) === "jump";
          return { row, score: side?.score ?? 0, delta, energyJump };
        })
        .filter(({ row, score, delta, energyJump }) => {
          if (energyJump) return false;
          if (row.title === fitReference.name && row.artist === fitReference.artists[0]) {
            return false;
          }
          return score >= 0.55 && (delta == null || Math.abs(delta) <= 6);
        })
        .sort((a, b) => b.score - a.score)
        .map(({ row }) => row);
    }
    return rows.slice(0, 48);
  }, [libraryRows, query, fitReference, t]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/enrich/tidal")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setTidalConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setTidalConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyText(sourceText: string) {
    const result = applyKeyImport(draft, sourceText);
    if (!result.rows) {
      onApply(draft, t("library.import.noKeys"));
      return;
    }
    onApply(
      result.draft,
      [
        t("library.import.matched", { matched: result.matched, rows: result.rows }),
        result.unmatched ? t("library.import.unmatched", { count: result.unmatched }) : "",
        result.samples[0]
          ? t("library.import.sample", {
              track: result.samples[0].track,
              key: result.samples[0].key,
            })
          : "",
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }

  async function onRekordboxFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const parsed = await parseRekordboxFile(file, t);
      const rows: LibraryRow[] = parsed.rows.map((row) => ({
        artist: row.artist,
        title: row.title,
        key: row.keyCamelot || row.keyRaw,
        bpm: row.bpm,
        energy: row.energyLevel,
      }));
      setLibraryCount(parsed.trackCount);
      setLibraryRows(rows);
      const result = applyKeyImportRows(draft, parsed.rows);
      onApply(
        result.draft,
        t("library.import.rekordbox", {
          source: parsed.source.toUpperCase(),
          tracks: trackCount(parsed.trackCount, t),
          matched: result.matched,
        }) + (parsed.warning ? ` · ${parsed.warning}` : ""),
      );
    } catch (error) {
      onApply(draft, errorText(error, t, "library.import.rekordboxFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function tryTidalEnrich() {
    const tracks = performanceTracks(draft.tracks).slice(0, 40);
    if (!tracks.length) {
      setTidalNote(t("library.tidal.needSet"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/enrich/tidal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: tracks.map((track) => ({
            id: track.id,
            name: track.name,
            artists: track.artists,
          })),
        }),
      });
      const data = (await response.json()) as {
        available?: boolean;
        message?: string;
        enrichments?: Array<{
          spotifyId: string;
          keyCamelot: string;
          bpm: string;
        }>;
      };

      const enrichments = data.enrichments ?? [];
      if (!data.available || enrichments.length === 0) {
        const message = data.message || t("library.tidal.unavailable");
        setTidalNote(message);
        onApply(draft, message);
        return;
      }

      const byId = new Map(
        enrichments.map((item) => [item.spotifyId, item] as const),
      );
      const nextTracks = draft.tracks.map((track) => {
        const hit = byId.get(track.id);
        if (!hit) return track;
        return {
          ...track,
          keyCamelot: hit.keyCamelot || track.keyCamelot,
          bpm: hit.bpm || track.bpm,
        };
      });
      const message =
        data.message || t("library.tidal.applied", { count: enrichments.length });
      setTidalNote(message);
      onApply({ ...draft, tracks: nextTracks }, message);
    } catch {
      const message = t("library.tidal.failed");
      setTidalNote(message);
      onApply(draft, message);
    } finally {
      setBusy(false);
    }
  }

  function rematchFromLibrary() {
    const result = applyKeyImportRows(draft, toImportRows(libraryRows));
    onApply(
      result.draft,
      t("library.rewrite.done", {
        matched: result.matched,
        total: trackCount(draft.tracks.length, t),
      }),
    );
  }

  const statusLabel =
    keyStats.total === 0
      ? t("library.status.noSet")
      : keyStats.share === 0
        ? t("library.status.noKeys")
        : keyStats.share < 100
          ? t("library.status.partial", { keyed: keyStats.keyed, total: keyStats.total })
          : t("library.status.complete");

  const sources: { id: SourceTab; label: string; note: string }[] = [
    {
      id: "rekordbox",
      label: "rekordbox",
      note: t("library.sources.rekordboxNote"),
    },
    {
      id: "tidal",
      label: "Tidal",
      note: tidalConfigured
        ? t("library.sources.tidalNote")
        : t("library.sources.tidalMissingNote"),
    },
    {
      id: "csv",
      label: "CSV",
      note: t("library.sources.csvNote"),
    },
  ];
  const sourceNote = sources.find((item) => item.id === source)?.note ?? "";

  return (
    <section className="library-panel" aria-label={t("library.panel.aria")}>
      <div className="panel-head library-head">
        <div>
          <h2>{t("library.panel.title")}</h2>
          <p className="section-note">
            {t("library.panel.intro")}
          </p>
          <p className="head-meta" aria-label={t("library.coverage.aria")}>
            {statusLabel}
          </p>
        </div>
      </div>

      <div className="seg crate-service-seg" role="tablist" aria-label={t("library.sources.aria")}>
        {sources.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            title={item.note}
            aria-selected={source === item.id}
            className={source === item.id ? "seg-item active" : "seg-item"}
            onClick={() => setSource(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="section-note library-source-note">{sourceNote}</p>

      <div className="library-source-pane" role="tabpanel">
        {source === "rekordbox" ? (
          <>
          <RekordboxStick
            draft={draft}
            busy={busy}
            onApply={onApply}
            onIndexed={(rows) => {
              setLibraryRows(rows);
              setLibraryCount(rows.length);
            }}
          />
          <div className="library-pane-grid stick-collection">
            <div>
              <h3>{t("library.collection.title")}</h3>
              <p>
                {rich(t("library.collection.body"), { db: <code>master.db</code> })}
              </p>
              <p className="library-path">
                {rich(t("library.collection.path"), {
                  item: <strong>Export Collection in XML…</strong>,
                })}
                {libraryCount != null ? (
                  <>
                    {" "}
                    {rich(t("library.collection.index"), {
                      count: <strong>{libraryCount}</strong>,
                    })}
                  </>
                ) : null}
              </p>
            </div>
            <label
              className={
                "btn file-btn library-file" + (busy ? " is-busy" : "")
              }
            >
              {busy ? t("library.loading") : t("library.collection.load")}
              <input
                type="file"
                accept=".xml,.db,.sqlite,.csv,.txt,.tsv"
                hidden
                disabled={busy}
                onChange={(event) => {
                  void onRekordboxFile(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          </>
        ) : null}

        {source === "tidal" ? (
          <div className="library-pane-grid">
            <div>
              <h3>{t("library.tidal.title")}</h3>
              <p>
                {rich(t("library.tidal.body"), { isrc: <strong>ISRC</strong> })}
              </p>
              <p className="library-path">
                {tidalConfigured
                  ? t("library.tidal.configured")
                  : t("library.tidal.missing")}
              </p>
              {tidalNote ? (
                <p className="library-inline-status">{tidalNote}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="btn library-file"
              disabled={
                busy || draft.tracks.length === 0 || tidalConfigured === false
              }
              onClick={() => void tryTidalEnrich()}
            >
              {busy ? t("library.loading") : t("library.tidal.fetch")}
            </button>
          </div>
        ) : null}

        {source === "csv" ? (
          <div className="library-csv-pane">
            <div className="library-pane-grid">
              <div>
                <h3>{t("library.csv.title")}</h3>
                <p>
                  {rich(t("library.csv.body"), {
                    camelot: <code>8A</code>,
                    minor: <code>Am</code>,
                    major: <code>C</code>,
                  })}
                </p>
              </div>
              <div className="library-inline-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setText(EXAMPLE)}
                >
                  {t("library.csv.example")}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!text.trim() || draft.tracks.length === 0}
                  onClick={() => applyText(text)}
                >
                  {t("library.csv.match")}
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              placeholder={"Artist,Title,Key,BPM\n…"}
              aria-label={t("library.csv.aria")}
            />
          </div>
        ) : null}
      </div>

      {libraryRows.length > 0 ? (
        <div className="library-browser">
          <div className="library-browser-head">
            <h3>
              {t("library.browser.title")}
              <span>{trackCount(libraryRows.length, t)}</span>
            </h3>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("library.browser.searchPlaceholder")}
              aria-label={t("library.browser.searchAria")}
            />
            <span className="tip tip-end">
              <button
                type="button"
                className="btn ghost"
                onClick={rematchFromLibrary}
                disabled={draft.tracks.length === 0}
              >
                {t("library.browser.rewrite")}
              </button>
              <span className="tip-bubble" role="tooltip">
                {t("library.browser.rewriteTip")}
              </span>
            </span>
          </div>
          <p className="section-note">
            {t("library.browser.note", {
              add: t("library.row.add"),
              rewrite: t("library.browser.rewrite"),
            })}
          </p>
          {onAddTrack ? (
            <div className="library-add-bar">
              <span>{t("library.add.title")}</span>
              <label>
                {t("library.add.phase")}
                <select
                  value={addPhase}
                  onChange={(event) => setAddPhase(event.target.value as SetPhaseId)}
                >
                  {PHASES.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phaseLabel(t, phase.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("library.add.role")}
                <select
                  value={addRole}
                  onChange={(event) => setAddRole(event.target.value as TrackRole)}
                >
                  {TRACK_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {roleLabel(t, role.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("library.add.fits")}
                <select value={fitTo} onChange={(event) => setFitTo(event.target.value)}>
                  <option value="">{t("library.add.allTracks")}</option>
                  {performanceTracks(draft.tracks).map((track, index) => (
                    <option key={track.id} value={track.id}>
                      {index + 1}. {track.name} ({track.keyCamelot || "—"} · {track.bpm || "—"}
                      {track.energyLevel != null ? ` · E${track.energyLevel}` : ""})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <ul className="library-list">
            {filteredLibrary.map((row, index) => {
              const already = inSet.has(`${row.artist || "Unknown"}|${row.title}`.toLowerCase());
              const canPlay =
                Boolean(onPlayTrack) && Boolean(row.stick?.filePath) && stickFileCount() > 0;
              return (
                <li key={`${row.artist}-${row.title}-${index}`}>
                  {onPlayTrack ? (
                    <button
                      type="button"
                      className="lib-play"
                      disabled={!canPlay}
                      aria-label={t("library.row.playAria", { title: row.title })}
                      title={
                        canPlay
                          ? t("library.row.play")
                          : t("library.row.playDisabled")
                      }
                      onClick={() =>
                        onPlayTrack?.(libraryTrackToSetTrack(row, addPhase, addRole, t))
                      }
                    >
                      ▶
                    </button>
                  ) : null}
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.artist || "Unknown"}</span>
                  </div>
                  <em>
                    {row.key || "—"}
                    {row.bpm ? ` · ${row.bpm}` : ""}
                    {row.energy != null ? ` · E${row.energy}` : ""}
                  </em>
                  {onAddTrack ? (
                    <button
                      type="button"
                      className="btn ghost lib-add"
                      disabled={already}
                      onClick={() =>
                        onAddTrack(libraryTrackToSetTrack(row, addPhase, addRole, t))
                      }
                    >
                      {already ? t("library.row.inSet") : t("library.row.add")}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : source === "rekordbox" ? (
        <p className="section-note library-source-note">
          {t("library.browser.empty")}
        </p>
      ) : null}
    </section>
  );
}
