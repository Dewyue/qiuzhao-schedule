import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

/** True long-press; short enough to feel responsive, long enough to avoid scroll slips. */
const HOLD_MS = 480;
/** Finger slip before arming cancels the hold so the page can scroll. */
const SLIP_PX = 12;

export function useBlockDrag(
  pxPerMinute: number,
  onTap: () => void,
  onCommit: (deltaMin: number) => void,
  clampPx: (dy: number) => number = (dy) => dy,
  /** Snap raw minute delta (e.g. to 10-minute grid). */
  snapMins: (rawMin: number) => number = (m) => m,
) {
  const [live, setLive] = useState(false);
  const [previewMin, setPreviewMin] = useState(0);
  const drag = useRef({
    id: -1,
    x: 0,
    y: 0,
    timer: 0,
    active: false,
    suppress: false,
    px: 0,
    mins: 0,
    shown: 0,
    target: null as HTMLElement | null,
    unbind: null as (() => void) | null,
  });
  const clampRef = useRef(clampPx);
  clampRef.current = clampPx;
  const snapRef = useRef(snapMins);
  snapRef.current = snapMins;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const pxRef = useRef(pxPerMinute);
  pxRef.current = pxPerMinute;

  useEffect(() => {
    if (!live) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlTouch: html.style.touchAction,
      bodyTouch: body.style.touchAction,
      overscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.touchAction = "none";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";

    const blockScroll = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener("touchmove", blockScroll, { passive: false });
    document.addEventListener("wheel", blockScroll, { passive: false });

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.touchAction = prev.htmlTouch;
      body.style.touchAction = prev.bodyTouch;
      body.style.overscrollBehavior = prev.overscroll;
      document.removeEventListener("touchmove", blockScroll);
      document.removeEventListener("wheel", blockScroll);
    };
  }, [live]);

  useEffect(() => {
    return () => {
      window.clearTimeout(drag.current.timer);
      drag.current.unbind?.();
    };
  }, []);

  function paint(target: HTMLElement, px: number) {
    target.style.setProperty("transition", "none", "important");
    target.style.transform = px ? `translate3d(0, ${px}px, 0)` : "";
  }

  function bounce(target: HTMLElement) {
    try {
      target.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)" },
          { transform: "translate3d(0, 0, 0) scale(1.06)" },
          { transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        { duration: 340, easing: "cubic-bezier(0.34, 1.45, 0.64, 1)" },
      );
    } catch {
      /* WAAPI unavailable */
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([14, 28, 18]);
    }
  }

  function activate() {
    const s = drag.current;
    if (s.active || !s.target) return;
    s.active = true;
    setLive(true);
    setPreviewMin(0);
    paint(s.target, 0);
    bounce(s.target);
  }

  function abortPending() {
    const s = drag.current;
    window.clearTimeout(s.timer);
    s.timer = 0;
    s.unbind?.();
    s.unbind = null;
    const target = s.target;
    const pointerId = s.id;
    s.active = false;
    s.id = -1;
    s.target = null;
    s.mins = 0;
    s.px = 0;
    s.shown = 0;
    if (target && pointerId >= 0) {
      target.style.removeProperty("transition");
      target.style.transform = "";
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* not capturing */
      }
    }
  }

  function finish(pointerId: number) {
    const s = drag.current;
    if (s.id !== pointerId) return;
    window.clearTimeout(s.timer);
    s.timer = 0;
    s.unbind?.();
    s.unbind = null;

    const wasActive = s.active;
    const mins = s.mins;
    const target = s.target;
    s.active = false;
    s.id = -1;
    s.mins = 0;
    s.px = 0;
    s.shown = 0;
    s.target = null;

    if (target) {
      target.style.removeProperty("transition");
      target.style.transform = "";
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
    }

    if (!wasActive) return;
    setLive(false);
    setPreviewMin(0);
    s.suppress = true;
    window.setTimeout(() => {
      s.suppress = false;
    }, 320);
    if (mins !== 0) commitRef.current(mins);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const s = drag.current;
    s.unbind?.();
    window.clearTimeout(s.timer);

    s.suppress = false;
    s.id = e.pointerId;
    s.x = e.clientX;
    s.y = e.clientY;
    s.active = false;
    s.mins = 0;
    s.px = 0;
    s.shown = 0;

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    s.target = target;

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;

      if (!s.active) {
        const dx = ev.clientX - s.x;
        const dy = ev.clientY - s.y;
        // Horizontal swipe changes 今天/明天/本周; don't arm a time drag.
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          abortPending();
          return;
        }
        if (Math.abs(dy) > SLIP_PX || Math.abs(dx) > SLIP_PX) abortPending();
        return;
      }

      ev.preventDefault();
      const px = clampRef.current(ev.clientY - s.y);
      s.px = px;
      const ppm = pxRef.current;
      const raw = ppm > 0 ? Math.round(px / ppm) : 0;
      const mins = snapRef.current(raw);
      s.mins = mins;
      paint(target, mins * ppm);
      if (mins !== s.shown) {
        s.shown = mins;
        setPreviewMin(mins);
      }
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      finish(pointerId);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    s.unbind = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    s.timer = window.setTimeout(() => {
      if (s.id !== pointerId || !s.target) return;
      try {
        s.target.setPointerCapture(pointerId);
      } catch {
        /* already released */
      }
      activate();
    }, HOLD_MS);
  }

  function onClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const s = drag.current;
    if (s.suppress || s.active) {
      s.suppress = false;
      return;
    }
    onTap();
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return {
    live,
    previewMin,
    bind: {
      onPointerDown,
      onClick,
      onContextMenu,
    },
  };
}
