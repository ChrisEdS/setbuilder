"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/react";
import { lockBodyScroll } from "@/lib/ui-scroll-lock";

type Props = {
  onClose: () => void;
};

const BLOCKS = [
  ["builder.guide.brief.title", "builder.guide.brief.body"],
  ["builder.guide.details.title", "builder.guide.details.body"],
  ["builder.guide.transition.title", "builder.guide.transition.body"],
  ["builder.guide.length.title", "builder.guide.length.body"],
  ["builder.guide.rehearse.title", "builder.guide.rehearse.body"],
  ["builder.guide.note.title", "builder.guide.note.body"],
] as const;

/** How the set is meant to be read. Slides in from the side; Escape or Close dismisses it. */
export function SetGuideDrawer({ onClose }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    const unlockScroll = lockBodyScroll();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      returnFocusRef.current?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="guide-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        id="set-guide"
        className="guide-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="guide-head">
          <h2 id="set-guide-title">{t("builder.guide.title")}</h2>
          <button type="button" className="guide-close" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
        <div className="guide-blocks">
          {BLOCKS.map(([title, body]) => (
            <section key={title}>
              <h3>{t(title)}</h3>
              <p>{t(body)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
