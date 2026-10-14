"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/react";
import type { MessageKey } from "@/lib/i18n/core";
import type { StickHealth, StickHealthVerdict } from "@/lib/stick-health";

const VERDICT: Record<StickHealthVerdict, MessageKey> = {
  ready: "library.stickHealth.verdict.ready",
  needsRekordbox: "library.stickHealth.verdict.needsRekordbox",
  hiddenFolder: "library.stickHealth.verdict.hiddenFolder",
  empty: "library.stickHealth.verdict.empty",
  broken: "library.stickHealth.verdict.broken",
  incomplete: "library.stickHealth.verdict.incomplete",
};

const ADVICE: Record<StickHealthVerdict, MessageKey> = {
  ready: "library.stickHealth.advice.ready",
  needsRekordbox: "library.stickHealth.advice.needsRekordbox",
  hiddenFolder: "library.stickHealth.advice.hiddenFolder",
  empty: "library.stickHealth.advice.empty",
  broken: "library.stickHealth.advice.broken",
  incomplete: "library.stickHealth.advice.incomplete",
};

function pioneerLabel(pioneer: StickHealth["pioneer"], t: (key: MessageKey) => string) {
  if (pioneer === "none") return t("library.stickHealth.pioneer.none");
  if (pioneer === "both") return t("library.stickHealth.pioneer.both");
  return pioneer;
}

function adviceKey(health: StickHealth): MessageKey {
  if (health.libraryAside) return "library.stickHealth.fix.aside";
  if (health.verdict === "ready" && health.libraryDb.synced) {
    return "library.stickHealth.advice.readyAfterRekordbox";
  }
  return ADVICE[health.verdict];
}

