"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/i18n/error";
import { useI18n } from "@/lib/i18n/react";
import {
  planStickWrite,
  restoreLatestBackup,
  rewriteSetToStick,
  writeSetToStick,
  writeStickSidecars,
  type DirLike,
  type StickPlan,
  type StickWriteDone,
} from "@/lib/rekordbox-stick-write";
import type { SetDraft, SetTrack } from "@/lib/set";
import {
  loadPersistedStickHandle,
  pickAndRememberStick,
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

  const tracks = draft.tracks;
  const title = draft.title;
  const altLabel = t("exports.pdf.alternatives");

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      setStep({ kind: "idle" });
      setHints({});
      root.current = null;
      setCanPick(stickPicker() !== null);
      node.showModal();
      void (async () => {
        const handle = await loadPersistedStickHandle();
        if (!handle || !(await stickPermission(handle, "readwrite", false))) return;
        root.current = handle;
        setStep({ kind: "busy", label: "reading" });
        try {
          setStep({
            kind: "planned",
            plan: await planStickWrite(handle, withHints(tracks, {}), title, altLabel),
          });
        } catch (error) {
          setStep({ kind: "error", text: errorText(error, t) });
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
      setStep({
        kind: "planned",
        plan: await planStickWrite(handle, withHints(tracks, nextHints), title, altLabel),
      });
    } catch (error) {
      setStep({ kind: "error", text: errorText(error, t) });
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

  async function rewrite() {
    if (!window.confirm(t("library.stickWrite.rewriteConfirm"))) return;
    await finishWrite(rewriteSetToStick);
  }

  const busy = step.kind === "busy";
  const plan = step.kind === "planned" ? step.plan : null;
  const missing = plan?.match.missing ?? [];
  const suggestions = plan?.suggestions ?? [];

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

      {busy ? <p role="status">{t(`library.stickWrite.busy.${step.label}`)}</p> : null}

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
          {suggestions.length ? (
            <div className="stick-missing">
              <strong>{t("library.stickWrite.suggestTitle")}</strong>
              <ul>
                {suggestions.map((item) => (
                  <li key={(item.track as SetTrack).id ?? item.track.name}>
                    <span>
                      {item.track.artists.filter((name) => name && name !== "Unknown").join(", ")}
                      {item.track.artists.length ? " – " : ""}
                      {item.track.name}
                    </span>
                    {item.candidates.map((candidate) => (
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
                        {t("library.stickWrite.suggestUse")}: {candidate.artist} – {candidate.title}
                      </button>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {missing.length ? (
            <div className="stick-missing">
              <strong>{t("library.stickWrite.missingTitle")}</strong>
              <ul>
                {missing
                  .filter(
                    (track) =>
                      !suggestions.some(
                        (item) =>
                          item.track.name === track.name &&
                          item.track.artists.join() === track.artists.join(),
                      ),
                  )
                  .slice(0, 6)
                  .map((track, index) => (
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
          ) : plan.alreadyOnStick ? (
            <>
              <p>{t("library.stickWrite.alreadyThere", { name: plan.playlistName })}</p>
              <p className="stick-hint">{t("library.stickWrite.rewriteHint")}</p>
            </>
          ) : plan.skippedPerformance && plan.alternativesName ? (
            <p>
              {t("library.stickWrite.willAddAltsOnly", {
                name: plan.playlistName,
                alts: plan.alternativesName,
              })}
            </p>
          ) : plan.performanceCount || plan.alternativesCount ? (
            <p>
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
          {plan.hasLibraryDb ? <p className="stick-warn">{t("library.stickWrite.oneLibrary")}</p> : null}
          <p className="stick-safety">{t("library.stickWrite.safety")}</p>
          <div className="stick-actions">
            <button type="button" className="btn ghost" onClick={() => void restore()}>
              {t("library.stickWrite.restore")}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              {t("library.stickWrite.cancel")}
            </button>
            {plan.alreadyOnStick ? (
              <button type="button" className="btn" onClick={() => void rewrite()}>
                {t("library.stickWrite.rewrite")}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => void finishWrite(writeSetToStick)}
                disabled={
                  Boolean(plan.refusal) || (!plan.performanceCount && !plan.alternativesCount)
                }
              >
                {t("library.stickWrite.write")}
              </button>
            )}
          </div>
        </>
      ) : null}

      {step.kind === "done" ? (
        <>
          <p role="status">
            {t("library.stickWrite.done", { name: step.result.playlistName, count: step.result.trackCount })}
            {step.result.alternativesName
              ? ` ${t("library.stickWrite.doneAlts", { name: step.result.alternativesName })}`
              : ""}
          </p>
          <p className="stick-hint">{t("library.stickWrite.doneBackup", { backup: step.result.backupName })}</p>
          {step.sidecars.length ? (
            <p className="stick-hint">
              {t("library.stickWrite.sidecar", { files: step.sidecars.join(", ") })}
            </p>
          ) : null}
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
