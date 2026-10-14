"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import { StickHealthCard } from "@/components/StickHealthCard";
import {
  applyStickSet,
  mediaPathsForDraft,
  readRekordboxStick,
  rehydrateStickCovers,
  stickLibraryRows,
  type RekordboxStickSet,
  type StickTrack,
} from "@/lib/rekordbox-stick";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { rememberStickFiles } from "@/lib/stick-audio";
import { enrichDraftEnergyFromFiles } from "@/lib/stick-file";
import { formatDuration, trackCount, type SetDraft } from "@/lib/set";
import {
  hydrateStickMedia,
  isPickerBlocked,
  loadPersistedStickHandle,
  pickAndRememberStick,
  readStickFromHandle,
  requestStickEject,
  stickPermission,
  stickPicker,
} from "@/lib/stick-session";
import { inspectStick, inspectStickFiles, type StickHealth } from "@/lib/stick-health";
import { prepareStickForPlayers, restorePlayerLibrary, type DirLike } from "@/lib/rekordbox-stick-write";

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
type StickError =
  | { kind: "noSets" }
  | { kind: "empty" }
  | { kind: "blocked" }
  | { kind: "read"; error: unknown };

type LoadPhase = "idle" | "picking" | "listing" | "reading";

export function RekordboxStick({
  draft,
  busy,
  onApply,
  onIndexed,
}: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [label, setLabel] = useState<string | null>(null);
  const [sets, setSets] = useState<RekordboxStickSet[]>([]);
  const [error, setError] = useState<StickError | null>(null);
  const [health, setHealth] = useState<StickHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthRoot, setHealthRoot] = useState<DirLike | null>(null);
  const [healthFiles, setHealthFiles] = useState<File[] | null>(null);
  const dirInput = useRef<HTMLInputElement>(null);
  const loadGen = useRef(0);

  async function refreshHealth(source: { handle?: DirLike | null; files?: File[] | null } = {}) {
    const handle = source.handle !== undefined ? source.handle : healthRoot;
    const files = source.files !== undefined ? source.files : healthFiles;
    setCheckingHealth(true);
    try {
      if (handle) {
        setHealth(await inspectStick(handle));
        return;
      }
      if (files?.length) {
        setHealth(await inspectStickFiles(files));
        return;
      }
      setHealth(null);
    } catch {
      setHealth(null);
    } finally {
      setCheckingHealth(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const handle = await loadPersistedStickHandle();
      if (!handle || !(await stickPermission(handle, "read", false))) return;
      try {
        await applyHandle(handle);
      } catch {
        setHealthRoot(handle);
        await refreshHealth({ handle, files: null });
      }
    })();
    // Once: remembered stick, no prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function beginLoad(): number {
    loadGen.current += 1;
    return loadGen.current;
  }

  function stillCurrent(token: number) {
    return token === loadGen.current;
  }

  function cancelLoad() {
    beginLoad();
    setPhase("idle");
  }

  async function applyHandle(handle: DirLike) {
    setHealthRoot(handle);
    setHealthFiles(null);
    const read = await readStickFromHandle(handle);
    setLabel(read.label);
    setSets(read.sets);
    onIndexed(stickLibraryRows(read.library));
    if (!read.sets.length) setError({ kind: "noSets" });
    void inspectStick(handle)
      .then((next) => setHealth(next))
      .catch(() => setHealth(null));
  }

  async function load(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length) {
      setError({ kind: "empty" });
      setPhase("idle");
      return;
    }
    const token = beginLoad();
    setPhase("listing");
    setError(null);
    setHealthRoot(null);
    setHealthFiles(files);
    try {
      setPhase("reading");
      const read = await readRekordboxStick(files);
      if (!stillCurrent(token)) return;
      rememberStickFiles(files);
      setLabel(read.label);
      setSets(read.sets);
      onIndexed(stickLibraryRows(read.library));
      if (!read.sets.length) setError({ kind: "noSets" });
      void inspectStickFiles(files)
        .then((next) => {
          if (stillCurrent(token)) setHealth(next);
        })
        .catch(() => {
          if (stillCurrent(token)) setHealth(null);
        });
    } catch (caught) {
      if (!stillCurrent(token)) return;
      setSets([]);
      setLabel(null);
      setError({ kind: "read", error: caught });
    } finally {
      if (stillCurrent(token)) setPhase("idle");
    }
  }

  async function chooseFolder() {
    setError(null);
    if (!stickPicker()) {
      dirInput.current?.click();
      return;
    }
    const token = beginLoad();
    setPhase("picking");
    try {
      const handle = await pickAndRememberStick("read");
      if (!stillCurrent(token)) return;
      if (!handle) {
        setPhase("idle");
        return;
      }
      setPhase("reading");
      await applyHandle(handle);
    } catch (caught) {
      if (!stillCurrent(token)) return;
      setSets([]);
      setLabel(null);
      setError(isPickerBlocked(caught) ? { kind: "blocked" } : { kind: "read", error: caught });
    } finally {
      if (stillCurrent(token)) setPhase("idle");
    }
  }

  function take(set: RekordboxStickSet) {
    if (!set.tracks.length) return;
    const next = applyStickSet(draft, set, t);
    const keyed = set.tracks.filter((track) => track.keyCamelot).length;
    const minutes = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
    const message =
      t("library.stick.applied", {
        kind: kindLabel(set),
        name: set.name,
        tracks: trackCount(set.tracks.length, t),
      }) +
      (keyed ? ` · ${t("library.stick.withKey", { count: keyed })}` : "") +
      (minutes ? ` · ${formatDuration(minutes)}` : "") +
      (set.missing ? ` · ${t("library.stick.unmatched", { count: set.missing })}` : "");
    onApply(next, message);
    const rootPromise = healthRoot
      ? Promise.resolve(healthRoot)
      : loadPersistedStickHandle();
    void rootPromise.then(async (handle) => {
      if (!handle) return;
      await hydrateStickMedia(handle, mediaPathsForDraft(next, set.tracks));
      const covered = rehydrateStickCovers(next, set.tracks);
      // Energy written by SETBUILDER lives in MP3 tags, not yet in export.pdb.
      onApply(await enrichDraftEnergyFromFiles(covered, handle), message);
    });
  }

  const locking = busy || phase === "listing" || phase === "reading";
  const pending = locking || phase === "picking";

  function kindLabel(set: RekordboxStickSet) {
    return t(set.kind === "history" ? "library.stick.history" : "library.stick.playlist");
  }

  const notice: FieldNotice | null = !error
    ? null
    : error.kind === "noSets"
      ? { text: t("library.stick.noSets.text"), hint: t("library.stick.noSets.hint") }
      : error.kind === "empty"
        ? { text: t("library.stick.emptyPick.text"), hint: t("library.stick.emptyPick.hint") }
        : error.kind === "blocked"
          ? { text: t("library.stick.blocked.text"), hint: t("library.stick.blocked.hint") }
          : {
              text: errorText(error.error, t, "library.stick.readFailed.text"),
              hint: t("library.stick.readFailed.hint"),
            };

  const live: FieldNotice | null =
    phase === "picking"
      ? { text: t("library.stick.picking"), hint: t("library.stick.pickingHint") }
      : phase === "listing"
        ? { text: t("library.stick.listing"), hint: t("library.stick.listingHint") }
        : phase === "reading"
          ? { text: t("library.stick.reading"), hint: t("library.stick.readingHint") }
          : null;

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
          <button
            type="button"
            className={"btn" + (pending ? " is-busy" : "")}
            disabled={pending}
            onClick={() => void chooseFolder()}
          >
            {locking ? t("library.stick.reading") : t("library.stick.choose")}
          </button>
          <input
            ref={dirInput}
            type="file"
            hidden
            multiple
            disabled={locking}
            // Nonstandard directory picker. Always available if showDirectoryPicker fails.
            {...{ webkitdirectory: "", directory: "" }}
            onChange={(event) => {
              void load(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          {phase === "picking" || error?.kind === "blocked" ? (
            <button
              type="button"
              className={"btn ghost library-file" + (locking ? " is-busy" : "")}
              disabled={locking}
              onClick={() => dirInput.current?.click()}
            >
              {t("library.stick.chooseFolder")}
            </button>
          ) : null}
          <label className={"btn ghost library-file" + (locking ? " is-busy" : "")}>
            {t("library.stick.choosePdb")}
            <input
              type="file"
              hidden
              accept=".pdb,.xml,application/xml"
              disabled={locking}
              onChange={(event) => {
                void load(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {phase !== "idle" ? (
            <button type="button" className="btn ghost" onClick={cancelLoad}>
              {t("library.stick.cancel")}
            </button>
          ) : null}
        </div>
      </div>
      {live ? (
        <p className="field-notice" role="status">
          <strong>{live.text}</strong>
          <span>{live.hint}</span>
        </p>
      ) : (
        <FieldNoticeView notice={notice} />
      )}
      {health ? (
        <StickHealthCard
          health={health}
          checking={checkingHealth}
          canFix={Boolean(healthRoot)}
          onRecheck={() => void refreshHealth()}
          onPrepare={
            healthRoot
              ? async () => {
                  if (!(await stickPermission(healthRoot, "readwrite", true))) throw new Error("perm");
                  await prepareStickForPlayers(healthRoot);
                  await refreshHealth({ handle: healthRoot });
                }
              : undefined
          }
          onRestoreLibrary={
            healthRoot
              ? async () => {
                  if (!(await stickPermission(healthRoot, "readwrite", true))) throw new Error("perm");
                  await restorePlayerLibrary(healthRoot);
                  await refreshHealth({ handle: healthRoot });
                }
              : undefined
          }
          onEject={healthRoot ? () => requestStickEject(healthRoot.name) : undefined}
        />
      ) : null}
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
