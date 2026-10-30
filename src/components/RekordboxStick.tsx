"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { FieldNoticeView, type FieldNotice } from "@/components/FieldNotice";
import {
  readRekordboxStick,
  stickLibraryRows,
  type RekordboxStickSet,
  type StickTrack,
} from "@/lib/rekordbox-stick";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { rememberStickFiles } from "@/lib/stick-audio";
import { requestPreviewPause } from "@/lib/preview-transport";
import { formatDuration, trackCount } from "@/lib/set";
import {
  isPickerBlocked,
  loadPersistedStickHandle,
  pickAndRememberStick,
  prepareStickEject,
  readStickFromHandle,
  requestStickEject,
  requestStickRepair,
  stickPermission,
  stickPicker,
} from "@/lib/stick-session";
import { StickHealthCard } from "@/components/StickHealthCard";
import { inspectStick, inspectStickFiles, pdbSummaryOf, type StickHealth } from "@/lib/stick-health";
import { enqueueWork } from "@/lib/work-queue";
import {
  prepareStickForPlayers,
  restorePlayerLibrary,
  type DirLike,
  type StickPrepareReporter,
} from "@/lib/rekordbox-stick-write";

export type StickStatusSlice = {
  health: StickHealth;
  checkingHealth: boolean;
  healthRoot: DirLike | null;
  refreshHealth: () => void | Promise<void>;
  onPrepare?: (report?: StickPrepareReporter) => void | Promise<void>;
  onRestoreLibrary?: (report?: StickPrepareReporter) => void | Promise<void>;
  onEject?: () => void | Promise<void>;
  onRepair?: () => void | Promise<void>;
};

