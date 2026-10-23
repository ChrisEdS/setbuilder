"use client";

import {
  Fragment,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  applyKeyImport,
  applyKeyImportRows,
  parseKeyValue,
  type KeyImportRow,
} from "@/lib/key-import";
import { parseRekordboxFile } from "@/lib/rekordbox";
import { enqueueWork } from "@/lib/work-queue";
import { CAMELOT_CODES } from "@/lib/harmonic";
import { boundOf, matchesLibraryFilter } from "@/lib/library-filter";
import { rankFitsAfter } from "@/lib/replace-track";
import { Tip } from "@/components/Hint";
import { RekordboxStick, type StickStatusSlice } from "@/components/RekordboxStick";
import { StickReloadBanner } from "@/components/StickReloadBanner";
import type { RekordboxStickSet } from "@/lib/rekordbox-stick";
import { libraryRowTrackId, libraryTrackToSetTrack, type StickTrack } from "@/lib/rekordbox-stick";
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
  /** Library lives in the parent so other views (Ersatz) can use it. */
  rows: LibraryRow[];
  onRows: (rows: LibraryRow[]) => void;
  /** Stick playlists and history, for starting the set. */
  onStickSets?: (sets: RekordboxStickSet[]) => void;
  /** Parent asks this panel to run the existing stick picker. */
  chooseStick?: RefObject<(() => void) | null>;
  onStickStatus?: (status: StickStatusSlice | null) => void;
};

export type LibraryRow = {
  artist: string;
  title: string;
  key: string;
  bpm: string;
  /** Energy Level 1–10 when the source has it */
  energy?: number;
  /** Stick playlist / history names this track belongs to */
  playlists?: string[];
  stick?: StickTrack;
};

type SourceTab = "rekordbox" | "tidal" | "csv";

/** How many “Fits after” matches to show at once before “5 others”. */
const FIT_PAGE_SIZE = 5;
/** Cap when browsing the whole library without a fit filter. */
const LIBRARY_BROWSE_CAP = 48;

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

