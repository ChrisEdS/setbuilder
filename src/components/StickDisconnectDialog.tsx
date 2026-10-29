"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { stickPicker } from "@/lib/stick-session";
import {
  readLocal,
  STICK_LOST_HIDE_KEY,
  STICK_LOST_HIDE_KEY_LEGACY,
  writeLocal,
} from "@/lib/storage-keys";

export function isStickLostDialogHidden(): boolean {
  return readLocal(STICK_LOST_HIDE_KEY, STICK_LOST_HIDE_KEY_LEGACY) === "1";
}

export function hideStickLostDialogForever(): void {
  writeLocal(STICK_LOST_HIDE_KEY, "1");
}

export function StickDisconnectDialog({
  open,
  onClose,
  onReconnect,
  onReconnectFiles,
  onAutoReconnect,
}: {
  open: boolean;
  onClose: () => void;
  /** Directory picker / persisted-handle reconnect. True = restored. */
  onReconnect: () => Promise<boolean>;
  /** Fallback when showDirectoryPicker is unavailable. True = restored. */
  onReconnectFiles?: (files: File[]) => Promise<boolean>;
  /**
   * Soft attempt without a new folder dialog (persisted handle + permission).
   * Return true when the stick is readable again.
   */
  onAutoReconnect?: () => Promise<boolean>;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const autoTried = useRef(false);
  const canPick = stickPicker() !== null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const autoReconnectRef = useRef(onAutoReconnect);
  const onCloseRef = useRef(onClose);
  const doNotShowAgainRef = useRef(doNotShowAgain);
  const tRef = useRef(t);

  // Adjust local UI when the dialog closes — React's recommended "adjust state
  // while rendering" path (not an effect, so refs stay out of this block).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setBusy(false);
      setError(null);
      setDoNotShowAgain(false);
    }
  }

  useEffect(() => {
    autoReconnectRef.current = onAutoReconnect;
  }, [onAutoReconnect]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    doNotShowAgainRef.current = doNotShowAgain;
  }, [doNotShowAgain]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  function finishClose() {
    if (doNotShowAgainRef.current) hideStickLostDialogForever();
    onCloseRef.current();
  }

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      autoTried.current = false;
      return;
    }
    if (!autoReconnectRef.current || autoTried.current) return;
    autoTried.current = true;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setBusy(true);
      setError(null);
      void autoReconnectRef
        .current?.()
        .then((ok) => {
          if (cancelled) return;
          if (ok) finishClose();
        })
        .catch((caught) => {
          if (!cancelled) setError(errorText(caught, tRef.current));
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open]);

  async function run(job: () => Promise<boolean>) {
    setBusy(true);
    setError(null);
    try {
      if (await job()) finishClose();
    } catch (caught) {
      setError(errorText(caught, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="stick-dialog stick-disconnect-dialog"
      aria-labelledby="stick-disconnect-title"
      aria-describedby="stick-disconnect-body"
      onClose={() => onCloseRef.current()}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) finishClose();
      }}
    >
      <h2 id="stick-disconnect-title">{t("builder.stickLost.title")}</h2>
      <p id="stick-disconnect-body">{t("builder.stickLost.body")}</p>
      {busy ? <p className="stick-hint">{t("builder.stickLost.busy")}</p> : null}
      {error ? (
        <p className="stick-warn" role="alert">
          {error}
        </p>
      ) : null}
      <label className="stick-dismiss">
        <input
          type="checkbox"
          checked={doNotShowAgain}
          disabled={busy}
          onChange={(event) => setDoNotShowAgain(event.target.checked)}
        />
        <span>{t("builder.stickLost.doNotShowAgain")}</span>
      </label>
      <div className="stick-actions">
        <button type="button" className="btn ghost" onClick={finishClose} disabled={busy}>
          {t("builder.stickLost.later")}
        </button>
        {canPick ? (
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => void run(onReconnect)}
          >
            {busy ? t("builder.stickLost.busy") : t("builder.stickLost.reconnect")}
          </button>
        ) : onReconnectFiles ? (
          <label className={"btn primary" + (busy ? " is-busy" : "")}>
            {busy ? t("builder.stickLost.busy") : t("builder.stickLost.choose")}
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
                void run(() => onReconnectFiles(files));
              }}
            />
          </label>
        ) : null}
      </div>
    </dialog>
  );
}