/** Whether a Pioneer player is likely to find playlists on this stick. */
export function StickHealthCard({
  health,
  onRecheck,
  checking,
  onPrepare,
  onRestoreLibrary,
  onEject,
  canFix,
}: {
  health: StickHealth;
  onRecheck?: () => void | Promise<void>;
  checking?: boolean;
  onPrepare?: () => void | Promise<void>;
  onRestoreLibrary?: () => void | Promise<void>;
  onEject?: () => void | Promise<void>;
  canFix?: boolean;
}) {
  const { t } = useI18n();
  const alert = health.verdict !== "ready" || health.libraryDb.stale;
  const flag = (ok: boolean) => (ok ? "is-ok" : "is-bad");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);
  const [busyFix, setBusyFix] = useState<"prepare" | "restore" | "eject" | null>(null);
  const [note, setNote] = useState<MessageKey | null>(null);
  const showFix =
    health.verdict === "needsRekordbox" ||
    health.libraryDb.present ||
    health.libraryAside ||
    Boolean(onPrepare || onEject);

  useEffect(() => {
    let ignore = false;
    void fetch("/api/desktop/rekordbox")
      .then((response) => (response.ok ? response.json() : { available: false }))
      .then((body: { available?: boolean }) => {
        if (!ignore) setAvailable(Boolean(body.available));
      })
      .catch(() => {
        if (!ignore) setAvailable(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function openRekordbox() {
    setOpening(true);
    setNote(null);
    try {
      const response = await fetch("/api/desktop/rekordbox", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { opened?: boolean };
      setNote(
        response.ok && body.opened
          ? "library.stickHealth.advice.readyAfterRekordbox"
          : available === false
            ? "library.stickHealth.prepare.missing"
            : "library.stickHealth.prepare.failed",
      );
    } catch {
      setNote("library.stickHealth.prepare.failed");
    } finally {
      setOpening(false);
    }
  }

  async function run(kind: "prepare" | "restore" | "eject", action?: () => void | Promise<void>) {
    if (!action) return;
    if (kind === "prepare" && !window.confirm(t("library.stickHealth.fix.confirm"))) return;
    setBusyFix(kind);
    setNote(null);
    try {
      await action();
      setNote(
        kind === "eject"
          ? "library.stickHealth.fix.ejected"
          : kind === "prepare"
            ? "library.stickHealth.fix.done"
            : "library.stickHealth.fix.aside",
      );
    } catch {
      setNote(kind === "eject" ? "library.stickHealth.fix.ejectFailed" : "library.stickHealth.fix.needFolder");
    } finally {
      setBusyFix(null);
    }
  }

  return (
    <section
      className={`stick-health is-${health.verdict}`}
      aria-label={t("library.stickHealth.title")}
      role={alert ? "alert" : "status"}
    >
      <header className="stick-health-head">
        <div>
          <span className="stick-health-kicker">{t("library.stickHealth.title")}</span>
          <strong>{t(VERDICT[health.verdict])}</strong>
        </div>
        {onRecheck ? (
          <button type="button" className="btn ghost" onClick={() => void onRecheck()} disabled={checking}>
            {checking ? t("library.loading") : t("library.stickHealth.recheck")}
          </button>
        ) : null}
      </header>
      <p className="stick-health-advice">{t(adviceKey(health))}</p>
      {showFix ? (
        <div className="stick-health-prepare">
          <strong>{t("library.stickHealth.fix.title")}</strong>
          <p className="stick-health-prepare-note">{t("library.stickHealth.fix.body")}</p>
          <div className="stick-health-prepare-actions">
            {health.libraryDb.present && onPrepare ? (
              <button
                type="button"
                className="btn"
                disabled={busyFix !== null || !canFix}
                onClick={() => void run("prepare", onPrepare)}
              >
                {busyFix === "prepare"
                  ? t("library.stickHealth.fix.preparing")
                  : t("library.stickHealth.fix.prepare")}
              </button>
            ) : null}
            {health.libraryAside && onRestoreLibrary ? (
              <button
                type="button"
                className="btn ghost"
                disabled={busyFix !== null || !canFix}
                onClick={() => void run("restore", onRestoreLibrary)}
              >
                {t("library.stickHealth.fix.restore")}
              </button>
            ) : null}
            {onEject ? (
              <button
                type="button"
                className="btn"
                disabled={busyFix !== null}
                onClick={() => void run("eject", onEject)}
              >
                {busyFix === "eject"
                  ? t("library.stickHealth.fix.ejecting")
                  : t("library.stickHealth.fix.eject")}
              </button>
            ) : null}
            {available ? (
              <button
                type="button"
                className="btn ghost"
                disabled={opening}
                onClick={() => void openRekordbox()}
              >
                {opening
                  ? t("library.stickHealth.prepare.opening")
                  : t("library.stickHealth.prepare.open")}
              </button>
            ) : null}
          </div>
          {!canFix && (onPrepare || onRestoreLibrary) ? (
            <p className="stick-health-prepare-note">{t("library.stickHealth.fix.needFolder")}</p>
          ) : null}
          {note ? <p className="stick-health-prepare-note">{t(note)}</p> : null}
        </div>
      ) : null}
      <ul className="stick-health-list">
        <li className={flag(health.pioneer !== "none")}>
          {t("library.stickHealth.pioneer", { name: pioneerLabel(health.pioneer, t) })}
        </li>
        <li className={flag(health.pdb.present && !health.pdb.error)}>
          {health.pdb.present && !health.pdb.error
            ? t("library.stickHealth.pdbOk", {
                tracks: health.pdb.tracks,
                playlists: health.pdb.playlists,
              })
            : t("library.stickHealth.pdbFail")}
        </li>
        <li className={health.libraryAside ? "is-ok" : health.libraryDb.synced ? "is-ok" : health.libraryDb.present ? "is-warn" : "is-ok"}>
          {health.libraryAside
            ? t("library.stickHealth.fix.aside")
            : health.libraryDb.present
              ? t("library.stickHealth.libraryYes")
              : t("library.stickHealth.libraryNo")}
        </li>
        {health.libraryDb.stale ? (
          <li className="is-warn">{t("library.stickHealth.libraryStale")}</li>
        ) : null}
        <li className={health.analysis ? "is-ok" : "is-mute"}>
          {t("library.stickHealth.analysis")}:{" "}
          {t(health.analysis ? "library.stickHealth.present" : "library.stickHealth.missing")}
        </li>
        <li className={health.sidecar ? "is-ok" : "is-mute"}>
          {t("library.stickHealth.sidecar")}:{" "}
          {t(health.sidecar ? "library.stickHealth.present" : "library.stickHealth.missing")}
        </li>
        <li className={health.pdb.setform.length ? "is-ok" : "is-mute"}>
          {health.pdb.setform.length
            ? t("library.stickHealth.setform", { names: health.pdb.setform.slice(0, 4).join(" · ") })
            : t("library.stickHealth.setformNone")}
        </li>
      </ul>
    </section>
  );
}
