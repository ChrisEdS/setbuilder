"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/react";

export function PlaylistDeleteDialog({
  name,
  open,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  name: string;
  open: boolean;
  busy: boolean;
  error: string | null;
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

  return (
    <dialog
      ref={dialog}
      tabIndex={-1}
      className="stick-dialog playlist-delete-dialog"
      aria-labelledby="playlist-delete-title"
      aria-describedby="playlist-delete-status"
      aria-busy={busy}
      onClose={() => {
        if (!busy) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="playlist-delete-title">{t("library.stick.deleteTitle", { name: shownName })}</h2>
      <p id="playlist-delete-status" className="modal-status">
        {busy ? t("library.stick.deleteBusy") : t("library.stick.deleteStatus", { name: shownName })}
      </p>
      <p className="modal-next">{t("library.stick.deleteNext")}</p>
      <p className="modal-info">{t("library.stick.deleteInfo")}</p>
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
    </dialog>
  );
}
