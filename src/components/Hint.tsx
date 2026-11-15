"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  tipClaimActive,
  tipGetLastClosedAt,
  tipGetOpenCount,
  tipHostHasOpenDetails,
  tipNoteClosed,
  tipNoteOpened,
  tipReleaseActive,
  tipShouldCommitShow,
  tipShowDelay,
  TIP_HIDE_DELAY_MS,
} from "@/lib/tip-session";

type TipProps = {
  text: string;
  /** When the child control is disabled, make the wrapper focusable so the tip still opens. */
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  /** Bubble aligns to the right edge of the trigger (default is left). Use on trailing controls. */
  end?: boolean;
  /** Use span inside phrasing parents (e.g. title line) so Tip stays valid HTML. */
  as?: "div" | "span";
  /** Keep the bubble closed. Used while another popup owns this control. */
  quiet?: boolean;
};

type BubblePos = {
  top: number;
  left: number;
  maxWidth: number;
};

const MARGIN = 8;
const MAX_WIDTH = 260;

function estimateRect(width: number, height: number): DOMRect {
  return {
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  };
}

function placeBubble(trigger: DOMRect, bubble: DOMRect, end: boolean): BubblePos {
  const maxWidth = Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2);
  const width = Math.min(bubble.width || maxWidth, maxWidth);
  const height = bubble.height || 48;

  let left = end ? trigger.right - width : trigger.left;
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));

  let top = trigger.bottom + MARGIN;
  if (top + height > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, trigger.top - height - MARGIN);
  }
  return { top, left, maxWidth };
}

function PortalBubble({
  id,
  text,
  pos,
  bubbleRef,
}: {
  id: string;
  text: string;
  pos: BubblePos | null;
  bubbleRef: RefObject<HTMLSpanElement | null>;
}) {
  const style: CSSProperties = {
    top: pos?.top ?? 0,
    left: pos?.left ?? 0,
    maxWidth: pos?.maxWidth ?? MAX_WIDTH,
    opacity: pos ? 1 : 0,
  };
  return createPortal(
    <span
      ref={bubbleRef}
      className="tip-bubble tip-bubble-portal is-open"
      role="tooltip"
      id={id}
      style={style}
    >
      {text}
    </span>,
    document.body,
  );
}

/**
 * Hover/focus tooltip for controls. Prefer this over native `title` —
 * title tooltips are easy to miss and slow to appear.
 * Bubbles portal to document.body and clamp to the viewport so overflow:hidden
 * parents and left-edge tabs never clip the text.
 */
