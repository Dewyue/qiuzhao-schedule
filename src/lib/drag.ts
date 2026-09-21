import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

const HOLD_MS = 320;
const SLOP = 8;

export function useBlockDrag(
  pxPerMinute: number,
  onTap: () => void,
  onCommit: (deltaMin: number) => void,
  clampPx: (dy: number) => number = (dy) => dy,
) {
  const [live, setLive] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const drag = useRef({
    id: -1,
    x: 0,
    y: 0,
    timer: 0,
    holding: false,
    moved: false,
    suppress: false,
    px: 0,
    mins: 0,
    shown: 0,
  });
  const clampRef = useRef(clampPx);
  clampRef.current = clampPx;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    if (!live) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [live]);

  useEffect(() => {
    return () => {
      window.clearTimeout(drag.current.timer);
    };
  }, []);

  function clearTimer() {
    window.clearTimeout(drag.current.timer);
    drag.current.timer = 0;
  }

  function finish(pointerId: number) {
    const s = drag.current;
    if (s.id !== pointerId) return;
    clearTimer();
    const held = s.holding;
    const mins = s.mins;
    s.holding = false;
    s.id = -1;
    s.mins = 0;
    s.px = 0;
    s.shown = 0;
    if (!held) return;
    setLive(false);
    setOffsetPx(0);
    s.suppress = true;
    window.setTimeout(() => {
      s.suppress = false;
    }, 400);
    if (mins !== 0) commitRef.current(mins);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const s = drag.current;
    s.suppress = false;
    s.id = e.pointerId;
    s.x = e.clientX;
    s.y = e.clientY;
    s.holding = false;
    s.moved = false;
    s.mins = 0;
    s.px = 0;
    clearTimer();
    const target = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - s.x;
      const dy = ev.clientY - s.y;
      if (!s.holding) {
        if (Math.hypot(dx, dy) > SLOP) {
          clearTimer();
          s.moved = true;
        }
        return;
      }
      ev.preventDefault();
      const px = clampRef.current(dy);
      s.px = px;
      s.mins = pxPerMinute > 0 ? Math.round(px / pxPerMinute) : 0;
      target.style.transition = "none";
      target.style.transform = px ? `translateY(${px}px)` : "";
      if (s.mins !== s.shown) {
        s.shown = s.mins;
        setOffsetPx(px);
      }
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      finish(pointerId);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    s.timer = window.setTimeout(() => {
      if (s.id !== pointerId) return;
      s.holding = true;
      setLive(true);
      setOffsetPx(0);
      try {
        target.setPointerCapture(pointerId);
      } catch {
        /* pointer already released */
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    }, HOLD_MS);
  }

  function onClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const s = drag.current;
    if (s.suppress || s.holding || s.moved) {
      s.suppress = false;
      s.moved = false;
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
    offsetPx,
    bind: {
      onPointerDown,
      onClick,
      onContextMenu,
    },
  };
}
