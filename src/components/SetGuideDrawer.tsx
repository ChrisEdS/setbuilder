"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/react";
import { lockBodyScroll } from "@/lib/ui-scroll-lock";
import { PHASES, TRACK_ROLES, type TrackRole } from "@/lib/set";
import { phaseHint, phaseLabel, roleExplain, roleLabel } from "@/lib/i18n/domain";

type Props = {
  onClose: () => void;
};

const FLOW_STEPS = [
  "builder.guide.flow.1",
  "builder.guide.flow.2",
  "builder.guide.flow.3",
  "builder.guide.flow.4",
  "builder.guide.flow.5",
] as const;

const VIEW_LINES = [
  "builder.guide.views.list",
  "builder.guide.views.roles",
  "builder.guide.views.arc",
] as const;

const ROW_BLOCKS = [
  ["builder.guide.brief.title", "builder.guide.brief.body"],
  ["builder.guide.details.title", "builder.guide.details.body"],
  ["builder.guide.transition.title", "builder.guide.transition.body"],
  ["builder.guide.length.title", "builder.guide.length.body"],
  ["builder.guide.rehearse.title", "builder.guide.rehearse.body"],
  ["builder.guide.note.title", "builder.guide.note.body"],
] as const;

const ROLES: TrackRole[] = TRACK_ROLES.map((role) => role.id);

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
          <section>
            <h3>{t("builder.guide.flow.title")}</h3>
            <ol className="guide-steps">
              {FLOW_STEPS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ol>
          </section>

          <section>
            <h3>{t("builder.guide.roles.title")}</h3>
            <p>{t("builder.guide.roles.intro")}</p>
            <dl className="guide-defs">
              {ROLES.map((id) => (
                <div key={id} className="guide-def">
                  <dt>{roleLabel(t, id)}</dt>
                  <dd>{roleExplain(t, id)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3>{t("builder.guide.arc.title")}</h3>
            <p>{t("builder.guide.arc.intro")}</p>
            <dl className="guide-defs">
              {PHASES.map((phase) => (
                <div key={phase.id} className="guide-def">
                  <dt>{phaseLabel(t, phase.id)}</dt>
                  <dd>{phaseHint(t, phase.id)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3>{t("builder.guide.views.title")}</h3>
            <p>{t("builder.guide.views.intro")}</p>
            <ul className="guide-bullets">
              {VIEW_LINES.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </section>

          <section className="guide-row-ref">
            <h3>{t("builder.guide.row.title")}</h3>
            {ROW_BLOCKS.map(([title, body]) => (
              <div className="guide-subblock" key={title}>
                <h4>{t(title)}</h4>
                <p>{t(body)}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
