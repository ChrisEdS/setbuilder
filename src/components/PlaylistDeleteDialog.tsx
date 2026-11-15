"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/react";

export function PlaylistDeleteDialog({
  name,
  open,
  busy,
  phase,
  error,
  done,
  onClose,
  onConfirm,
}: {
  name: string;
  open: boolean;
  busy: boolean;
  phase: "write" | "read" | null;
  error: string | null;
  done: { name: string; backup: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [shownName, setShownName] = useState(name);
  if (name && name !== shownName) setShownName(name);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      node.focus();
    }
    if (!open && node.open) node.close();
  }, [open]);

  const busyLabel =
    phase === "read"
      ? t("library.stick.deleteBusyRead")
      : phase === "write"
        ? t("library.stick.deleteBusyWrite")
        : t("library.stick.deleteBusy");

  return (
    <dialog
      ref={dialog}
      tabIndex={-1}
      className="stick-dialog playlist-delete-dialog"
      aria-labelledby="playlist-delete-title"
      aria-describedby="playlist-delete-status"
      aria-busy={busy || undefined}
      onClose={() => {
        if (!busy) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {done ? (
        <>
          <h2 id="playlist-delete-title">{t("library.stick.deleteDoneTitle")}</h2>
          <p id="playlist-delete-status" className="modal-status" role="status">
            {t("library.stick.deleteDone", { name: done.name, backup: done.backup })}
          </p>
          <div className="stick-actions">
            <button type="button" className="btn" onClick={onClose}>
              {t("library.stick.deleteClose")}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 id="playlist-delete-title">{t("library.stick.deleteTitle", { name: shownName })}</h2>
          <p id="playlist-delete-status" className="modal-status" role="status">
            {busy ? (
              <span className="playlist-delete-busy">
                <span className="playlist-delete-spinner" aria-hidden="true" />
                {busyLabel}
              </span>
            ) : (
              t("library.stick.deleteStatus", { name: shownName })
            )}
          </p>
          {busy ? null : (
            <>
              <p className="modal-next">{t("library.stick.deleteNext")}</p>
              <p className="modal-info">{t("library.stick.deleteInfo")}</p>
            </>
          )}
          {error ? (
            <p className="modal-status" role="alert">
              {error}
            </p>
          ) : null}
          <div className="stick-actions">
            <button type="button" className="btn ghost" disabled={busy} onClick={onClose}>
              {t("library.stick.deleteCancel")}
            </button>
            <button type="button" className="btn danger" disabled={busy} onClick={onConfirm}>
              {t("library.stick.deleteConfirm")}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
