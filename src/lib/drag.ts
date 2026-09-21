import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

const HOLD_MS = 200;

export function useBlockDrag(
  pxPerMinute: number,
  onTap: () => void,
  onCommit: (deltaMin: number) => void,
  clampPx: (dy: number) => number = (dy) => dy,
) {
  const [live, setLive] = useState(false);
  const [previewMin, setPreviewMin] = useState(0);
  const drag = useRef({
    id: -1,
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

  function activate() {
    const s = drag.current;
    if (s.active || !s.target) return;
    s.active = true;
    setLive(true);
    setPreviewMin(0);
    paint(s.target, 0);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
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
    e.stopPropagation();

    const s = drag.current;
    s.unbind?.();
    window.clearTimeout(s.timer);

    s.suppress = false;
    s.id = e.pointerId;
    s.y = e.clientY;
    s.active = false;
    s.mins = 0;
    s.px = 0;
    s.shown = 0;

    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    s.target = target;

    try {
      target.setPointerCapture(pointerId);
    } catch {
      /* already released */
    }

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      // Own the gesture for the whole press so the page cannot scroll.
      ev.preventDefault();
      if (!s.active) return;
      const px = clampRef.current(ev.clientY - s.y);
      s.px = px;
      const ppm = pxRef.current;
      s.mins = ppm > 0 ? Math.round(px / ppm) : 0;
      paint(target, px);
      if (s.mins !== s.shown) {
        s.shown = s.mins;
        setPreviewMin(s.mins);
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
      if (s.id !== pointerId) return;
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
