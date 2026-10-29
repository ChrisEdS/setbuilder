"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Tip } from "@/components/Hint";
import { useI18n } from "@/lib/i18n/react";
import type { MessageKey, Translate } from "@/lib/i18n/core";
import {
  primaryStickAction,
  secondaryStickActions,
  type StickAction,
  type StickHealth,
} from "@/lib/stick-health";

type Tone = "ok" | "warn" | "bad" | "mute";

/** The one sentence a DJ reads: what the stick does in the player right now. */
function verdictKey(health: StickHealth, canPrepare: boolean): MessageKey {
  switch (health.verdict) {
    case "ready":
      if (health.libraryAside) return "library.stickHealth.verdict.readyAside";
      if (health.libraryDb.synced) return "library.stickHealth.verdict.readySynced";
      return "library.stickHealth.verdict.ready";
    case "needsRekordbox":
      return canPrepare
        ? "library.stickHealth.verdict.needsRekordbox"
        : "library.stickHealth.verdict.needsRekordboxFiles";
    case "hiddenFolder":
      return "library.stickHealth.verdict.hiddenFolder";
    case "empty":
      return "library.stickHealth.verdict.empty";
    case "broken":
      return "library.stickHealth.verdict.broken";
    case "incomplete":
      return "library.stickHealth.verdict.incomplete";
  }
}

function meaningKey(health: StickHealth, canPrepare: boolean): MessageKey {
  switch (health.verdict) {
    case "ready":
      if (health.libraryAside) {
        return health.pioneer === ".PIONEER"
          ? "library.stickHealth.meaning.readyAsideHidden"
          : "library.stickHealth.meaning.readyAside";
      }
      if (health.libraryDb.synced) return "library.stickHealth.meaning.readySynced";
      return "library.stickHealth.meaning.ready";
    case "needsRekordbox":
      return canPrepare
        ? "library.stickHealth.meaning.needsRekordbox"
        : "library.stickHealth.meaning.needsRekordboxFiles";
    case "hiddenFolder":
      return "library.stickHealth.meaning.hiddenFolder";
    case "empty":
      return "library.stickHealth.meaning.empty";
    case "broken":
      return "library.stickHealth.meaning.broken";
    case "incomplete":
      return "library.stickHealth.meaning.incomplete";
  }
}

function nextKey(action: StickAction): MessageKey {
  switch (action) {
    case "eject":
      return "library.stickHealth.next.eject";
    case "prepare":
      return "library.stickHealth.next.prepare";
    case "openRekordbox":
      return "library.stickHealth.next.openRekordbox";
  }
}

function verdictTone(health: StickHealth): Tone {
  switch (health.verdict) {
    case "ready":
      return "ok";
    case "broken":
      return "bad";
    case "empty":
      return "mute";
    default:
      return "warn";
  }
}

type Fact = { id: string; tone: Tone; label: string; value: string };

function folderFact(health: StickHealth, t: Translate): Fact {
  if (health.pioneer === "none") {
    return {
      id: "folder",
      tone: "warn",
      label: t("library.stickHealth.fact.folder"),
      value: t("library.stickHealth.fact.folderNone"),
    };
  }
  if (health.pioneer === "both") {
    return {
      id: "folder",
      tone: "ok",
      label: t("library.stickHealth.fact.folder"),
      value: t("library.stickHealth.fact.folderBoth"),
    };
  }
  if (health.pioneer === ".PIONEER") {
    return {
      id: "folder",
      tone: health.libraryAside || health.verdict === "ready" ? "ok" : "warn",
      label: t("library.stickHealth.fact.folder"),
      value: t("library.stickHealth.fact.folderHidden"),
    };
  }
  return {
    id: "folder",
    tone: "ok",
    label: t("library.stickHealth.fact.folder"),
    value: t("library.stickHealth.fact.folderPlain"),
  };
}

