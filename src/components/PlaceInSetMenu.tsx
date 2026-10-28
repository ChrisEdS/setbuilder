"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Tip } from "@/components/Hint";
import { useI18n } from "@/lib/i18n/react";
import { performanceTracks, type SetTrack } from "@/lib/set";
import { lockBodyScroll } from "@/lib/ui-scroll-lock";

type Props = {
  tracks: SetTrack[];
  altId: string;
  onPlace: (relativeId: string, side: "before" | "after") => void;
  onClose: () => void;
};

/** Pick a performance track and drop this Alternative before or after it. */
export function PlaceInSetMenu({ tracks, altId, onPlace, onClose }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const alt = tracks.find((track) => track.id === altId);
  const performance = performanceTracks(tracks);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    const unlockScroll = lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, []);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("button[data-place-primary]")?.focus();
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="replace-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="replace-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t("builder.place.ariaLabel")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="replace-menu-head">
          <div className="replace-menu-copy">
            <strong>{t("builder.place.title")}</strong>
            <h4>{t("builder.place.target", { name: alt?.name ?? "" })}</h4>
            <p>{t("builder.place.hint")}</p>
          </div>
          <button
            type="button"
            className="replace-close"
            onClick={onClose}
            title={t("common.closeTip")}
          >
            {t("common.close")}
          </button>
        </div>
        <div className="replace-menu-body">
          {performance.length === 0 ? (
            <p className="replace-empty">{t("builder.place.empty")}</p>
          ) : (
            <ul className="replace-list">
              {performance.map((track, index) => (
                <li key={track.id}>
                  <div className="replace-copy">
                    <span className="replace-play" />
                    <div>
                      <strong>
                        {index + 1}. {track.name}
                      </strong>
                      <span>{track.artists.join(", ") || t("common.unknown")}</span>
                    </div>
                  </div>
                  <em className="replace-meta">
                    {[
                      track.keyCamelot || "—",
                      track.bpm,
                      track.energyLevel != null ? `E${track.energyLevel}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </em>
                  <div className="place-actions">
                    <Tip text={t("builder.place.beforeTip")}>
                      <button
                        type="button"
                        className="btn ghost lib-add"
                        data-place-primary={index === 0 ? true : undefined}
                        onClick={() => {
                          onPlace(track.id, "before");
                          onClose();
                        }}
                      >
                        {t("builder.place.before")}
                      </button>
                    </Tip>
                    <Tip text={t("builder.place.afterTip")}>
                      <button
                        type="button"
                        className="btn ghost lib-add"
                        onClick={() => {
                          onPlace(track.id, "after");
                          onClose();
                        }}
                      >
                        {t("builder.place.after")}
                      </button>
                    </Tip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