export function Tip({
  text,
  disabled,
  children,
  className,
  end = false,
  as = "div",
  quiet = false,
}: TipProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const Wrap = as;
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<number | null>(null);
  const showTimer = useRef<number | null>(null);
  const openRef = useRef(false);
  /** User still wants this tip (pointer over or focus path armed). Cleared on leave/blur/dismiss. */
  const interestedRef = useRef(false);
  const forceCloseRef = useRef<() => void>(() => {});
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<BubblePos | null>(null);
  /** Nested `<details>` menu (energy / sort / …) owns the control — keep Tip closed. */
  const [popupQuiet, setPopupQuiet] = useState(false);
  const effectiveQuiet = quiet || popupQuiet;
  const quietRef = useRef(effectiveQuiet);
  const [trackedQuiet, setTrackedQuiet] = useState(effectiveQuiet);
  const tipId = useId();

  const clearShow = useCallback(() => {
    if (showTimer.current != null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const clearHide = useCallback(() => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const closeNow = useCallback(() => {
    clearShow();
    clearHide();
    interestedRef.current = false;
    openRef.current = false;
    tipReleaseActive(forceCloseRef.current);
    setOpen(false);
    setPos(null);
  }, [clearHide, clearShow]);

  useLayoutEffect(() => {
    quietRef.current = effectiveQuiet;
    forceCloseRef.current = closeNow;
  }, [effectiveQuiet, closeNow]);

  if (effectiveQuiet !== trackedQuiet) {
    setTrackedQuiet(effectiveQuiet);
    if (effectiveQuiet) {
      if (open) setOpen(false);
      if (pos !== null) setPos(null);
    }
  }

  const show = useCallback(
    (source: "pointer" | "focus" = "pointer") => {
      if (effectiveQuiet || tipHostHasOpenDetails(wrapRef.current)) return;
      clearHide();
      interestedRef.current = true;
      if (openRef.current || showTimer.current != null) return;
      const delay = tipShowDelay(source, tipGetOpenCount(), tipGetLastClosedAt());
      showTimer.current = window.setTimeout(() => {
        showTimer.current = null;
        if (
          !tipShouldCommitShow(interestedRef.current, quietRef.current) ||
          tipHostHasOpenDetails(wrapRef.current)
        ) {
          return;
        }
        tipClaimActive(forceCloseRef.current);
        openRef.current = true;
        setOpen(true);
      }, delay);
    },
    [clearHide, effectiveQuiet],
  );

  const hide = useCallback(
    (immediate = false) => {
      interestedRef.current = false;
      clearShow();
      clearHide();
      if (!openRef.current) return;
      if (immediate) {
        closeNow();
        return;
      }
      hideTimer.current = window.setTimeout(() => {
        hideTimer.current = null;
        closeNow();
      }, TIP_HIDE_DELAY_MS);
    },
    [clearHide, clearShow, closeNow],
  );

  useEffect(() => {
    if (!open) return;
    tipNoteOpened();
    tipClaimActive(forceCloseRef.current);
    return () => {
      tipNoteClosed();
      tipReleaseActive(forceCloseRef.current);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      clearShow();
      clearHide();
      tipReleaseActive(forceCloseRef.current);
    };
  }, [clearHide, clearShow]);

  /** Stay quiet while a nested details menu is open (click focus must not resurrect Tip). */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    function sync() {
      const next = tipHostHasOpenDetails(wrap);
      setPopupQuiet(next);
      if (!next) return;
      interestedRef.current = false;
      clearShow();
      clearHide();
      openRef.current = false;
      tipReleaseActive(forceCloseRef.current);
      setOpen(false);
      setPos(null);
    }
    sync();
    wrap.addEventListener("toggle", sync, true);
    return () => wrap.removeEventListener("toggle", sync, true);
  }, [clearHide, clearShow]);

  useEffect(() => {
    if (!effectiveQuiet) return;
    interestedRef.current = false;
    clearShow();
    clearHide();
    openRef.current = false;
    tipReleaseActive(forceCloseRef.current);
  }, [effectiveQuiet, clearHide, clearShow]);

  const update = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const trigger = wrap.getBoundingClientRect();
    const bubble = bubbleRef.current?.getBoundingClientRect();
    setPos(
      placeBubble(
        trigger,
        bubble && bubble.width > 0
          ? bubble
          : estimateRect(Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2), 56),
        end,
      ),
    );
  }, [end]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    const frame = requestAnimationFrame(update);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [open, text, update]);

  useEffect(() => {
    if (!open) return;
    function dismiss() {
      hide(true);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && wrapRef.current?.contains(target)) return;
      dismiss();
    }
    function onScroll() {
      dismiss();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("dragstart", dismiss, true);
    window.addEventListener("blur", dismiss);
    document.addEventListener("visibilitychange", dismiss);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("dragstart", dismiss, true);
      window.removeEventListener("blur", dismiss);
      document.removeEventListener("visibilitychange", dismiss);
    };
  }, [open, hide]);

  if (!text.trim()) return <>{children}</>;

  return (
    <Wrap
      ref={(node) => {
        wrapRef.current = node;
      }}
      className={["tip", end ? "tip-end" : "", open ? "is-open" : "", className]
        .filter(Boolean)
        .join(" ")}
      tabIndex={disabled ? 0 : undefined}
      aria-describedby={open ? tipId : undefined}
      onPointerEnter={() => show("pointer")}
      onPointerLeave={() => hide()}
      onPointerDownCapture={() => hide(true)}
      onFocusCapture={() => show("focus")}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && wrapRef.current?.contains(next)) return;
        hide(true);
      }}
    >
      {children}
      {open && pos ? (
        <PortalBubble id={tipId} text={text} pos={pos} bubbleRef={bubbleRef} />
      ) : null}
    </Wrap>
  );
}

type Props = {
  text: string;
  children?: ReactNode;
  className?: string;
  /** Hide the “?” when a nearby empty-state paragraph already explains the same thing. */
  mark?: boolean;
  /** Bubble aligns to the right edge of the “?”. Use on trailing controls. */
  end?: boolean;
  /** When set, “?” opens a drawer (or similar) instead of the tip bubble. `text` is the control label only. */
  onMarkClick?: () => void;
  markExpanded?: boolean;
  markControls?: string;
};

/** Visible “?” — hover or tap shows the explanation. Native title is too easy to miss. */
export function Hint({
  text,
  children,
  className,
  mark = true,
  end = false,
  onMarkClick,
  markExpanded,
  markControls,
}: Props) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<BubblePos | null>(null);

  const update = useCallback(() => {
    const wrap = ref.current;
    if (!wrap) return;
    const trigger = wrap.getBoundingClientRect();
    const bubble = bubbleRef.current?.getBoundingClientRect();
    setPos(
      placeBubble(
        trigger,
        bubble && bubble.width > 0
          ? bubble
          : estimateRect(Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2), 56),
        end,
      ),
    );
  }, [end]);

  const drawerTrigger = Boolean(onMarkClick);

  useLayoutEffect(() => {
    if (!open || !mark || drawerTrigger) return;
    update();
    const frame = requestAnimationFrame(update);
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, mark, text, update, drawerTrigger]);

  useEffect(() => {
    if (!open || !mark || drawerTrigger) return;
    function onPointer(event: PointerEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      setOpen(false);
      setPos(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setPos(null);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mark, drawerTrigger]);

  if (!mark) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      ref={ref}
      className={["tip", "hint", end ? "tip-end" : "", open ? "is-open" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      <button
        type="button"
        className="hint-mark"
        aria-label={text}
        aria-expanded={drawerTrigger ? markExpanded : open}
        aria-controls={drawerTrigger ? markControls : undefined}
        aria-describedby={!drawerTrigger && open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (onMarkClick) {
            onMarkClick();
            return;
          }
          if (open) setPos(null);
          setOpen(!open);
        }}
      >
        ?
      </button>
      {!drawerTrigger && open && pos ? (
        <PortalBubble id={id} text={text} pos={pos} bubbleRef={bubbleRef} />
      ) : null}
    </span>
  );
}
