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
/** Wait before the first tip, so sweeping across controls does not flash one. */
const SHOW_DELAY_MS = 450;
/** Once a tip is open (or just closed), the next neighbor can appear sooner. */
const SKIP_DELAY_MS = 100;
const SKIP_GRACE_MS = 120;
/** Keyboard focus still waits briefly so tabbing does not strobe every tip. */
const FOCUS_DELAY_MS = 180;
/** Leave hides almost immediately; long enough to ignore a one-frame gap. */
const HIDE_DELAY_MS = 60;

let openTipCount = 0;
let lastTipClosedAt = 0;

function showDelay(source: "pointer" | "focus"): number {
  if (source === "focus") return FOCUS_DELAY_MS;
  const warm = openTipCount > 0 || Date.now() - lastTipClosedAt < SKIP_GRACE_MS;
  return warm ? SKIP_DELAY_MS : SHOW_DELAY_MS;
}

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
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<BubblePos | null>(null);
  const tipId = useId();

  const clearShow = useCallback(() => {
    if (showTimer.current != null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const show = useCallback(
    (source: "pointer" | "focus" = "pointer") => {
      if (quiet) return;
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (openRef.current || showTimer.current != null) return;
      const delay = showDelay(source);
      showTimer.current = window.setTimeout(() => {
        showTimer.current = null;
        openRef.current = true;
        setOpen(true);
      }, delay);
    },
    [quiet],
  );

  const hide = useCallback(
    (immediate = false) => {
      clearShow();
      if (hideTimer.current != null) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      const close = () => {
        openRef.current = false;
        setOpen(false);
        setPos(null);
        hideTimer.current = null;
      };
      if (!openRef.current) return;
      if (immediate) {
        close();
        return;
      }
      hideTimer.current = window.setTimeout(close, HIDE_DELAY_MS);
    },
    [clearShow],
  );

  useEffect(() => {
    if (!open) return;
    openTipCount += 1;
    return () => {
      openTipCount = Math.max(0, openTipCount - 1);
      lastTipClosedAt = Date.now();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
      if (showTimer.current != null) window.clearTimeout(showTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!quiet) return;
    clearShow();
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    openRef.current = false;
    setOpen(false);
    setPos(null);
  }, [quiet, clearShow]);

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
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, text, update]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        openRef.current = false;
        setOpen(false);
        setPos(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
};

/** Visible “?” — hover or tap shows the explanation. Native title is too easy to miss. */
export function Hint({ text, children, className, mark = true }: Props) {
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
        false,
      ),
    );
  }, []);

  useLayoutEffect(() => {
    if (!open || !mark) return;
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
  }, [open, mark, text, update]);

  useEffect(() => {
    if (!open || !mark) return;
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
  }, [open, mark]);

  if (!mark) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      ref={ref}
      className={["tip", "hint", open ? "is-open" : "", className].filter(Boolean).join(" ")}
    >
      {children}
      <button
        type="button"
        className="hint-mark"
        aria-label={text}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open) setPos(null);
          setOpen(!open);
        }}
      >
        ?
      </button>
      {open && pos ? (
        <PortalBubble id={id} text={text} pos={pos} bubbleRef={bubbleRef} />
      ) : null}
    </span>
  );
}
