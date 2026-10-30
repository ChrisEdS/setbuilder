"use client";

import { useEffect, useRef, useState } from "react";
import { StickHealthCard } from "@/components/StickHealthCard";
import { errorText } from "@/lib/i18n/error";
import { useI18n } from "@/lib/i18n/react";
import { inspectStick, type StickHealth } from "@/lib/stick-health";
import {
  planStickWrite,
  prepareStickForPlayers,
  restoreLatestBackup,
  restorePlayerLibrary,
  rewriteSetToStick,
  writeSetToStick,
  writeStickSidecars,
  type DirLike,
  type StickPlan,
  type StickWriteDone,
} from "@/lib/rekordbox-stick-write";
import type { SetDraft, SetTrack } from "@/lib/set";
import { requestPreviewPause } from "@/lib/preview-transport";
import {
  loadPersistedStickHandle,
  pickAndRememberStick,
  prepareStickEject,
  requestStickEject,
  requestStickRepair,
  stickPermission,
  stickPicker,
} from "@/lib/stick-session";

type Step =
  | { kind: "idle" }
  | { kind: "busy"; label: "reading" | "writing" | "restoring" }
  | { kind: "planned"; plan: StickPlan }
  | { kind: "done"; result: StickWriteDone; sidecars: string[] }
  | { kind: "restored"; backup: string }
  | { kind: "error"; text: string };

function withHints(tracks: SetTrack[], hints: Record<string, number>) {
  return tracks.map((track) => ({ ...track, stickId: hints[track.id] }));
}

