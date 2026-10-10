"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyKeyImport,
  applyKeyImportRows,
  parseKeyValue,
  type KeyImportRow,
} from "@/lib/key-import";
import { parseRekordboxFile } from "@/lib/rekordbox";
import type { SetDraft } from "@/lib/set";
import { performanceTracks } from "@/lib/set";

type Props = {
  draft: SetDraft;
  onApply: (draft: SetDraft, message: string) => void;
};

type LibraryRow = {
  artist: string;
  title: string;
  key: string;
  bpm: string;
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

export function LibraryPanel({ draft, onApply }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [libraryCount, setLibraryCount] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [libraryRows, setLibraryRows] = useState<LibraryRow[]>([]);
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

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return libraryRows.slice(0, 48);
    return libraryRows
      .filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          row.artist.toLowerCase().includes(q) ||
          row.key.toLowerCase().includes(q),
      )
      .slice(0, 48);
  }, [libraryRows, query]);

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
        "Kein Key-Import erkannt — rekordbox XML/DB, CSV oder Paste nutzen.",
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
        `rekordbox ${parsed.source.toUpperCase()}: ${parsed.trackCount} Tracks · ${result.matched} aufs Set gematcht` +
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
          "Tidal Keys nicht verfügbar — Client-IDs setzen oder rekordbox nutzen.";
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
      `${result.matched}/${result.rows} aus rekordbox Index gematcht`,
    );
  }

  const statusLabel =
    keyStats.total === 0
      ? "Noch kein Set — zuerst Playlist extrahieren"
      : keyStats.share === 0
        ? "Keys fehlen noch"
        : keyStats.share < 100
          ? `${keyStats.keyed} von ${keyStats.total} Tracks mit Key`
          : "Alle Performance-Tracks haben Keys";

  const sources: {
    id: SourceTab;
    label: string;
    hint: string;
  }[] = [
    {
      id: "rekordbox",
      label: "rekordbox",
      hint: "XML · CSV · DB",
    },
    {
      id: "tidal",
      label: "Tidal",
      hint:
        tidalConfigured === null
          ? "…"
          : tidalConfigured
            ? "Catalog Keys"
            : "IDs nötig",
    },
    {
      id: "csv",
      label: "CSV",
      hint: "Paste",
    },
    {
      id: "spotify",
      label: "Spotify",
      hint: "oft gesperrt",
    },
  ];

  return (
    <section className="library-panel" aria-label="Key Library">
      <div className="panel-head library-head">
        <div>
          <h2>Key Library</h2>
          <p className="timeline-filter">{statusLabel}</p>
        </div>
        <div className="library-meter" aria-label="Key-Abdeckung">
          <strong>{keyStats.share}%</strong>
          <span>
            {keyStats.keyed}/{keyStats.total || "—"}
          </span>
        </div>
      </div>

      <div
        className="library-progress"
        role="progressbar"
        aria-valuenow={keyStats.share}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i
          style={{
            width: `${Math.max(keyStats.share, keyStats.total ? 2 : 0)}%`,
          }}
        />
      </div>

      <div className="seg library-source-seg" role="tablist" aria-label="Key-Quelle">
        {sources.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={source === item.id}
            className={source === item.id ? "seg-item active" : "seg-item"}
            onClick={() => setSource(item.id)}
          >
            {item.label}
            <i>{item.hint}</i>
          </button>
        ))}
      </div>

      <div className="library-source-pane" role="tabpanel">
        {source === "rekordbox" ? (
          <div className="library-pane-grid">
            <div>
              <h3>rekordbox Collection</h3>
              <p>
                Empfohlen: Collection als XML exportieren. Keys/BPM werden per
                Artist/Title aufs Spotify-Set gematcht. Unverschlüsselte{" "}
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
                  ? "Client Credentials gesetzt."
                  : "TIDAL_CLIENT_ID + TIDAL_CLIENT_SECRET in .env.local (developer.tidal.com)."}
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
              Library Index
              <span>{libraryRows.length} Tracks</span>
            </h3>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Artist, Title oder Key…"
              aria-label="rekordbox suchen"
            />
            <button
              type="button"
              className="btn ghost"
              onClick={rematchFromLibrary}
              disabled={draft.tracks.length === 0}
            >
              Erneut matchen
            </button>
          </div>
          <ul className="library-list">
            {filteredLibrary.map((row, index) => (
              <li key={`${row.artist}-${row.title}-${index}`}>
                <div>
                  <strong>{row.title}</strong>
                  <span>{row.artist || "Unknown"}</span>
                </div>
                <em>
                  {row.key || "—"}
                  {row.bpm ? ` · ${row.bpm}` : ""}
                </em>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="library-empty">
          <strong>Noch kein rekordbox-Index</strong>
          <span>
            Optional — nach XML-Import kannst du hier suchen und erneut matchen.
            Tidal braucht keinen Index.
          </span>
        </div>
      )}
    </section>
  );
}
