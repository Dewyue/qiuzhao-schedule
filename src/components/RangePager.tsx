import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { RangeMode } from "../types";

const ORDER: RangeMode[] = ["today", "tomorrow", "week"];

const AXIS = 1.15;
const COMMIT_RATIO = 0.18;
const FLING = 0.45;

export function RangePager({
  mode,
  onChange,
  renderPage,
}: {
  mode: RangeMode;
  onChange: (mode: RangeMode) => void;
  renderPage: (mode: RangeMode) => ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  const onChangeRef = useRef(onChange);
  modeRef.current = mode;
  onChangeRef.current = onChange;

  function place(dx: number, animate: boolean) {
    const view = viewportRef.current;
    const track = trackRef.current;
    if (!view || !track) return;
    const index = Math.max(0, ORDER.indexOf(modeRef.current));
    const w = view.clientWidth || 1;
    track.style.transition = animate
      ? "transform 340ms cubic-bezier(0.22, 0.8, 0.28, 1)"
      : "none";
    track.style.transform = `translate3d(${-index * w + dx}px, 0, 0)`;
  }

  const placed = useRef(false);
  useLayoutEffect(() => {
    place(0, placed.current);
    placed.current = true;
  }, [mode]);

  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;
    const ro = new ResizeObserver(() => place(0, false));
    ro.observe(view);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;

    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let tracking = false;
    let axis: "h" | "v" | null = null;
    let claimed = false;
    let suppressClick = false;
    let origin: HTMLElement | null = null;
    let fromTouch = false;

    function weekScroller(from: EventTarget | null): HTMLElement | null {
      const el = from instanceof Element ? from.closest("[data-week-scroll]") : null;
      return el instanceof HTMLElement ? el : null;
    }

    function weekCanScroll(scroller: HTMLElement, dx: number): boolean {
      if (modeRef.current !== "week") return false;
      if (dx < 0) return scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
      if (dx > 0) return scroller.scrollLeft > 2;
      return false;
    }

    function resist(dx: number): number {
      const index = ORDER.indexOf(modeRef.current);
      if (index <= 0 && dx > 0) return dx * 0.32;
      if (index >= ORDER.length - 1 && dx < 0) return dx * 0.32;
      return dx;
    }

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as Element | null)?.closest?.("[data-block]")) return;
      tracking = true;
      claimed = false;
      axis = null;
      fromTouch = e.pointerType !== "mouse";
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = e.clientY;
      lastT = e.timeStamp;
      velocity = 0;
      origin = e.target instanceof HTMLElement ? e.target : null;
    }

    function follow(clientX: number, clientY: number, timeStamp: number) {
      if (!tracking) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dt = timeStamp - lastT;
      if (dt > 0) velocity = (clientX - lastX) / dt;
      lastX = clientX;
      lastT = timeStamp;

      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) * AXIS ? "h" : "v";
        if (axis === "v") {
          tracking = false;
          return;
        }
        const scroller = weekScroller(origin);
        if (scroller && weekCanScroll(scroller, dx)) {
          tracking = false;
          return;
        }
        claimed = true;
      }
      if (!claimed) return;
      place(resist(dx), false);
    }

    function onMove(e: PointerEvent) {
      if (fromTouch || !tracking || e.pointerId !== pointerId) return;
      follow(e.clientX, e.clientY, e.timeStamp);
      if (claimed && e.cancelable) e.preventDefault();
    }

    function finish(e: PointerEvent) {
      if (!tracking && !claimed) return;
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const was = claimed;
      tracking = false;
      claimed = false;
      pointerId = -1;
      if (!was || axis !== "h") {
        place(0, false);
        return;
      }
      const w = viewportRef.current?.clientWidth || 1;
      const index = ORDER.indexOf(modeRef.current);
      let next = index;
      if (dx <= -w * COMMIT_RATIO || velocity <= -FLING) next = Math.min(ORDER.length - 1, index + 1);
      else if (dx >= w * COMMIT_RATIO || velocity >= FLING) next = Math.max(0, index - 1);
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 380);
      if (next !== index) onChangeRef.current(ORDER[next]);
      else place(0, true);
      axis = null;
    }

    function onClickCapture(e: MouseEvent) {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!fromTouch || !tracking) return;
      const t = e.touches[0];
      if (!t) return;
      follow(t.clientX, t.clientY, e.timeStamp);
      if (claimed && e.cancelable) e.preventDefault();
    }

    view.addEventListener("pointerdown", onDown);
    view.addEventListener("click", onClickCapture, true);
    view.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("click", onClickCapture, true);
      view.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, []);

  return (
    <div ref={viewportRef} className="overflow-hidden">
      <div ref={trackRef} className="flex w-[300%]" style={{ willChange: "transform" }}>
        {ORDER.map((page) => (
          <div key={page} className="w-1/3 shrink-0">
            {renderPage(page)}
          </div>
        ))}
      </div>
    </div>
  );
}