/** Playlist labels for the picker — prefer short names over “Folder / Name”. */
function playlistPickerLabels(rows: LibraryRow[]): string[] {
  const all = new Set<string>();
  for (const row of rows) {
    for (const name of row.playlists ?? []) {
      const trimmed = name.trim();
      if (trimmed) all.add(trimmed);
    }
  }
  return [...all]
    .filter((label) => {
      const sep = label.lastIndexOf(" / ");
      if (sep < 0) return true;
      return !all.has(label.slice(sep + 3));
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function LibraryBrowser({
  draft,
  rows,
  onAddTrack,
  onPlayTrack,
  playingId = null,
}: {
  draft: SetDraft;
  rows: LibraryRow[];
  onAddTrack?: (track: SetTrack) => void;
  onPlayTrack?: (track: SetTrack) => void;
  playingId?: string | null;
}) {
  const { t } = useI18n();
  const [fitTo, setFitTo] = useState("");
  const [fitPageState, setFitPageState] = useState<{
    page: number;
    fitTo: string;
    query: string;
    filterKey: string;
    rows: LibraryRow[];
  }>({ page: 0, fitTo: "", query: "", filterKey: "", rows });
  const [addPhase, setAddPhase] = useState<SetPhaseId>("open");
  const [addRole, setAddRole] = useState<TrackRole>("groove");
  const [query, setQuery] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");
  const [energyMin, setEnergyMin] = useState("");
  const [energyMax, setEnergyMax] = useState("");
  const searchHintsId = useId();
  // The field updates immediately. Filtering and “fits after” ranking wait, so a
  // keystroke does not sort the whole stick library.
  const deferredQuery = useDeferredValue(query);
  const deferredKeyFilter = useDeferredValue(keyFilter);
  const deferredBpmMin = useDeferredValue(bpmMin);
  const deferredBpmMax = useDeferredValue(bpmMax);
  const deferredEnergyMin = useDeferredValue(energyMin);
  const deferredEnergyMax = useDeferredValue(energyMax);
  const deferredFilterKey = `${deferredKeyFilter}|${deferredBpmMin}|${deferredBpmMax}|${deferredEnergyMin}|${deferredEnergyMax}`;

  const inSet = useMemo(
    () =>
      new Set(
        draft.tracks.map((track) => `${track.artists.join(",")}|${track.name}`.toLowerCase()),
      ),
    [draft.tracks],
  );
  const playlistOptions = useMemo(() => playlistPickerLabels(rows), [rows]);
  const playlistFilter = playlistOptions.find((name) => name === query) ?? "";
  const fitReference = useMemo(
    () => draft.tracks.find((track) => track.id === fitTo) ?? null,
    [draft.tracks, fitTo],
  );
  const rankedLibrary = useMemo(() => {
    const trimmed = deferredQuery.trim();
    const q = trimmed.toLowerCase();
    const exactPlaylist = playlistOptions.find((name) => name === trimmed);
    let list = rows;
    if (exactPlaylist) {
      list = list.filter((row) =>
        (row.playlists ?? []).some(
          (name) => name === exactPlaylist || name.endsWith(` / ${exactPlaylist}`),
        ),
      );
    } else if (q) {
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          row.artist.toLowerCase().includes(q) ||
          row.key.toLowerCase().includes(q) ||
          (row.playlists ?? []).some((name) => name.toLowerCase().includes(q)),
      );
    }
    list = list.filter((row) =>
      matchesLibraryFilter(row, {
        key: deferredKeyFilter,
        bpmMin: boundOf(deferredBpmMin),
        bpmMax: boundOf(deferredBpmMax),
        energyMin: boundOf(deferredEnergyMin),
        energyMax: boundOf(deferredEnergyMax),
      }),
    );
    if (fitReference) {
      return rankFitsAfter(list, fitReference, (raw) => parseKeyValue(raw) || raw, t).map(
        (item) => item.row,
      );
    }
    return list.slice(0, LIBRARY_BROWSE_CAP);
  }, [
    rows,
    deferredQuery,
    fitReference,
    t,
    playlistOptions,
    deferredKeyFilter,
    deferredBpmMin,
    deferredBpmMax,
    deferredEnergyMin,
    deferredEnergyMax,
  ]);

  const fitPageCount = fitReference
    ? Math.max(1, Math.ceil(rankedLibrary.length / FIT_PAGE_SIZE))
    : 1;
  const fitPage =
    fitPageState.fitTo === fitTo &&
    fitPageState.query === deferredQuery &&
    fitPageState.filterKey === deferredFilterKey &&
    fitPageState.rows === rows
      ? fitPageState.page
      : 0;
  const safeFitPage = fitReference ? Math.min(fitPage, fitPageCount - 1) : 0;
  const filteredLibrary = fitReference
    ? rankedLibrary.slice(
        safeFitPage * FIT_PAGE_SIZE,
        safeFitPage * FIT_PAGE_SIZE + FIT_PAGE_SIZE,
      )
    : rankedLibrary;
  const canShowMoreMatches = Boolean(fitReference) && rankedLibrary.length > FIT_PAGE_SIZE;

  if (rows.length === 0) return null;

  return (
    <div className="library-panel">
      <div className="library-browser builder-card">
        <div className="library-browser-head">
          <h3 className="library-browser-title">
            <span className="library-browser-heading">{t("library.browser.title")}</span>
            <span className="library-browser-meta">{trackCount(rows.length, t)}</span>
          </h3>
          <div className="library-browser-toolbar">
            <Tip text={t("library.browser.searchTip")} className="library-search-field">
              <input
                value={query}
                list={playlistOptions.length > 0 ? searchHintsId : undefined}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("library.browser.searchPlaceholder")}
                aria-label={t("library.browser.searchAria")}
              />
            </Tip>
            {playlistOptions.length > 0 ? (
              <datalist id={searchHintsId}>
                {playlistOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
            {playlistOptions.length > 0 ? (
              <Tip text={t("library.browser.playlistPickTip")}>
                <label className="library-playlist-pick">
                  <span className="sr-only">{t("library.browser.playlistPick")}</span>
                  <select
                    value={playlistFilter}
                    aria-label={t("library.browser.playlistPickAria")}
                    onChange={(event) => setQuery(event.target.value)}
                  >
                    <option value="">{t("library.browser.playlistPickAll")}</option>
                    {playlistOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </Tip>
            ) : null}
          </div>
          <div className="library-refine">
            <label>
              {t("library.filter.key")}
              <select
                value={keyFilter}
                onChange={(event) => setKeyFilter(event.target.value)}
              >
                <option value="">{t("library.filter.keyAny")}</option>
                {CAMELOT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("library.filter.bpmFrom")}
              <input
                inputMode="decimal"
                value={bpmMin}
                onChange={(event) => setBpmMin(event.target.value)}
              />
            </label>
            <label>
              {t("library.filter.bpmTo")}
              <input
                inputMode="decimal"
                value={bpmMax}
                onChange={(event) => setBpmMax(event.target.value)}
              />
            </label>
            <label>
              {t("library.filter.energyFrom")}
              <select
                value={energyMin}
                onChange={(event) => setEnergyMin(event.target.value)}
              >
                <option value="">{t("library.filter.energyAny")}</option>
                {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("library.filter.energyTo")}
              <select
                value={energyMax}
                onChange={(event) => setEnergyMax(event.target.value)}
              >
                <option value="">{t("library.filter.energyAny")}</option>
                {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {onAddTrack ? (
          <div className="library-add-bar">
            <div className="library-add-group">
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
            </div>
            <label className="library-add-fit">
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
        </div>
        <ul className="library-list">
          {filteredLibrary.map((row, index) => {
            const already = inSet.has(`${row.artist || "Unknown"}|${row.title}`.toLowerCase());
            const canPlay =
              Boolean(onPlayTrack) && Boolean(row.stick?.filePath) && stickFileCount() > 0;
            const playing = playingId === libraryRowTrackId(row);
            return (
              <li key={`${row.artist}-${row.title}-${safeFitPage}-${index}`}>
                {onPlayTrack ? (
                  <button
                    type="button"
                    className={playing ? "lib-play is-playing" : "lib-play"}
                    disabled={!canPlay}
                    aria-label={
                      playing
                        ? t("crates.player.pause")
                        : t("library.row.playAria", { title: row.title })
                    }
                    title={
                      playing
                        ? t("crates.player.pause")
                        : canPlay
                          ? t("library.row.play")
                          : t("library.row.playDisabled")
                    }
                    onClick={() => onPlayTrack(libraryTrackToSetTrack(row, addPhase, addRole, t))}
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>
                ) : null}
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.artist || t("common.unknown")}</span>
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
                    onClick={() => onAddTrack(libraryTrackToSetTrack(row, addPhase, addRole, t))}
                  >
                    {already ? t("library.row.inSet") : t("library.row.add")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {fitReference && rankedLibrary.length > 0 ? (
          <div className="library-more">
            {canShowMoreMatches ? (
              <Tip text={t("library.add.moreMatchesTip")}>
                <button
                  type="button"
                  className="btn ghost library-more-btn"
                  aria-label={t("library.add.moreMatchesAria", {
                    page: safeFitPage + 1,
                    pages: fitPageCount,
                  })}
                  onClick={() =>
                    setFitPageState({
                      page: (safeFitPage + 1) % fitPageCount,
                      fitTo,
                      query: deferredQuery,
                      filterKey: deferredFilterKey,
                      rows,
                    })
                  }
                >
                  <span className="library-more-icon" aria-hidden="true">
                    ↻
                  </span>
                  {t("library.add.moreMatches")}
                </button>
              </Tip>
            ) : null}
            <span className="library-more-count">
              {t("library.add.matchCount", {
                shown: filteredLibrary.length,
                total: rankedLibrary.length,
              })}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LibraryPanel({
  draft,
  onApply,
  rows: libraryRows,
  onRows: setLibraryRows,
  onStickSets,
  chooseStick: chooseStickRef,
  onStickStatus,
}: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [tidalNote, setTidalNote] = useState<string | null>(null);
  const [tidalConfigured, setTidalConfigured] = useState<boolean | null>(null);
  const [source, setSource] = useState<SourceTab>("rekordbox");
  const stickChoose = useRef<(() => void) | null>(null);
  const pendingChoose = useRef(false);

  useEffect(() => {
    if (!chooseStickRef) return;
    chooseStickRef.current = () => {
      if (stickChoose.current) {
        setSource("rekordbox");
        stickChoose.current();
        return;
      }
      pendingChoose.current = true;
      setSource("rekordbox");
    };
    return () => {
      chooseStickRef.current = null;
    };
  }, [chooseStickRef]);

  useEffect(() => {
    if (source !== "rekordbox" || !pendingChoose.current) return;
    const run = stickChoose.current;
    if (!run) return;
    pendingChoose.current = false;
    run();
  }, [source]);

  const keyStats = useMemo(() => {
    const main = performanceTracks(draft.tracks);
    const keyed = main.filter((track) => track.keyCamelot).length;
    const total = main.length;
    const share = total ? Math.round((keyed / total) * 100) : 0;
    return { keyed, total, share };
  }, [draft.tracks]);

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
      const parsed = await enqueueWork(
        async () => parseRekordboxFile(file, t),
        {
          operation: "collection-import",
          key: `${file.name}:${file.size}:${file.lastModified}`,
          label: t("builder.work.collectionImport"),
          target: file.name,
        },
      );
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
      // The tab note says what Tidal does; whether credentials exist is said once, in the pane.
      id: "tidal",
      label: "Tidal",
      note: t("library.sources.tidalNote"),
    },
    {
      id: "csv",
      label: "CSV",
      note: t("library.sources.csvNote"),
    },
  ];

  return (
    <section className="library-panel builder-section-stack" aria-label={t("library.panel.aria")}>
      <div className="panel-head library-head">
        <h2>{t("library.panel.title")}</h2>
      </div>

      {libraryRows.length === 0 ? (
        <StickReloadBanner
          draft={draft}
          onLoaded={(rows) => setLibraryRows(rows)}
        />
      ) : null}

      <div className="library-source-nav">
        <div className="seg crate-service-seg" role="tablist" aria-label={t("library.sources.aria")}>
          {sources.map((item, index) => (
            <Tip
              key={item.id}
              text={item.note}
              end={index === sources.length - 1}
            >
              <button
                type="button"
                role="tab"
                aria-selected={source === item.id}
                className={source === item.id ? "seg-item active" : "seg-item"}
                onClick={() => setSource(item.id)}
              >
                {item.label}
              </button>
            </Tip>
          ))}
        </div>
        <p className="library-source-status builder-status" aria-label={t("library.coverage.aria")}>
          {statusLabel}
        </p>
        <Tip text={t("library.browser.rewriteTip")} end>
          <button
            type="button"
            className="btn ghost"
            onClick={rematchFromLibrary}
            disabled={draft.tracks.length === 0 || libraryRows.length === 0}
          >
            {t("library.browser.rewrite")}
          </button>
        </Tip>
      </div>
      {source === "rekordbox" ? (
        <RekordboxStick
          busy={busy}
          onIndexed={(rows) => {
            setLibraryRows(rows);
            setLibraryCount(rows.length);
          }}
          onSets={onStickSets}
          onStickStatus={onStickStatus}
          chooseStick={stickChoose}
        />
      ) : (
        <div className="library-source-pane builder-card" role="tabpanel">
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
            <div className="stick-actions">
              <button
                type="button"
                className={"btn" + (busy ? " is-busy" : "")}
                disabled={
                  busy || draft.tracks.length === 0 || tidalConfigured === false
                }
                onClick={() => void tryTidalEnrich()}
              >
                {busy ? t("library.loading") : t("library.tidal.fetch")}
              </button>
            </div>
          </div>
          ) : null}

          {source === "csv" ? (
          <div className="library-csv-pane">
            <div>
              <h3>{t("library.csv.title")}</h3>
              <p>
                {rich(t("library.csv.body"), {
                  camelot: <strong>8A</strong>,
                  minor: <strong>Am</strong>,
                  major: <strong>C</strong>,
                })}
              </p>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              placeholder={"Artist,Title,Key,BPM\n…"}
              aria-label={t("library.csv.aria")}
            />
            {/* Actions sit under the field they act on; the primary one first. */}
            <div className="stick-actions">
              <button
                type="button"
                className="btn"
                disabled={!text.trim() || draft.tracks.length === 0}
                title={draft.tracks.length === 0 ? t("library.status.noSet") : undefined}
                onClick={() => applyText(text)}
              >
                {t("library.csv.match")}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setText(EXAMPLE)}
              >
                {t("library.csv.example")}
              </button>
            </div>
          </div>
          ) : null}
        </div>
      )}

      {source === "rekordbox" ? (
        <details className="explain-fold nested library-collection-fold">
          <summary>
            <span>
              {t("library.collection.title")}
              {libraryCount != null
                ? ` · ${t("library.collection.indexed", { count: libraryCount })}`
                : ""}
            </span>
            <em className="fold-toggle" />
          </summary>
          <div className="explain-body">
            <p>{t("library.collection.body")}</p>
            <p className="library-path">
              {rich(t("library.collection.path"), {
                item: <strong>Export Collection in XML…</strong>,
              })}
            </p>
            <div className="stick-actions">
              <label className={"btn" + (busy ? " is-busy" : "")}>
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
          </div>
        </details>
      ) : null}
    </section>
  );
}
