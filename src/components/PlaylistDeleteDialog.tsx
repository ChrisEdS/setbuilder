"use client";

import { useEffect, useRef, useState } from "react";
import { Tip } from "@/components/Hint";
import { useI18n } from "@/lib/i18n/react";

export function PlaylistDeleteDialog({
  name,
  open,
  busy,
  phase,
  error,
  done,
  canRestore,
  restoring,
  onClose,
  onConfirm,
  onRestore,
}: {
  name: string;
  open: boolean;
  busy: boolean;
  phase: "write" | "read" | null;
  error: string | null;
  done: { name: string; backup: string } | null;
  /** Show Sicherung zurück after a write/restore failure. */
  canRestore: boolean;
  restoring: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRestore: () => void;
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

  const locked = busy || restoring;
  const busyLabel =
    restoring
      ? t("library.stick.deleteRestoring")
      : phase === "read"
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
      aria-busy={locked || undefined}
      onClose={() => {
        if (!locked) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked) onClose();
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
            {locked ? (
              <span className="playlist-delete-busy">
                <span className="playlist-delete-spinner" aria-hidden="true" />
                {busyLabel}
              </span>
            ) : (
              t("library.stick.deleteStatus", { name: shownName })
            )}
          </p>
          {locked ? null : (
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
            <button type="button" className="btn ghost" disabled={locked} onClick={onClose}>
              {t("library.stick.deleteCancel")}
            </button>
            {canRestore ? (
              <Tip text={t("library.stick.deleteRestoreTip")} disabled={locked}>
                <button type="button" className="btn" disabled={locked} onClick={onRestore}>
                  {t("library.stick.deleteRestore")}
                </button>
              </Tip>
            ) : (
              <button type="button" className="btn danger" disabled={locked} onClick={onConfirm}>
                {t("library.stick.deleteConfirm")}
              </button>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