type Props = {
  busy: boolean;
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
  /** Playlists and history, so Build set can start from one. */
  onSets?: (sets: RekordboxStickSet[]) => void;
  /** Filled with the existing folder picker. Null when this pane is unmounted. */
  chooseStick?: RefObject<(() => void) | null>;
  /**
   * Soft restore: remembered handle + permission prompt, no directory picker.
   * True when label/sets/health are live again. Null when this pane is unmounted.
   */
  reconnectStick?: RefObject<(() => Promise<boolean>) | null>;
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

export function StickSetList({
  sets,
  pending = false,
  onTake,
}: {
  sets: RekordboxStickSet[];
  pending?: boolean;
  onTake: (set: RekordboxStickSet) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "playlist" | "history">("all");
  const kindLabel = (set: RekordboxStickSet) =>
    t(set.kind === "history" ? "library.stick.history" : "library.stick.playlist");
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
    <details className="explain-fold nested stick-sets-fold" open>
      <summary>
        <h3 className="library-browser-title">
          <span className="library-browser-heading">{t("builder.playlist.title")}</span>
          <span className="library-browser-meta">
            {t("library.stick.setsCount", { shown: visible.length, total: sets.length })}
          </span>
        </h3>
        <em className="fold-toggle" />
      </summary>
      <div className="explain-body stick-sets-body">
        <div className="library-browser-toolbar">
          <span className="library-search-field">
            <input
              type="search"
              value={query}
              placeholder={t("library.stick.filterPlaceholder")}
              aria-label={t("library.stick.filterAria")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
          {bothKinds ? (
            <label className="library-playlist-pick">
              <span className="sr-only">{t("library.stick.filterAria")}</span>
              <select
                value={kind}
                aria-label={t("library.stick.filterAria")}
                onChange={(event) => setKind(event.target.value as "all" | "playlist" | "history")}
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
        <p className="builder-note">{t("builder.playlist.note")}</p>
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
                    className="btn ghost stick-set-load"
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
      </div>
    </details>
  );
}

export function RekordboxStick({
  busy,
  onIndexed,
  onStickStatus,
  onSets,
  chooseStick: chooseStickRef,
  reconnectStick: reconnectStickRef,
}: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [label, setLabel] = useState<string | null>(null);
  const [folded, setFolded] = useState(true);
  const [error, setError] = useState<StickError | null>(null);
  const [health, setHealth] = useState<StickHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthRoot, setHealthRoot] = useState<DirLike | null>(null);
  const [healthFiles, setHealthFiles] = useState<File[] | null>(null);
  /** Remembered IDB handle exists — used after mid-session eject / remount. */
  const [rememberedStick, setRememberedStick] = useState(false);
  /** True once this session actually held a stick — cold start must not say “Reconnect”. */
  const [hadStickThisSession, setHadStickThisSession] = useState(false);
  const dirInput = useRef<HTMLInputElement>(null);
  const chooseImpl = useRef<() => void>(() => {});
  const softReconnectImpl = useRef<() => Promise<boolean>>(async () => false);

  function publishSets(next: RekordboxStickSet[]) {
    onSets?.(next);
  }
  const loadGen = useRef(0);

  function refreshRememberedFlag() {
    void loadPersistedStickHandle()
      .then((handle) => setRememberedStick(Boolean(handle)))
      .catch(() => setRememberedStick(false));
  }

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
      setRememberedStick(Boolean(handle));
      // Mount restore: no permission prompt (needs a gesture). Soft reconnect
      // later re-requests with prompt=true after eject / remount.
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
    await enqueueWork(async () => {
      setHealthRoot(handle);
      setHadStickThisSession(true);
      setHealthFiles(null);
      setRememberedStick(true);
      const read = await readStickFromHandle(handle);
      setLabel(read.label);
      publishSets(read.sets);
      onIndexed(stickLibraryRows(read.library, read.sets));
      if (!read.sets.length) setError({ kind: "noSets" });
        try {
          setHealth(await inspectStick(handle, pdbSummaryOf(read.library.length, read.sets)));
        } catch {
          setHealth(null);
        }
    }, {
      operation: "stick-read",
      key: handle.name || "persisted-stick",
      label: t("builder.work.stickReconnect"),
      target: handle.name,
    });
  }

  /**
   * Re-grant FS Access on the remembered handle and rehydrate the pane.
   * Does not clear or rewrite IndexedDB — eject only drops live UI state.
   */
  async function trySoftReconnect(): Promise<boolean> {
    const handle = await loadPersistedStickHandle().catch(() => null);
    if (!handle) {
      setRememberedStick(false);
      return false;
    }
    setRememberedStick(true);
    if (!(await stickPermission(handle, "read", true))) return false;
    const token = beginLoad();
    setPhase("reading");
    setError(null);
    try {
      await applyHandle(handle);
      return stillCurrent(token);
    } catch (caught) {
      if (!stillCurrent(token)) return false;
      setError(isPickerBlocked(caught) ? { kind: "blocked" } : { kind: "read", error: caught });
      return false;
    } finally {
      if (stillCurrent(token)) setPhase("idle");
    }
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
      await enqueueWork(async () => {
        const read = await readRekordboxStick(files);
        if (!stillCurrent(token)) return;
        rememberStickFiles(files);
        setLabel(read.label);
        setHadStickThisSession(true);
        publishSets(read.sets);
        onIndexed(stickLibraryRows(read.library, read.sets));
        if (!read.sets.length) setError({ kind: "noSets" });
        try {
          const next = await inspectStickFiles(
            files,
            pdbSummaryOf(read.library.length, read.sets),
          );
          if (stillCurrent(token)) setHealth(next);
        } catch {
          if (stillCurrent(token)) setHealth(null);
        }
      }, {
        operation: "stick-read",
        key: files.map((file) => file.webkitRelativePath || file.name).join("|"),
        label: t("builder.work.stickReconnect"),
        target: files[0]?.webkitRelativePath.split("/")[0],
      });
    } catch (caught) {
      if (!stillCurrent(token)) return;
      publishSets([]);
      setLabel(null);
      setError({ kind: "read", error: caught });
    } finally {
      if (stillCurrent(token)) setPhase("idle");
    }
  }

  async function chooseFolder() {
    setError(null);
    // Soft path first: remembered handle + permission prompt, no OS picker.
    if (await trySoftReconnect()) {
      setFolded(false);
      return;
    }
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
      publishSets([]);
      setLabel(null);
      setError(isPickerBlocked(caught) ? { kind: "blocked" } : { kind: "read", error: caught });
    } finally {
      if (stillCurrent(token)) setPhase("idle");
    }
  }

  chooseImpl.current = () => {
    setFolded(false);
    void chooseFolder();
  };

  softReconnectImpl.current = () => trySoftReconnect();

  useEffect(() => {
    if (!chooseStickRef) return;
    chooseStickRef.current = () => chooseImpl.current();
    return () => {
      chooseStickRef.current = null;
    };
  }, [chooseStickRef]);

  useEffect(() => {
    if (!reconnectStickRef) return;
    reconnectStickRef.current = () => softReconnectImpl.current();
    return () => {
      reconnectStickRef.current = null;
    };
  }, [reconnectStickRef]);

  const locking = busy || phase === "listing" || phase === "reading";
  const pending = locking || phase === "picking";

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
        ? async (report?: StickPrepareReporter) => {
            if (!(await stickPermission(healthRoot, "readwrite", true))) throw new Error("perm");
            await prepareStickForPlayers(healthRoot, new Date(), report);
            report?.({ stage: "done" });
            await refreshHealth({ handle: healthRoot });
          }
        : undefined,
      onRestoreLibrary: healthRoot
        ? async (report?: StickPrepareReporter) => {
            if (!(await stickPermission(healthRoot, "readwrite", true))) throw new Error("perm");
            await restorePlayerLibrary(healthRoot, report);
            report?.({ stage: "done" });
            await refreshHealth({ handle: healthRoot });
          }
        : undefined,
      onRepair: healthRoot
        ? async () => {
            await requestStickRepair(healthRoot.name);
            await refreshHealth({ handle: healthRoot });
          }
        : undefined,
      onEject: healthRoot
        ? async () => {
            const name = healthRoot.name;
            // Full release before diskutil — keeps macOS from “Disk Not Ejected Properly”.
            requestPreviewPause();
            setHealthRoot(null);
            setHealth(null);
            refreshRememberedFlag();
            await prepareStickEject();
            await requestStickEject(name);
          }
        : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers recreated; slice is for display only
  }, [health, checkingHealth, healthRoot, onStickStatus]);

  const loaded = Boolean(label);
  const showBody = !loaded || !folded;
  const offerReconnect = rememberedStick && !healthRoot && hadStickThisSession;
  const foldButton = loaded ? (
    <button
      type="button"
      className="btn ghost stick-fold"
      aria-expanded={showBody}
      onClick={() => setFolded((value) => !value)}
    >
      {t(showBody ? "library.stick.fold" : "library.stick.unfold")}
    </button>
  ) : null;
  // When health already sits in the header, keep pick/fold quiet (ghost) so
  // Prepare / Eject stays the only solid CTA.
  const choosePrimary = !health;
  const chooseActions = (
    <>
      <button
        type="button"
        className={(choosePrimary ? "btn" : "btn ghost") + (pending ? " is-busy" : "")}
        disabled={pending}
        onClick={() => void chooseFolder()}
      >
        {locking
          ? t("library.stick.reading")
          : offerReconnect
            ? t("library.stick.reconnect")
            : health
              ? t("library.stick.change")
              : t("library.stick.choose")}
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
      {/* During picking: Cancel only — Folder/export.pdb crush the title into "Rekordbo…". */}
      {phase === "picking" ? (
        <button type="button" className="btn ghost" onClick={cancelLoad}>
          {t("library.stick.cancel")}
        </button>
      ) : (
        <>
          {error?.kind === "blocked" ? (
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
          {foldButton}
        </>
      )}
    </>
  );

  return (
    <div className="rekordbox-stick-nested builder-stack">
      <div
        className={
          "library-source-pane stick-import-pane builder-card" +
          (loaded && folded ? " is-folded" : "")
        }
        role="tabpanel"
      >
        <div
          className={
            "library-browser-head stick-import-head" +
            (health ? " has-status" : "") +
            (live ? " has-live" : "")
          }
        >
          <h3 className="library-browser-title">
            <span className="library-browser-heading">{t("library.stick.title")}</span>
          </h3>
          {live ? (
            <p className="stick-head-live" role="status">
              <span className="stick-strip-dot" aria-hidden="true" />
              <span className="stick-head-live-text">
                {live.text}
                <span className="stick-head-live-hint">{live.hint}</span>
              </span>
            </p>
          ) : null}
          {health ? (
            <StickHealthCard
              placement="header"
              health={health}
              checking={checkingHealth}
              canFix={Boolean(healthRoot)}
              deprioritizeEject
              onRecheck={() => void refreshHealth()}
              onPrepare={
                healthRoot
                  ? async (report?: StickPrepareReporter) => {
                      if (!(await stickPermission(healthRoot, "readwrite", true))) {
                        throw new Error("perm");
                      }
                      await prepareStickForPlayers(healthRoot, new Date(), report);
                      report?.({ stage: "done" });
                      await refreshHealth({ handle: healthRoot });
                    }
                  : undefined
              }
              onRestoreLibrary={
                healthRoot
                  ? async (report?: StickPrepareReporter) => {
                      if (!(await stickPermission(healthRoot, "readwrite", true))) {
                        throw new Error("perm");
                      }
                      await restorePlayerLibrary(healthRoot, report);
                      report?.({ stage: "done" });
                      await refreshHealth({ handle: healthRoot });
                    }
                  : undefined
              }
              onRepair={
                healthRoot
                  ? async () => {
                      await requestStickRepair(healthRoot.name);
                      await refreshHealth({ handle: healthRoot });
                    }
                  : undefined
              }
              onEject={
                healthRoot
                  ? async () => {
                      const name = healthRoot.name;
                      requestPreviewPause();
                      setHealthRoot(null);
                      setHealth(null);
                      refreshRememberedFlag();
                      await prepareStickEject();
                      await requestStickEject(name);
                    }
                  : undefined
              }
              trailing={chooseActions}
            />
          ) : (
            <div className="stick-actions">{chooseActions}</div>
          )}
        </div>
        {showBody ? (
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
            <FieldNoticeView notice={live ? null : notice} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