/** Facts a DJ can act on. Problems first; the file-system trivia last. */
function facts(health: StickHealth, t: Translate): Fact[] {
  const list: Fact[] = [folderFact(health, t)];

  const dbOk = health.pdb.present && !health.pdb.error;
  list.push({
    id: "db",
    tone: !dbOk ? "bad" : health.pdb.playlists === 0 ? "warn" : "ok",
    label: t("library.stickHealth.fact.db"),
    value: !dbOk
      ? t("library.stickHealth.fact.dbFail")
      : health.pdb.playlists === 0
        ? t("library.stickHealth.fact.dbEmpty", { tracks: health.pdb.tracks })
        : t("library.stickHealth.fact.dbOk", {
            tracks: health.pdb.tracks,
            playlists: health.pdb.playlists,
          }),
  });

  const library = health.libraryAside
    ? { tone: "ok" as const, key: "library.stickHealth.fact.libraryAside" as const }
    : !health.libraryDb.present
      ? { tone: "ok" as const, key: "library.stickHealth.fact.libraryNone" as const }
      : health.libraryDb.synced
        ? { tone: "ok" as const, key: "library.stickHealth.fact.librarySynced" as const }
        : { tone: "warn" as const, key: "library.stickHealth.fact.libraryStale" as const };
  list.push({
    id: "library",
    tone: library.tone,
    label: t("library.stickHealth.fact.library"),
    value: t(library.key),
  });

  list.push({
    id: "setform",
    tone: health.pdb.setform.length ? "ok" : "mute",
    label: t("library.stickHealth.fact.setform"),
    value: health.pdb.setform.length
      ? health.pdb.setform.slice(0, 4).join(" · ")
      : t("library.stickHealth.fact.setformNone"),
  });

  const rank: Record<Tone, number> = { bad: 0, warn: 1, ok: 2, mute: 3 };
  list.sort((a, b) => rank[a.tone] - rank[b.tone]);

  const word = (ok: boolean) => t(ok ? "library.stickHealth.present" : "library.stickHealth.missing");
  list.push({
    id: "tech",
    tone: "mute",
    label: t("library.stickHealth.fact.tech"),
    value: t("library.stickHealth.fact.techLine", {
      analysis: word(health.analysis),
      sidecar: word(health.sidecar),
    }),
  });
  return list;
}

type Busy = StickAction | "restore" | "repair" | null;

