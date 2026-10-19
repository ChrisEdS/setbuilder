"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import {
  applyStickSet,
  readRekordboxStick,
  stickLibraryRows,
  type RekordboxStickSet,
  type StickTrack,
} from "@/lib/rekordbox-stick";
import { errorText, type Translate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { rememberStickFiles } from "@/lib/stick-audio";
import { formatDuration, trackCount, type SetDraft } from "@/lib/set";
import {
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

export type StickStatusSlice = {
  health: StickHealth;
  checkingHealth: boolean;
  healthRoot: DirLike | null;
  refreshHealth: () => void | Promise<void>;
  onPrepare?: () => void | Promise<void>;
  onRestoreLibrary?: () => void | Promise<void>;
  onEject?: () => void | Promise<void>;
};

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
  onStickStatus?: (status: StickStatusSlice | null) => void;
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

function StickSetList({
  sets,
  query,
  kind,
  pending,
  onQuery,
  onKind,
  onTake,
  kindLabel,
  t,
}: {
  sets: RekordboxStickSet[];
  query: string;
  kind: "all" | "playlist" | "history";
  pending: boolean;
  onQuery: (value: string) => void;
  onKind: (kind: "all" | "playlist" | "history") => void;
  onTake: (set: RekordboxStickSet) => void;
  kindLabel: (set: RekordboxStickSet) => string;
  t: Translate;
}) {
  const needle = query.trim().toLowerCase();
  const bothKinds =
    sets.some((set) => set.kind === "playlist") &&
    sets.some((set) => set.kind === "history");
  const visible = sets.filter((set) => {
    if (kind !== "all" && set.kind !== kind) return false;
    if (!needle) return true;
    return `${set.name} ${set.path}`.toLowerCase().includes(needle);
  });
  const kinds = [
    ["all", "library.stick.kindAll"],
    ["playlist", "library.stick.kindPlaylist"],
    ["history", "library.stick.kindHistory"],
  ] as const;

  function setSubtitle(set: RekordboxStickSet) {
    if (set.kind === "history" && set.tracks.length) {
      // Play order from export.pdb — last row is the most recent track in the session.
      for (const row of [...set.tracks].reverse()) {
        const track = [row.artist, row.title].filter(Boolean).join(" — ");
        if (track) {
          return t("library.stick.historySnippet", { track });
        }
      }
    }
    const pathPart = set.path !== set.name ? ` · ${set.path}` : "";
    return `${kindLabel(set)}${pathPart}`;
  }

  return (
    <section
      className="library-browser stick-sets builder-card"
      aria-label={t("library.stick.setsTitle")}
    >
      <div className="library-browser-head">
        <h3 className="library-browser-title">
          <span className="library-browser-heading">{t("library.stick.setsTitle")}</span>
          <span className="library-browser-meta">
            {t("library.stick.setsCount", { shown: visible.length, total: sets.length })}
          </span>
        </h3>
        <div className="library-browser-toolbar">
          <span className="library-search-field">
            <input
              type="search"
              value={query}
              placeholder={t("library.stick.filterPlaceholder")}
              aria-label={t("library.stick.filterAria")}
              onChange={(event) => onQuery(event.target.value)}
            />
          </span>
          {bothKinds ? (
            <label className="library-playlist-pick">
              <span className="sr-only">{t("library.stick.filterAria")}</span>
              <select
                value={kind}
                aria-label={t("library.stick.filterAria")}
                onChange={(event) => onKind(event.target.value as "all" | "playlist" | "history")}
              >
                {kinds.map(([id, key]) => (
                  <option key={id} value={id}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
      {visible.length ? (
        <ul className="library-list">
          {visible.map((set) => {
            const ms = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
            return (
              <li key={set.id}>
                <div>
                  <strong>{set.name}</strong>
                  <span>{setSubtitle(set)}</span>
                </div>
                <em>
                  {trackCount(set.tracks.length, t)}
                  {ms ? ` · ${formatDuration(ms)}` : ""}
                </em>
                <button
                  type="button"
                  className="btn ghost lib-add"
                  disabled={pending || set.tracks.length === 0}
                  onClick={() => onTake(set)}
                >
                  {t("library.stick.loadSet")}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="builder-note">
          {needle
            ? t("library.stick.filterEmpty", { query: query.trim() })
            : t("library.stick.filterNone")}
        </p>
      )}
    </section>
  );
}

export function RekordboxStick({
  draft,
  busy,
  onApply,
  onIndexed,
  onStickStatus,
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
  const [setQuery, setSetQuery] = useState("");
  const [setKind, setSetKind] = useState<"all" | "playlist" | "history">("all");
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
    onIndexed(stickLibraryRows(read.library, read.sets));
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
      onIndexed(stickLibraryRows(read.library, read.sets));
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

  useEffect(() => {
    if (!onStickStatus) return;
    if (!health) {
      onStickStatus(null);
      return;
    }
    onStickStatus({
      health,
      checkingHealth,
      healthRoot,
      refreshHealth: () => refreshHealth(),
      onPrepare: healthRoot
        ? async () => {
            if (!(await stickPermission(healthRoot, "readwrite", true))) throw new Error("perm");
            await prepareStickForPlayers(healthRoot);
            await refreshHealth({ handle: healthRoot });
          }
        : undefined,
      onRestoreLibrary: healthRoot
        ? async () => {
            if (!(await stickPermission(healthRoot, "readwrite", true))) throw new Error("perm");
            await restorePlayerLibrary(healthRoot);
            await refreshHealth({ handle: healthRoot });
          }
        : undefined,
      onEject: healthRoot ? () => requestStickEject(healthRoot.name) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers recreated; slice is for display only
  }, [health, checkingHealth, healthRoot, onStickStatus]);

  return (
    <div className="rekordbox-stick-nested builder-stack">
      <div className="library-source-pane stick-import-pane builder-card" role="tabpanel">
        <div className="library-browser-head stick-import-head">
          <h3 className="library-browser-title">
            <span className="library-browser-heading">{t("library.stick.title")}</span>
          </h3>
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
        <div className="library-source-pane-body stick-import-body">
          <p className="library-path stick-import-lede">{t("library.stick.intro")}</p>
          <p className="library-path">
            {label
              ? rich(t("library.stick.found"), { label: <strong>{label}</strong> })
              : rich(t("library.stick.path"), {
                  pioneer: <code>PIONEER</code>,
                  dotPioneer: <code>.PIONEER</code>,
                })}
          </p>
          {live ? (
            <p className="field-notice" role="status">
              <strong>{live.text}</strong>
              <span>{live.hint}</span>
            </p>
          ) : (
            <FieldNoticeView notice={notice} />
          )}
        </div>
      </div>
      {sets.length ? (
        <StickSetList
          sets={sets}
          query={setQuery}
          kind={setKind}
          pending={pending}
          onQuery={setSetQuery}
          onKind={setSetKind}
          onTake={take}
          kindLabel={kindLabel}
          t={t}
        />
      ) : null}
    </div>
  );
}
