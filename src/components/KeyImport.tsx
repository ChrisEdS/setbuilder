"use client";

import { useState } from "react";
import { applyKeyImport } from "@/lib/key-import";
import type { SetDraft } from "@/lib/set";

type Props = {
  draft: SetDraft;
  onApply: (draft: SetDraft, message: string) => void;
};

const EXAMPLE = `Artist,Title,Key,BPM
Floating Points,Ratio - Edit,8A,122
Kleintierschaukel,Motomia,9A,118
Crussen,Breakfast in the Hut,Am,120`;

export function KeyImport({ draft, onApply }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  function runImport(source: string) {
    const result = applyKeyImport(draft, source);
    if (!result.rows) {
      onApply(draft, "Kein Key-Import erkannt — CSV oder „Artist - Title - 8A - 122“.");
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
    if (result.matched > 0) setOpen(false);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const content = await file.text();
    setText(content);
    runImport(content);
  }

  return (
    <section className="key-import" aria-label="Key Import">
      <div className="panel-head">
        <h2>Keys importieren</h2>
        <div className="actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Schließen" : "CSV / Paste"}
          </button>
        </div>
      </div>

      <p className="guide-line">
        Spotify liefert in Dev Mode keine Audio-Features. Importiere Keys/BPM aus
        <strong> Mixed In Key</strong>, <strong>rekordbox</strong>, Serato oder
        als Text — Camelot (<code>8A</code>), Open Key (<code>1m</code>) oder
        klassisch (<code>Am</code>).
      </p>

      {open ? (
        <div className="key-import-body">
          <div className="key-import-actions">
            <label className="btn ghost file-btn">
              Datei wählen
              <input
                type="file"
                accept=".csv,.txt,.tsv,text/csv,text/plain"
                hidden
                onChange={(event) => {
                  void onFile(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
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
              onClick={() => runImport(text)}
              disabled={!text.trim() || draft.tracks.length === 0}
            >
              Keys matchen
            </button>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder={`Artist,Title,Key,BPM\n…\noder:\nArtist - Title - 8A - 122`}
            aria-label="Key Import Text"
          />

          <p className="guide-line">
            Matching läuft über Artist + Title gegen dein aktuelles Set
            (Performance + Alternativen). Danach „Harmonisch sortieren“.
          </p>
        </div>
      ) : null}
    </section>
  );
}