/** Writes the set into the database of a rekordbox stick. Asks, shows what will happen, then does it. */
export function StickWriteDialog({
  open,
  onClose,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  draft: SetDraft;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<DirLike | null>(null);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [canPick, setCanPick] = useState(true);
  const [hints, setHints] = useState<Record<string, number>>({});
  const [health, setHealth] = useState<StickHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [ejecting, setEjecting] = useState(false);
  const [ejected, setEjected] = useState(false);
  const [ejectFailed, setEjectFailed] = useState(false);

  async function refreshHealth(handle = root.current) {
    if (!handle) return;
    setCheckingHealth(true);
    try {
      setHealth(await inspectStick(handle));
    } catch {
      setHealth(null);
    } finally {
      setCheckingHealth(false);
    }
  }

  async function ejectStick() {
    const name = root.current?.name;
    if (!name || ejecting) return;
    setEjecting(true);
    setEjectFailed(false);
    try {
      // Stop preview + drop every FSA/File ref before diskutil (avoids force-unmount).
      requestPreviewPause();
      root.current = null;
      setHealth(null);
      await prepareStickEject();
      await requestStickEject(name);
      setEjected(true);
    } catch {
      setEjectFailed(true);
    } finally {
      setEjecting(false);
    }
  }

  const tracks = draft.tracks;
  const title = draft.title;
  const altLabel = t("exports.pdf.alternatives");

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      setStep({ kind: "idle" });
      setHints({});
      setHealth(null);
      setEjecting(false);
      setEjected(false);
      setEjectFailed(false);
      root.current = null;
      setCanPick(stickPicker() !== null);
      node.showModal();
      void (async () => {
        const handle = await loadPersistedStickHandle();
        if (!handle || !(await stickPermission(handle, "readwrite", false))) return;
        root.current = handle;
        setStep({ kind: "busy", label: "reading" });
        try {
          const checked = inspectStick(handle).catch(() => null);
          setStep({
            kind: "planned",
            plan: await planStickWrite(handle, withHints(tracks, {}), title, altLabel),
          });
          setHealth(await checked);
        } catch (error) {
          setStep({ kind: "error", text: errorText(error, t) });
          await refreshHealth(handle);
        }
      })();
    }
    if (!open && node.open) node.close();
    // Only when the dialog opens. tracks/title are read from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function planFrom(handle: DirLike, nextHints = hints) {
    root.current = handle;
    setStep({ kind: "busy", label: "reading" });
    try {
      const checked = inspectStick(handle).catch(() => null);
      setStep({
        kind: "planned",
        plan: await planStickWrite(handle, withHints(tracks, nextHints), title, altLabel),
      });
      setHealth(await checked);
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
      await refreshHealth(handle);
    }
  }

  async function choose() {
    try {
      const handle = await pickAndRememberStick();
      if (!handle) return;
      await planFrom(handle);
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
    }
  }

  async function finishWrite(writer: typeof writeSetToStick) {
    if (!root.current) return;
    setStep({ kind: "busy", label: "writing" });
    try {
      const result = await writer(
        root.current,
        withHints(tracks, hints),
        title,
        new Date(),
        altLabel,
      );
      const sidecars = await writeStickSidecars(root.current, draft, t).catch(() => []);
      setStep({ kind: "done", result, sidecars });
      await refreshHealth(root.current);
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
    }
  }

  async function restore() {
    if (!root.current) return;
    if (!window.confirm(t("library.stickWrite.restoreConfirm"))) return;
    setStep({ kind: "busy", label: "restoring" });
    try {
      setStep({ kind: "restored", backup: await restoreLatestBackup(root.current) });
      await refreshHealth(root.current);
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
    }
  }

  async function rewrite() {
    if (!window.confirm(t("library.stickWrite.rewriteConfirm"))) return;
    await finishWrite(rewriteSetToStick);
  }

  const busy = step.kind === "busy";
  const plan = step.kind === "planned" ? step.plan : null;
  const missing = plan?.match.missing ?? [];
  const suggestions = plan?.suggestions ?? [];
  const leftOut = missing.filter(
    (track) =>
      !suggestions.some(
        (item) =>
          item.track.name === track.name &&
          item.track.artists.join() === track.artists.join(),
      ),
  );
  /** Playlist already on stick + green health → leave to player; Update is optional. */
  const readyToLeave = Boolean(plan?.alreadyOnStick && health?.verdict === "ready");
  const healthHandlers = {
    onRecheck: () => void refreshHealth(),
    onPrepare: async (report) => {
      if (!root.current) throw new Error("folder");
      await prepareStickForPlayers(root.current, new Date(), report);
      report?.({ stage: "done" });
      await refreshHealth(root.current);
    },
    onRestoreLibrary: async (report) => {
      if (!root.current) throw new Error("folder");
      await restorePlayerLibrary(root.current, report);
      report?.({ stage: "done" });
      await refreshHealth(root.current);
    },
    onRepair: async () => {
      const name = root.current?.name;
      if (!name) throw new Error("folder");
      await requestStickRepair(name);
      await refreshHealth();
    },
    onEject: ejectStick,
  };

  return (
    <dialog
      ref={dialog}
      className="stick-dialog"
      aria-labelledby="stick-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy || ejecting) event.preventDefault();
      }}
    >
      <h2 id="stick-dialog-title">{t("library.stickWrite.title")}</h2>

      {!canPick ? <p className="stick-warn">{t("library.stickWrite.unsupported")}</p> : null}

      {step.kind === "idle" || step.kind === "error" ? (
        <>
          <p className="modal-status">{t("library.stickWrite.intro")}</p>
          <p className="modal-next">{t("library.stickWrite.introNext")}</p>
          <p className="modal-info">{t("library.stickWrite.introInfo")}</p>
          <details className="stick-safety-fold">
            <summary>{t("library.stickWrite.safetyMore")}</summary>
            <p className="stick-safety modal-info">{t("library.stickWrite.safetyDetails")}</p>
          </details>
          {step.kind === "error" ? (
            <p className="stick-warn" role="alert">
              {step.text}
            </p>
          ) : null}
          <p className="modal-info stick-hint">{t("library.stickWrite.chooseHint")}</p>
          <div className="stick-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              {t("library.stickWrite.close")}
            </button>
            <button type="button" className="btn" onClick={() => void choose()} disabled={!canPick}>
              {t("library.stickWrite.choose")}
            </button>
          </div>
        </>
      ) : null}

      {busy ? (
        <p className="modal-status" role="status">
          {t(`library.stickWrite.busy.${step.label}`)}
        </p>
      ) : null}

      {plan ? (
        <>
          <div className="stick-write-copy">
            <p className="modal-status stick-write-status">
              {missing.length
                ? t("library.stickWrite.found", {
                    found: plan.match.matched.length,
                    total: plan.match.matched.length + missing.length,
                  })
                : t("library.stickWrite.allFound", { total: plan.match.matched.length })}
            </p>
            {suggestions.length ? (
              <div className="stick-missing">
                <strong>{t("library.stickWrite.suggestTitle")}</strong>
                <ul>
                  {suggestions.map((item) => {
                    const setLabel = [
                      item.track.artists.filter((name) => name && name !== "Unknown").join(", "),
                      item.track.name,
                    ]
                      .filter(Boolean)
                      .join(" – ");
                    return (
                      <li key={(item.track as SetTrack).id ?? item.track.name}>
                        <span>{setLabel}</span>
                        {item.candidates.map((candidate) => {
                          const stickLabel = [candidate.artist, candidate.title]
                            .filter(Boolean)
                            .join(" – ");
                          const sameLabel =
                            stickLabel.replace(/\s+/g, " ").trim().toLowerCase() ===
                            setLabel.replace(/\s+/g, " ").trim().toLowerCase();
                          return (
                            <button
                              key={candidate.id}
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                const id = (item.track as SetTrack).id;
                                if (!id || !root.current) return;
                                const next = { ...hints, [id]: candidate.id };
                                setHints(next);
                                void planFrom(root.current, next);
                              }}
                            >
                              {sameLabel || item.candidates.length === 1
                                ? t("library.stickWrite.suggestUse")
                                : `${t("library.stickWrite.suggestUse")}: ${stickLabel}`}
                            </button>
                          );
                        })}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {leftOut.length ? (
              <div className="stick-missing">
                <strong>{t("library.stickWrite.missingTitle")}</strong>
                <ul>
                  {leftOut.slice(0, 6).map((track, index) => (
                    <li key={`${track.name}-${index}`}>
                      {track.artists.filter((name) => name && name !== "Unknown").join(", ")}
                      {track.artists.length ? " – " : ""}
                      {track.name}
                    </li>
                  ))}
                </ul>
                {leftOut.length > 6 ? (
                  <span>{t("library.stickWrite.missingMore", { count: leftOut.length - 6 })}</span>
                ) : null}
              </div>
            ) : null}
            {plan.refusal ? (
              <>
                <p className="stick-warn" role="alert">
                  {t("library.stickWrite.refused", { reason: errorText(plan.refusal, t) })}
                </p>
                <p className="modal-info stick-hint">{t("library.stickWrite.healHint")}</p>
              </>
            ) : plan.alreadyOnStick ? (
              <>
                <p className="modal-status stick-write-status">
                  {t("library.stickWrite.alreadyThere", { name: plan.playlistName })}
                </p>
                {ejected ? (
                  <p className="modal-next stick-write-next" role="status">
                    {t("library.stickWrite.ejected")}
                  </p>
                ) : readyToLeave ? (
                  <p className="modal-next stick-write-next">{t("library.stickWrite.nextReady")}</p>
                ) : null}
                {!ejected ? (
                  <p className="modal-info stick-hint">{t("library.stickWrite.rewriteHint")}</p>
                ) : null}
              </>
            ) : plan.skippedPerformance && plan.alternativesName ? (
              <p className="modal-next stick-write-next">
                {t("library.stickWrite.willAddAltsOnly", {
                  name: plan.playlistName,
                  alts: plan.alternativesName,
                })}
              </p>
            ) : plan.performanceCount || plan.alternativesCount ? (
              <p className="modal-next stick-write-next">
                {plan.performanceCount
                  ? t("library.stickWrite.willWrite", {
                      name: plan.playlistName,
                      count: plan.performanceCount,
                    })
                  : ""}
                {plan.alternativesName
                  ? ` ${t("library.stickWrite.willWriteAlts", { name: plan.alternativesName })}`
                  : ""}
              </p>
            ) : (
              <p className="stick-warn">{t("library.stickWrite.noneFound")}</p>
            )}
          </div>
          {health && !ejected ? (
            <StickHealthCard
              health={health}
              checking={checkingHealth}
              canFix
              // Never lead with Eject while planning/writing — only the footer after write.
              deprioritizeEject
              deferPrimaryAction={readyToLeave}
              {...healthHandlers}
            />
          ) : plan.hasLibraryDb && !ejected ? (
            <p className="modal-info stick-hint">{t("library.stickWrite.oneLibrary")}</p>
          ) : null}
          {ejectFailed ? (
            <p className="stick-warn" role="alert">
              {t("library.stickWrite.ejectFailed")}
            </p>
          ) : null}
          {!ejected ? (
            <details className="stick-safety-fold">
              <summary>{t("library.stickWrite.safetyMore")}</summary>
              <p className="stick-safety">{t("library.stickWrite.safetyDetails")}</p>
            </details>
          ) : null}
          <div className="stick-actions">
            {ejected ? (
              <button type="button" className="btn" onClick={onClose}>
                {t("library.stickWrite.close")}
              </button>
            ) : (
              <>
                <button type="button" className="btn ghost" onClick={onClose} disabled={ejecting}>
                  {t("library.stickWrite.cancel")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void restore()}
                  disabled={ejecting}
                >
                  {t("library.stickWrite.restore")}
                </button>
                {readyToLeave ? (
                  <>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => void rewrite()}
                      disabled={ejecting}
                    >
                      {t("library.stickWrite.rewrite")}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void ejectStick()}
                      disabled={ejecting}
                    >
                      {ejecting
                        ? t("library.stickWrite.ejecting")
                        : t("library.stickWrite.eject")}
                    </button>
                  </>
                ) : plan.alreadyOnStick ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void rewrite()}
                    disabled={ejecting}
                  >
                    {t("library.stickWrite.rewrite")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void finishWrite(writeSetToStick)}
                    disabled={
                      ejecting ||
                      Boolean(plan.refusal) ||
                      (!plan.performanceCount && !plan.alternativesCount)
                    }
                  >
                    {t("library.stickWrite.write")}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      ) : null}

      {step.kind === "done" ? (
        <>
          <div className="stick-write-done" role="status">
            <strong className="modal-status-title stick-write-status-title">
              {t("library.stickWrite.doneTitle")}
            </strong>
            <p className="modal-status stick-write-status">
              {t("library.stickWrite.done", {
                name: step.result.playlistName,
                count: step.result.trackCount,
              })}
              {step.result.alternativesName
                ? ` ${t("library.stickWrite.doneAlts", { name: step.result.alternativesName })}`
                : ""}
            </p>
            <p className="modal-next stick-write-next">
              {ejected ? t("library.stickWrite.ejected") : t("library.stickWrite.doneNext")}
            </p>
            <p className="modal-info stick-hint">
              {t("library.stickWrite.doneBackup", { backup: step.result.backupName })}
            </p>
            {step.sidecars.length ? (
              <p className="modal-info stick-hint">
                {t("library.stickWrite.sidecar", { files: step.sidecars.join(", ") })}
              </p>
            ) : null}
          </div>
          {health && !ejected ? (
            <StickHealthCard
              health={health}
              checking={checkingHealth}
              canFix
              afterWrite
              deferPrimaryAction
              {...healthHandlers}
            />
          ) : null}
          {ejectFailed ? (
            <p className="stick-warn" role="alert">
              {t("library.stickWrite.ejectFailed")}
            </p>
          ) : null}
          <div className="stick-actions">
            {ejected ? (
              <button type="button" className="btn" onClick={onClose}>
                {t("library.stickWrite.close")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void restore()}
                  disabled={ejecting}
                >
                  {t("library.stickWrite.restore")}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onClose}
                  disabled={ejecting}
                >
                  {t("library.stickWrite.close")}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void ejectStick()}
                  disabled={ejecting}
                >
                  {ejecting
                    ? t("library.stickWrite.ejecting")
                    : t("library.stickWrite.eject")}
                </button>
              </>
            )}
          </div>
        </>
      ) : null}

      {step.kind === "restored" ? (
        <>
          <p className="modal-status" role="status">
            {t("library.stickWrite.restoreDone", { backup: step.backup })}
          </p>
          <p className="modal-next">{t("library.stickWrite.restoreNext")}</p>
          <div className="stick-actions">
            <button type="button" className="btn" onClick={onClose}>
              {t("library.stickWrite.close")}
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}