export function StickHealthCard({
  health,
  onRecheck,
  checking,
  onPrepare,
  onRestoreLibrary,
  onEject,
  onRepair,
  canFix,
  deprioritizeEject,
  /** After a successful stick write: lead with eject, not the generic ready line. */
  afterWrite = false,
  /**
   * Parent dialog owns the primary CTA (e.g. write-dialog footer Eject).
   * Strip keeps status, repair, and details — no competing primary / “Next:” line.
   */
  deferPrimaryAction = false,
  placement = "card",
  trailing,
}: {
  health: StickHealth;
  onRecheck?: () => void | Promise<void>;
  checking?: boolean;
  onPrepare?: () => void | Promise<void>;
  onRestoreLibrary?: () => void | Promise<void>;
  onEject?: () => void | Promise<void>;
  /** Clears dirty FAT (CDJ read-only) while the stick is still on the Mac. */
  onRepair?: () => void | Promise<void>;
  /** We hold the whole stick, not just a file list — prepare and restore can write. */
  canFix?: boolean;
  /** Stick-Status after import: eject stays available but not as the main action. */
  deprioritizeEject?: boolean;
  afterWrite?: boolean;
  deferPrimaryAction?: boolean;
  /** `header` sits in the Rekordbox-stick bar: verdict in the middle, actions on the right. */
  placement?: "card" | "header";
  trailing?: ReactNode;
}) {
  const { t } = useI18n();
  const detailsId = useId();
  const [rekordbox, setRekordbox] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<MessageKey | null>(null);
  const [noteOk, setNoteOk] = useState(false);
  /** After a successful eject — override the green “ready” strip so unplug is obvious. */
  const [ejected, setEjected] = useState(false);
  // null = follow verdict (warn/bad open); after the DJ toggles, keep their choice
  // until the verdict changes.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const [seenVerdict, setSeenVerdict] = useState(health.verdict);
  if (health.verdict !== seenVerdict) {
    setSeenVerdict(health.verdict);
    setUserOpen(null);
    setEjected(false);
  }
  const open =
    userOpen ??
    ((!ejected && health.verdict !== "ready" && health.verdict !== "empty") || ejected);

  useEffect(() => {
    let ignore = false;
    void fetch("/api/desktop/rekordbox")
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((body: { available?: boolean }) => {
        if (!ignore) setRekordbox(Boolean(body.available));
      })
      .catch(() => {
        if (!ignore) setRekordbox(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const caps = {
    canPrepare: Boolean(canFix && onPrepare && health.libraryDb.present),
    canEject: Boolean(onEject),
    canOpenRekordbox: rekordbox,
    canRestore: Boolean(canFix && onRestoreLibrary),
  };
  const actionOpts = deprioritizeEject && !afterWrite
    ? { deprioritizeEject: true as const }
    : undefined;
  // Eject-failed always keeps repair as the strip primary, even when the parent
  // normally owns the CTA — the DJ must not unplug until repair/retry.
  const ejectFailed = note === "library.stickHealth.fix.ejectFailed";
  // After write or repair the copy says “eject now” — that CTA must be visible.
  const repairedOk = noteOk && note === "library.stickHealth.fix.repaired";
  const leadWithEject =
    caps.canEject && health.verdict === "ready" && (afterWrite || repairedOk);
  const primary = ejected
    ? null
    : deferPrimaryAction && !ejectFailed
      ? null
      : leadWithEject
        ? ("eject" as const)
        : primaryStickAction(health, caps, actionOpts);
  // Header: keep Eject on the bar when ready (ghost), not only under Details.
  const rowEject =
    placement === "header" &&
    caps.canEject &&
    !ejected &&
    primary !== "eject" &&
    health.verdict === "ready";
  const secondary = ejected
    ? ([] as ReturnType<typeof secondaryStickActions>)
    : secondaryStickActions(health, caps, actionOpts).filter(
        (kind) => kind !== primary && !(kind === "eject" && rowEject),
      );
  const tone = ejected
    ? "mute"
    : ejectFailed
      ? "warn"
      : afterWrite && !ejected
        ? "ok"
        : verdictTone(health);

  async function openRekordbox() {
    const response = await fetch("/api/desktop/rekordbox", { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as { opened?: boolean };
    if (!response.ok || !body.opened) throw new Error("rekordbox");
  }

  async function run(kind: Exclude<Busy, null>) {
    if (busy) return;
    if (kind === "prepare" && !window.confirm(t("library.stickHealth.fix.confirm"))) return;
    setBusy(kind);
    setNote(null);
    setNoteOk(false);
    try {
      if (kind === "prepare") await onPrepare?.();
      else if (kind === "restore") await onRestoreLibrary?.();
      else if (kind === "repair") await onRepair?.();
      else if (kind === "eject") {
        await onEject?.();
        setEjected(true);
        setNoteOk(true);
        setNote(null);
        return;
      } else await openRekordbox();
      setNoteOk(true);
      setNote(
        kind === "prepare"
          ? "library.stickHealth.fix.done"
          : kind === "restore"
            ? "library.stickHealth.fix.restored"
            : kind === "repair"
              ? "library.stickHealth.fix.repaired"
              : "library.stickHealth.prepare.opened",
      );
    } catch {
      setNoteOk(false);
      setNote(
        kind === "eject"
          ? "library.stickHealth.fix.ejectFailed"
          : kind === "repair"
            ? "library.stickHealth.fix.repairFailed"
            : kind === "openRekordbox"
              ? "library.stickHealth.prepare.failed"
              : "library.stickHealth.fix.failed",
      );
    } finally {
      setBusy(null);
    }
  }

  function label(kind: StickAction | "restore" | "repair"): string {
    const working = busy === kind;
    switch (kind) {
      case "prepare":
        return t(working ? "library.stickHealth.fix.preparing" : "library.stickHealth.fix.prepare");
      case "eject":
        return t(working ? "library.stickHealth.fix.ejecting" : "library.stickHealth.fix.eject");
      case "repair":
        return t(working ? "library.stickHealth.fix.repairing" : "library.stickHealth.fix.repair");
      case "openRekordbox":
        return t(working ? "library.stickHealth.prepare.opening" : "library.stickHealth.prepare.open");
      case "restore":
        return t("library.stickHealth.fix.restore");
    }
  }

  function tip(kind: StickAction | "restore" | "repair"): string {
    switch (kind) {
      case "prepare":
        return t("library.stickHealth.tip.prepare");
      case "eject":
        return t("library.stickHealth.tip.eject");
      case "repair":
        return t("library.stickHealth.tip.repair");
      case "openRekordbox":
        return t("library.stickHealth.tip.openRekordbox");
      case "restore":
        return t("library.stickHealth.tip.restore");
    }
  }

  const verdict = ejected
    ? t("library.stickHealth.verdict.ejected")
    : ejectFailed
      ? t("library.stickHealth.verdict.ejectFailed")
      : afterWrite && health.verdict === "ready"
        ? t("library.stickHealth.verdict.writeDone")
        : t(verdictKey(health, caps.canPrepare));
  const followUp = ejected ? (
    <p className="stick-strip-note is-ejected">{t("library.stickHealth.meaning.ejected")}</p>
  ) : ejectFailed ? (
    <p className="stick-strip-note is-bad">{t("library.stickHealth.meaning.ejectFailed")}</p>
  ) : afterWrite && health.verdict === "ready" && !deferPrimaryAction ? (
    <p className="stick-strip-note is-write-done">{t("library.stickHealth.meaning.writeDone")}</p>
  ) : note ? (
    <p className={"stick-strip-note" + (noteOk ? " is-ok" : " is-bad")}>{t(note)}</p>
  ) : primary && !deferPrimaryAction ? (
    <p className="stick-strip-next">{t(nextKey(primary))}</p>
  ) : null;
  const details = open ? (
    <div className="stick-strip-details" id={detailsId}>
          <p className="stick-strip-meaning">{t(meaningKey(health, caps.canPrepare))}</p>
          <dl className="stick-strip-facts">
            {facts(health, t).map((fact) => (
              <div key={fact.id} className={`is-${fact.tone}`}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="stick-strip-why">{t("library.stickHealth.why")}</p>
          <div className="stick-strip-more">
            {onRecheck ? (
              <Tip
                text={t("library.stickHealth.recheckTip")}
                disabled={checking || busy !== null}
              >
                <button
                  type="button"
                  className="btn ghost"
                  disabled={checking || busy !== null}
                  onClick={() => void onRecheck()}
                >
                  {checking ? t("library.loading") : t("library.stickHealth.recheck")}
                </button>
              </Tip>
            ) : null}
            {secondary.map((kind) => (
              <Tip key={kind} text={tip(kind)} disabled={busy !== null} end>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy !== null}
                  onClick={() => void run(kind)}
                >
                  {label(kind)}
                </button>
              </Tip>
            ))}
          </div>
        </div>
      ) : null;

  const showRepair = Boolean(onRepair) && !ejected && (ejectFailed || afterWrite || health.verdict === "ready");
  const actions = (
    <div className={placement === "header" ? "stick-strip-actions stick-actions" : "stick-strip-actions"}>
      {ejected && onRecheck ? (
        <Tip text={t("library.stickHealth.recheckTip")} disabled={checking || busy !== null}>
          <button
            type="button"
            className="btn"
            disabled={checking || busy !== null}
            onClick={() => {
              setEjected(false);
              void onRecheck();
            }}
          >
            {checking ? t("library.loading") : t("library.stickHealth.recheck")}
          </button>
        </Tip>
      ) : null}
      {ejectFailed && onRepair ? (
        <Tip text={tip("repair")} disabled={busy !== null}>
          <button
            type="button"
            className={"btn" + (busy === "repair" ? " is-busy" : "")}
            disabled={busy !== null}
            onClick={() => void run("repair")}
          >
            {label("repair")}
          </button>
        </Tip>
      ) : null}
      {primary ? (
        <Tip text={tip(primary)} disabled={busy !== null}>
          <button
            type="button"
            className={"btn" + (busy === primary ? " is-busy" : "")}
            disabled={busy !== null}
            onClick={() => void run(primary)}
          >
            {label(primary)}
          </button>
        </Tip>
      ) : null}
      {rowEject ? (
        <Tip text={tip("eject")} disabled={busy !== null}>
          <button
            type="button"
            className={"btn ghost" + (busy === "eject" ? " is-busy" : "")}
            disabled={busy !== null}
            onClick={() => void run("eject")}
          >
            {label("eject")}
          </button>
        </Tip>
      ) : null}
      {showRepair && !ejectFailed ? (
        <Tip
          text={tip("repair")}
          disabled={busy !== null}
          end={!trailing && !primary && !rowEject}
        >
          <button
            type="button"
            className={"btn ghost" + (busy === "repair" ? " is-busy" : "")}
            disabled={busy !== null}
            onClick={() => void run("repair")}
          >
            {label("repair")}
          </button>
        </Tip>
      ) : null}
      <Tip
        text={t(open ? "library.stickHealth.lessTip" : "library.stickHealth.detailsTip")}
        end={!trailing}
      >
        <button
          type="button"
          className="btn ghost stick-strip-toggle"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setUserOpen(!open)}
        >
          {t(open ? "library.stickHealth.less" : "library.stickHealth.details")}
        </button>
      </Tip>
      {trailing}
    </div>
  );

  if (placement === "header") {
    return (
      <div className={`stick-head-cluster is-${tone}`}>
        <p className="stick-head-verdict" role={tone === "bad" ? "alert" : "status"}>
          <span className="stick-strip-dot" aria-hidden="true" />
          <span className="stick-strip-verdict">{verdict}</span>
        </p>
        {actions}
        {followUp || details ? (
          <div className="stick-head-more">
            {followUp}
            {details}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={`stick-strip is-${tone}`}
      aria-label={t("library.stickHealth.title")}
      role={tone === "bad" ? "alert" : "status"}
    >
      <div className="stick-strip-row">
        <span className="stick-strip-dot" aria-hidden="true" />
        <div className="stick-strip-copy">
          <span className="stick-strip-verdict">{verdict}</span>
          {followUp}
        </div>
        {actions}
      </div>
      {details}
    </section>
  );
}
