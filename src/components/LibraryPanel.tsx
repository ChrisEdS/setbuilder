"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyKeyImport,
  applyKeyImportRows,
  parseKeyValue,
  type KeyImportRow,
} from "@/lib/key-import";
import { parseRekordboxFile } from "@/lib/rekordbox";
import { bpmDelta } from "@/lib/harmonic";
import { sidePhrase } from "@/lib/replace-track";
import { RekordboxStick } from "@/components/RekordboxStick";
import { libraryTrackToSetTrack, type StickTrack } from "@/lib/rekordbox-stick";
import { stickFileCount } from "@/lib/stick-audio";
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
  stick?: StickTrack;
};

type SourceTab = "rekordbox" | "tidal" | "csv" | "spotify";

const EXAMPLE = `Artist,Title,Key,BPM
Floating Points,Ratio - Edit,8A,122
Kleintierschaukel,Motomia,9A,118
Crussen,Breakfast in the Hut,Am,120`;

function toImportRows(rows: LibraryRow[]): KeyImportRow[] {
  return rows.map((row) => ({
    artist: row.artist,
    title: row.title,
    keyRaw: row.key,
    keyCamelot: parseKeyValue(row.key),
    bpm: row.bpm,
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
  const [fitTo, setFitTo] = useState("");
  const [addPhase, setAddPhase] = useState<SetPhaseId>("open");
  const [addRole, setAddRole] = useState<TrackRole>("groove");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [spotifyNote, setSpotifyNote] = useState<string | null>(null);
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
      const ref = { keyCamelot: fitReference.keyCamelot, bpm: fitReference.bpm };
      rows = rows
        .map((row) => {
          const side = sidePhrase(
            ref,
            { keyCamelot: parseKeyValue(row.key) || row.key, bpm: row.bpm },
            "danach",
          );
          const delta = bpmDelta(ref.bpm, row.bpm);
          return { row, score: side?.score ?? 0, delta };
        })
        .filter(({ row, score, delta }) => {
          if (row.title === fitReference.name && row.artist === fitReference.artists[0]) {
            return false;
          }
          return score >= 0.55 && (delta == null || Math.abs(delta) <= 6);
        })
        .sort((a, b) => b.score - a.score)
        .map(({ row }) => row);
    }
    return rows.slice(0, 48);
  }, [libraryRows, query, fitReference]);

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
      onApply(
        draft,
        "Kein Key-Import erkannt — rekordbox XML/DB, CSV oder eingefügte Tabelle nutzen.",
      );
      return;
    }
    onApply(
      result.draft,
      `${result.matched}/${result.rows} Keys gematcht` +
        (result.unmatched ? ` · ${result.unmatched} ohne Treffer` : "") +
        (result.samples[0]
          ? ` · z. B. ${result.samples[0].track} → ${result.samples[0].key}`
          : ""),
    );
  }

  async function onRekordboxFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const parsed = await parseRekordboxFile(file);
      const rows: LibraryRow[] = parsed.rows.map((row) => ({
        artist: row.artist,
        title: row.title,
        key: row.keyCamelot || row.keyRaw,
        bpm: row.bpm,
      }));
      setLibraryCount(parsed.trackCount);
      setLibraryRows(rows);
      const result = applyKeyImportRows(draft, parsed.rows);
      onApply(
        result.draft,
        `rekordbox ${parsed.source.toUpperCase()}: ${trackCount(parsed.trackCount)} · ${result.matched} aufs Set gematcht` +
          (parsed.warning ? ` · ${parsed.warning}` : ""),
      );
    } catch (error) {
      onApply(
        draft,
        error instanceof Error
          ? error.message
          : "rekordbox Import fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function tryTidalEnrich() {
    const tracks = performanceTracks(draft.tracks).slice(0, 40);
    if (!tracks.length) {
      setTidalNote("Zuerst ein Set extrahieren.");
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
        const message =
          data.message ||
          "Tidal-Keys nicht verfügbar — Zugangsdaten unter „Verbindungen & Setups“ eintragen oder rekordbox nutzen.";
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
        data.message || `Tidal: ${enrichments.length} Keys übernommen`;
      setTidalNote(message);
      onApply({ ...draft, tracks: nextTracks }, message);
    } catch {
      const message = "Tidal Enrichment fehlgeschlagen.";
      setTidalNote(message);
      onApply(draft, message);
    } finally {
      setBusy(false);
    }
  }

  async function trySpotifyEnrich() {
    setBusy(true);
    try {
      const ids = performanceTracks(draft.tracks)
        .slice(0, 5)
        .map((track) => track.id);
      const response = await fetch("/api/enrich/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds: ids }),
      });
      const data = (await response.json()) as {
        available?: boolean;
        message?: string;
      };
      const message =
        data.message ||
        (data.available
          ? "Spotify Features ok"
          : "Spotify Key-Import nicht verfügbar");
      setSpotifyNote(message);
      onApply(draft, message);
    } catch {
      const message = "Spotify Enrichment fehlgeschlagen.";
      setSpotifyNote(message);
      onApply(draft, message);
    } finally {
      setBusy(false);
    }
  }

  function rematchFromLibrary() {
    const result = applyKeyImportRows(draft, toImportRows(libraryRows));
    onApply(
      result.draft,
      `Key und BPM neu geschrieben: ${result.matched} von ${trackCount(draft.tracks.length)} gefunden.`,
    );
  }

  const statusLabel =
    keyStats.total === 0
      ? "Noch kein Set — zuerst eine Playlist vom Stick laden"
      : keyStats.share === 0
        ? "Keys fehlen noch"
        : keyStats.share < 100
          ? `${keyStats.keyed} von ${keyStats.total} Tracks mit Key`
          : "Alle Performance-Tracks haben Keys";

  const sources: { id: SourceTab; label: string; note: string }[] = [
    {
      id: "rekordbox",
      label: "rekordbox",
      note: "Der Stick lädt ein fertiges Set. Die Collection legt nur Key und BPM auf die Tracks, die schon da sind.",
    },
    {
      id: "tidal",
      label: "Tidal",
      note: tidalConfigured
        ? "Tidal schreibt Key und BPM an die Tracks, zuerst über die ISRC."
        : "Tidal-Zugangsdaten fehlen. Unter „Verbindungen & Setups“ eintragen.",
    },
    {
      id: "csv",
      label: "CSV",
      note: "Tabelle einfügen, zum Beispiel aus Mixed In Key oder Serato. Camelot, Open Key oder Am/C.",
    },
    {
      id: "spotify",
      label: "Spotify",
      note: "Audio-Features sind im Dev Mode meist gesperrt. rekordbox oder Tidal sind die verlässliche Quelle.",
    },
  ];
  const sourceNote = sources.find((item) => item.id === source)?.note ?? "";

  return (
    <section className="library-panel" aria-label="Set laden und Keys">
      <div className="panel-head library-head">
        <div>
          <h2>Set laden &amp; Keys</h2>
          <p className="section-note">
            Erster Schritt: ein fertiges Set vom Rekordbox-Stick laden, mit Key,
            BPM und Dateipfad. Danach Keys und BPM aus Rekordbox, Tidal, CSV
            oder Spotify an die Tracks legen.
          </p>
          <p className="head-meta" aria-label="Key-Abdeckung">
            {statusLabel}
          </p>
        </div>
      </div>

      <div className="seg crate-service-seg" role="tablist" aria-label="Key-Quelle">
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
              <h3>rekordbox Collection</h3>
              <p>
                Ohne Stick: Collection als XML exportieren. Keys und BPM werden
                per Artist/Title aufs bestehende Set gematcht. Unverschlüsselte{" "}
                <code>master.db</code> und CSV gehen auch.
              </p>
              <p className="library-path">
                rekordbox → File → <strong>Export Collection in XML…</strong>
                {libraryCount != null ? (
                  <>
                    {" "}
                    · Index <strong>{libraryCount}</strong>
                  </>
                ) : null}
              </p>
            </div>
            <label
              className={
                "btn file-btn library-file" + (busy ? " is-busy" : "")
              }
            >
              {busy ? "Lade…" : "Collection laden"}
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
              <h3>Tidal Catalog</h3>
              <p>
                Tidal liefert Key, Scale und BPM. Matching zuerst per{" "}
                <strong>ISRC</strong> (über Spotify-Track-Metadaten), sonst
                Artist/Title — Ergebnis als Camelot + BPM im Set.
              </p>
              <p className="library-path">
                {tidalConfigured
                  ? "Zugangsdaten vorhanden."
                  : "Zugangsdaten fehlen. Unter „Verbindungen & Setups“ eintragen."}
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
              {busy ? "Lade…" : "Keys von Tidal holen"}
            </button>
          </div>
        ) : null}

        {source === "csv" ? (
          <div className="library-csv-pane">
            <div className="library-pane-grid">
              <div>
                <h3>CSV / Paste</h3>
                <p>
                  Mixed In Key, Serato oder manuell — Camelot (<code>8A</code>),
                  Open Key oder <code>Am</code>/<code>C</code>.
                </p>
              </div>
              <div className="library-inline-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setText(EXAMPLE)}
                >
                  Beispiel
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!text.trim() || draft.tracks.length === 0}
                  onClick={() => applyText(text)}
                >
                  Keys matchen
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              placeholder={"Artist,Title,Key,BPM\n…"}
              aria-label="Key CSV Paste"
            />
          </div>
        ) : null}

        {source === "spotify" ? (
          <div className="library-pane-grid">
            <div>
              <h3>Spotify Audio Features</h3>
              <p>
                Key/BPM über Audio Features sind für Dev-Mode-Apps meist
                gesperrt. Tidal oder rekordbox sind die praktikablen Quellen.
              </p>
              {spotifyNote ? (
                <p className="library-inline-status">{spotifyNote}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="btn ghost library-file"
              disabled={busy || draft.tracks.length === 0}
              onClick={() => void trySpotifyEnrich()}
            >
              Status prüfen
            </button>
          </div>
        ) : null}
      </div>

      {libraryRows.length > 0 ? (
        <div className="library-browser">
          <div className="library-browser-head">
            <h3>
              Bibliothek
              <span>{trackCount(libraryRows.length)}</span>
            </h3>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Artist, Titel oder Key…"
              aria-label="rekordbox suchen"
            />
            <span className="tip tip-end">
              <button
                type="button"
                className="btn ghost"
                onClick={rematchFromLibrary}
                disabled={draft.tracks.length === 0}
              >
                Keys &amp; BPM neu schreiben
              </button>
              <span className="tip-bubble" role="tooltip">
                Schreibt Key und BPM aus dieser Liste in die Tracks deiner Setliste.
                Gefunden wird über Artist und Titel. Vorhandene Werte werden
                überschrieben. Tracks ohne Treffer und leere Felder in der Liste
                lassen den alten Wert stehen.
              </span>
            </span>
          </div>
          <p className="section-note">
            Alle Tracks aus der geladenen Rekordbox-Datenbank. Mit ▶ hörst du
            rein, mit „+ Ins Set“ legst du einen Track in Phase und Rolle
            deiner Wahl. „Keys &amp; BPM neu schreiben“ gleicht die Setliste mit
            dieser Liste ab.
          </p>
          {onAddTrack ? (
            <div className="library-add-bar">
              <span>Beim Hinzufügen</span>
              <label>
                Phase
                <select
                  value={addPhase}
                  onChange={(event) => setAddPhase(event.target.value as SetPhaseId)}
                >
                  {PHASES.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Rolle
                <select
                  value={addRole}
                  onChange={(event) => setAddRole(event.target.value as TrackRole)}
                >
                  {TRACK_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Passt zu
                <select value={fitTo} onChange={(event) => setFitTo(event.target.value)}>
                  <option value="">Alle Tracks</option>
                  {performanceTracks(draft.tracks).map((track, index) => (
                    <option key={track.id} value={track.id}>
                      {index + 1}. {track.name} ({track.keyCamelot || "—"} · {track.bpm || "—"})
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
                      aria-label={`${row.title} abspielen`}
                      title={
                        canPlay
                          ? "Abspielen"
                          : "Nur mit gewähltem Stick-Ordner abspielbar"
                      }
                      onClick={() =>
                        onPlayTrack?.(libraryTrackToSetTrack(row, addPhase, addRole))
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
                  </em>
                  {onAddTrack ? (
                    <button
                      type="button"
                      className="btn ghost lib-add"
                      disabled={already}
                      onClick={() =>
                        onAddTrack(libraryTrackToSetTrack(row, addPhase, addRole))
                      }
                    >
                      {already ? "Im Set" : "+ Ins Set"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : source === "rekordbox" ? (
        <p className="section-note library-source-note">
          Noch kein Index. Nach dem Collection-Import kannst du hier suchen und
          erneut matchen.
        </p>
      ) : null}
    </section>
  );
}
