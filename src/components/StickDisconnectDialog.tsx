"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/react";
import { stickPicker } from "@/lib/stick-session";

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
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setBusy(false);
      setError(null);
      autoTried.current = false;
    }
  }

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  const autoReconnectRef = useRef(onAutoReconnect);
  autoReconnectRef.current = onAutoReconnect;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!open || !autoReconnectRef.current || autoTried.current) return;
    autoTried.current = true;
    setBusy(true);
    setError(null);
    void autoReconnectRef
      .current()
      .then((ok) => {
        if (ok) onCloseRef.current();
      })
      .catch((caught) => setError(errorText(caught, tRef.current)))
      .finally(() => setBusy(false));
  }, [open]);

  async function run(job: () => Promise<boolean>) {
    setBusy(true);
    setError(null);
    try {
      if (await job()) onClose();
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
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
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
      <div className="stick-actions">
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
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
