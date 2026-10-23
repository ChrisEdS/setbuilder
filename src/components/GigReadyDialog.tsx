"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/i18n";
import { phaseLabel } from "@/lib/i18n/domain";
import { useI18n } from "@/lib/i18n/react";
import { gigReadyBlocks, type GigCheck } from "@/lib/gig-ready";
import { stickPicker } from "@/lib/stick-session";

export function GigReadyDialog({
  open,
  checks,
  onClose,
  onContinue,
  onReselectStick,
  onReselectStickFiles,
}: {
  open: boolean;
  checks: GigCheck[];
  onClose: () => void;
  onContinue: () => void;
  /** Same folder pick + rememberStickFiles path as stick load / reload. */
  onReselectStick?: () => Promise<void>;
  /** Fallback when showDirectoryPicker is unavailable. */
  onReselectStickFiles?: (files: File[]) => Promise<void>;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const blocked = gigReadyBlocks(checks);
  const filesCheck = checks.find((check) => check.id === "files");
  const canReselect = Boolean(filesCheck && (onReselectStick || onReselectStickFiles));
  const canPick = stickPicker() !== null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  function line(check: GigCheck): string {
    if (check.id === "files") {
      return t(check.severity === "block" ? "builder.ready.filesBlock" : "builder.ready.filesAck", {
        count: check.count,
      });
    }
    if (check.id === "keys") return t("builder.ready.keys", { count: check.count });
    if (check.id === "energy") return t("builder.ready.energy", { count: check.count });
    if (check.id === "planB") {
      const phases = (check.phases ?? [])
        .map((item) =>
          t("builder.ready.planBPhase", {
            phase: phaseLabel(t, item.phase),
            have: item.have,
            need: item.need,
          }),
        )
        .join(", ");
      return t("builder.ready.planB", { phases });
    }
    if (check.id === "player" && check.verdict && check.verdict !== "ready") {
      const playerKey = {
        broken: "builder.ready.player.broken",
        empty: "builder.ready.player.empty",
        needsRekordbox: "builder.ready.player.needsRekordbox",
        hiddenFolder: "builder.ready.player.hiddenFolder",
        incomplete: "builder.ready.player.incomplete",
      } as const;
      return t(playerKey[check.verdict]);
    }
    return t("builder.ready.heard");
  }

  async function runReselect(job: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await job();
    } catch (caught) {
      setError(errorText(caught, t));
    } finally {
      setBusy(false);
    }
  }

  const reselectLabel = busy
    ? t("builder.ready.reselectStickBusy")
    : t("builder.ready.reselectStick");
  const reselectClass =
    filesCheck?.severity === "block" ? "btn primary" : "btn";

  return (
    <dialog
      ref={dialog}
      className="stick-dialog gig-ready-dialog"
      aria-labelledby="gig-ready-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="gig-ready-title">{t("builder.ready.title")}</h2>
      <p className="gig-ready-intro">{t("builder.ready.intro")}</p>
      <ul className="gig-ready-list">
        {checks.map((check) => (
          <li key={check.id} className={check.severity === "block" ? "is-block" : undefined}>
            {check.severity === "block" ? <strong>{t("builder.ready.block")}. </strong> : null}
            {line(check)}
          </li>
        ))}
      </ul>
      {canReselect ? (
        <p className="gig-ready-hint">{t("builder.ready.reselectStickTip")}</p>
      ) : null}
      {error ? (
        <p className="gig-ready-warn stick-warn" role="alert">
          {error}
        </p>
      ) : null}
      <div className="stick-actions gig-ready-actions">
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          {t("builder.ready.close")}
        </button>
        {canReselect && canPick && onReselectStick ? (
          <button
            type="button"
            className={reselectClass}
            disabled={busy}
            onClick={() => void runReselect(onReselectStick)}
          >
            {reselectLabel}
          </button>
        ) : null}
        {canReselect && !canPick && onReselectStickFiles ? (
          <label className={reselectClass + (busy ? " is-busy" : "")}>
            {reselectLabel}
            <input
              type="file"
              hidden
              multiple
              disabled={busy}
              {...{ webkitdirectory: "", directory: "" }}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.currentTarget.value = "";
                if (!files.length) return;
                void runReselect(() => onReselectStickFiles(files));
              }}
            />
          </label>
        ) : null}
        {blocked ? null : (
          <button type="button" className="btn primary" onClick={onContinue} disabled={busy}>
            {t("builder.ready.continue")}
          </button>
        )}
      </div>
    </dialog>
  );
}
