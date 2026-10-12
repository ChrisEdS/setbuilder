"use client";

import { Fragment, useState, type ReactNode } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import {
  applyStickSet,
  readRekordboxStick,
  type RekordboxStickSet,
  type StickTrack,
} from "@/lib/rekordbox-stick";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { rememberStickFiles } from "@/lib/stick-audio";
import { formatDuration, trackCount, type SetDraft } from "@/lib/set";

type Props = {
  draft: SetDraft;
  busy: boolean;
  onApply: (draft: SetDraft, message: string) => void;
  onIndexed: (
    rows: Array<{
      artist: string;
      title: string;
      key: string;
      bpm: string;
      energy?: number;
      stick?: StickTrack;
    }>,
  ) => void;
};

/** Fills `{name}` placeholders of a translated text with elements (code, strong …). */
function rich(text: string, parts: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/).map((chunk, index) => {
    const name = /^\{(\w+)\}$/.exec(chunk)?.[1];
    return name && name in parts ? <Fragment key={index}>{parts[name]}</Fragment> : chunk;
  });
}

/** What went wrong, kept as data so the notice follows the language switcher. */
type StickError = { kind: "noSets" } | { kind: "read"; error: unknown };

export function RekordboxStick({
  draft,
  busy,
  onApply,
  onIndexed,
}: Props) {
  const { t } = useI18n();
  const [localBusy, setLocalBusy] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [sets, setSets] = useState<RekordboxStickSet[]>([]);
  const [error, setError] = useState<StickError | null>(null);

  async function load(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setLocalBusy(true);
    setError(null);
    try {
      const stick = await readRekordboxStick(files);
      rememberStickFiles(files);
      setLabel(stick.label);
      setSets(stick.sets);
      onIndexed(
        stick.library.map((track) => ({
          artist: track.artist,
          title: track.title,
          key: track.keyCamelot || track.keyRaw,
          bpm: track.bpm,
          energy: track.energyLevel,
          stick: track,
        })),
      );
      if (!stick.sets.length) {
        setError({ kind: "noSets" });
      }
    } catch (caught) {
      setSets([]);
      setLabel(null);
      setError({ kind: "read", error: caught });
    } finally {
      setLocalBusy(false);
    }
  }

  function take(set: RekordboxStickSet) {
    if (!set.tracks.length) return;
    const next = applyStickSet(draft, set, t);
    const keyed = set.tracks.filter((track) => track.keyCamelot).length;
    const minutes = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
    onApply(
      next,
      t("library.stick.applied", {
        kind: kindLabel(set),
        name: set.name,
        tracks: trackCount(set.tracks.length, t),
      }) +
        (keyed ? ` · ${t("library.stick.withKey", { count: keyed })}` : "") +
        (minutes ? ` · ${formatDuration(minutes)}` : "") +
        (set.missing ? ` · ${t("library.stick.unmatched", { count: set.missing })}` : ""),
    );
  }

  const pending = busy || localBusy;

  function kindLabel(set: RekordboxStickSet) {
    return t(set.kind === "history" ? "library.stick.history" : "library.stick.playlist");
  }

  const notice: FieldNotice | null = !error
    ? null
    : error.kind === "noSets"
      ? { text: t("library.stick.noSets.text"), hint: t("library.stick.noSets.hint") }
      : {
          text: errorText(error.error, t, "library.stick.readFailed.text"),
          hint: t("library.stick.readFailed.hint"),
        };

  return (
    <div className="stick-import">
      <div className="library-pane-grid">
        <div>
          <h3>{t("library.stick.title")}</h3>
          <p>{t("library.stick.intro")}</p>
          <p className="library-path">
            {rich(t("library.stick.path"), {
              pioneer: <code>PIONEER</code>,
              dotPioneer: <code>.PIONEER</code>,
            })}
            {label ? (
              <>
                {" "}
                {rich(t("library.stick.found"), { label: <strong>{label}</strong> })}
              </>
            ) : null}
          </p>
        </div>
        <div className="stick-actions">
          <label className={"btn library-file" + (pending ? " is-busy" : "")}>
            {pending ? t("library.loading") : t("library.stick.choose")}
            <input
              type="file"
              hidden
              multiple
              disabled={pending}
              // Nonstandard directory picker. The browser returns every file
              // under the chosen volume; only export.pdb is read.
              {...{ webkitdirectory: "", directory: "" }}
              onChange={(event) => {
                void load(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className={"btn ghost library-file" + (pending ? " is-busy" : "")}>
            export.pdb
            <input
              type="file"
              hidden
              accept=".pdb,.xml,application/xml"
              disabled={pending}
              onChange={(event) => {
                void load(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <FieldNoticeView notice={notice} />
      {sets.length ? (
        <ul className="stick-list">
          {sets.map((set) => {
            const ms = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
            return (
              <li key={set.id}>
                <div>
                  <strong>{set.name}</strong>
                  <span>
                    {kindLabel(set)}
                    {set.path !== set.name ? ` · ${set.path}` : ""}
                    {` · ${trackCount(set.tracks.length, t)}`}
                    {ms ? ` · ${formatDuration(ms)}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn"
                  disabled={pending || set.tracks.length === 0}
                  onClick={() => take(set)}
                >
                  {t("library.stick.loadSet")}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
