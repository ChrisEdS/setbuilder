"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/react";

export function ReshuffleConfirmDialog({
  open,
  body,
  onClose,
  onConfirm,
}: {
  open: boolean;
  body: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="stick-dialog reset-set-dialog"
      aria-labelledby="reshuffle-confirm-title"
      aria-describedby="reshuffle-confirm-body"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="reshuffle-confirm-title">{t("builder.reshuffle.confirmTitle")}</h2>
      <p id="reshuffle-confirm-body" className="modal-status">
        {body}
      </p>
      <p className="modal-next">{t("builder.reshuffle.confirmNext")}</p>
      <div className="stick-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          {t("builder.reshuffle.cancel")}
        </button>
        <button type="button" className="btn danger" onClick={onConfirm}>
          {t("builder.reshuffle.go")}
        </button>
      </div>
    </dialog>
  );
}
