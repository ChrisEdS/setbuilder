"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/i18n/error";
import { useI18n } from "@/lib/i18n/react";
import {
  planStickWrite,
  restoreLatestBackup,
  writeSetToStick,
  type DirLike,
  type StickPlan,
  type StickWriteDone,
} from "@/lib/rekordbox-stick-write";
import type { SetTrack } from "@/lib/set";

type Step =
  | { kind: "idle" }
  | { kind: "busy"; label: "reading" | "writing" | "restoring" }
  | { kind: "planned"; plan: StickPlan }
  | { kind: "done"; result: StickWriteDone }
  | { kind: "restored"; backup: string }
  | { kind: "error"; text: string };

type Picker = (options: { mode: "readwrite" }) => Promise<DirLike>;

function pickerFn(): Picker | null {
  const fn = (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker;
  return typeof fn === "function" ? fn.bind(window) : null;
}

/** Writes the set into the database of a rekordbox stick. Asks, shows what will happen, then does it. */
export function StickWriteDialog({
  open,
  onClose,
  tracks,
  title,
}: {
  open: boolean;
  onClose: () => void;
  tracks: SetTrack[];
  title: string;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<DirLike | null>(null);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [canPick, setCanPick] = useState(true);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      setStep({ kind: "idle" });
      root.current = null;
      setCanPick(pickerFn() !== null);
      node.showModal();
    }
    if (!open && node.open) node.close();
  }, [open]);

  async function choose() {
    const pick = pickerFn();
    if (!pick) return;
    let handle: DirLike;
    try {
      handle = await pick({ mode: "readwrite" });
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return;
      setStep({ kind: "error", text: errorText(error, t) });
      return;
    }
    root.current = handle;
    setStep({ kind: "busy", label: "reading" });
    try {
      setStep({ kind: "planned", plan: await planStickWrite(handle, tracks, title) });
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
    }
  }

  async function write() {
    if (!root.current) return;
    setStep({ kind: "busy", label: "writing" });
    try {
      setStep({ kind: "done", result: await writeSetToStick(root.current, tracks, title) });
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
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
    }
  }

  const busy = step.kind === "busy";
  const plan = step.kind === "planned" ? step.plan : null;
  const missing = plan?.match.missing ?? [];

  return (
    <dialog
      ref={dialog}
      className="stick-dialog"
      aria-labelledby="stick-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <h2 id="stick-dialog-title">{t("library.stickWrite.title")}</h2>

      {!canPick ? <p className="stick-warn">{t("library.stickWrite.unsupported")}</p> : null}

      {step.kind === "idle" || step.kind === "error" ? (
        <>
          <p>{t("library.stickWrite.intro")}</p>
          <p className="stick-safety">{t("library.stickWrite.safety")}</p>
          {step.kind === "error" ? (
            <p className="stick-warn" role="alert">
              {step.text}
            </p>
          ) : null}
          <div className="stick-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              {t("library.stickWrite.close")}
            </button>
            <button type="button" className="btn" onClick={() => void choose()} disabled={!canPick}>
              {t("library.stickWrite.choose")}
            </button>
          </div>
          <p className="stick-hint">{t("library.stickWrite.chooseHint")}</p>
        </>
      ) : null}

      {busy ? (
        <p role="status">{t(`library.stickWrite.busy.${step.label}`)}</p>
      ) : null}

      {plan ? (
        <>
          <p>
            {missing.length
              ? t("library.stickWrite.found", {
                  found: plan.match.matched.length,
                  total: plan.match.matched.length + missing.length,
                })
              : t("library.stickWrite.allFound", { total: plan.match.matched.length })}
          </p>
          {missing.length ? (
            <div className="stick-missing">
              <strong>{t("library.stickWrite.missingTitle")}</strong>
              <ul>
                {missing.slice(0, 6).map((track, index) => (
                  <li key={`${track.name}-${index}`}>
                    {track.artists.filter((name) => name && name !== "Unknown").join(", ")}
                    {track.artists.length ? " – " : ""}
                    {track.name}
                  </li>
                ))}
              </ul>
              {missing.length > 6 ? (
                <span>{t("library.stickWrite.missingMore", { count: missing.length - 6 })}</span>
              ) : null}
            </div>
          ) : null}
          {plan.refusal ? (
            <p className="stick-warn" role="alert">
              {t("library.stickWrite.refused", { reason: errorText(plan.refusal, t) })}
            </p>
          ) : plan.match.matched.length ? (
            <p>
              {t("library.stickWrite.willWrite", {
                name: plan.playlistName,
                count: plan.match.matched.length,
              })}
            </p>
          ) : (
            <p className="stick-warn">{t("library.stickWrite.noneFound")}</p>
          )}
          {plan.hasLibraryDb ? <p className="stick-warn">{t("library.stickWrite.oneLibrary")}</p> : null}
          <p className="stick-safety">{t("library.stickWrite.safety")}</p>
          <div className="stick-actions">
            <button type="button" className="btn ghost" onClick={() => void restore()}>
              {t("library.stickWrite.restore")}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              {t("library.stickWrite.cancel")}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void write()}
              disabled={Boolean(plan.refusal) || !plan.match.matched.length}
            >
              {t("library.stickWrite.write")}
            </button>
          </div>
        </>
      ) : null}

      {step.kind === "done" ? (
        <>
          <p role="status">
            {t("library.stickWrite.done", { name: step.result.playlistName, count: step.result.trackCount })}
          </p>
          <p className="stick-hint">{t("library.stickWrite.doneBackup", { backup: step.result.backupName })}</p>
          <div className="stick-actions">
            <button type="button" className="btn ghost" onClick={() => void restore()}>
              {t("library.stickWrite.restore")}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              {t("library.stickWrite.close")}
            </button>
          </div>
        </>
      ) : null}

      {step.kind === "restored" ? (
        <>
          <p role="status">{t("library.stickWrite.restoreDone", { backup: step.backup })}</p>
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
