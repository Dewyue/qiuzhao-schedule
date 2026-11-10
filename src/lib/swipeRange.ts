import { useEffect, useRef, type RefObject } from "react";
import type { RangeMode } from "../types";

export const RANGE_ORDER: RangeMode[] = ["today", "tomorrow", "week"];

const AXIS_RATIO = 1.4;
const MIN_DX = 56;

export function adjacentRange(mode: RangeMode, dir: -1 | 1): RangeMode | null {
  const i = RANGE_ORDER.indexOf(mode);
  if (i < 0) return null;
  const next = RANGE_ORDER[i + dir];
  return next ?? null;
}

/**
 * Horizontal swipe on `ref` switches 今天 → 明天 → 本周.
 * Vertical scrolls and in-block drags are ignored. In 本周, native day-scroll
 * wins unless the board is already at the left edge (then swipe-right → 明天).
 */
export function useSwipeRange(
  ref: RefObject<HTMLElement | null>,
  mode: RangeMode,
  onChange: (mode: RangeMode) => void,
  enabled: boolean,
) {
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let locked: "h" | "v" | null = null;
    let pointerId = -1;

    function weekScroller(): HTMLElement | null {
      return root!.querySelector("[data-week-scroll]");
    }

    function onDown(e: PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as HTMLElement | null)?.closest?.("[data-block]")) return;
      tracking = true;
      locked = null;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
    }

    function onMove(e: PointerEvent) {
      if (!tracking || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!locked) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        locked = Math.abs(dx) > Math.abs(dy) * AXIS_RATIO ? "h" : "v";
      }
    }

    function onUp(e: PointerEvent) {
      if (!tracking || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      tracking = false;
      pointerId = -1;
      const axis = locked;
      locked = null;
      if (axis !== "h") return;
      if (Math.abs(dx) < MIN_DX || Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) return;

      const current = modeRef.current;
      if (current === "week") {
        const scroller = weekScroller();
        // Swipe right at the left edge → 明天. Otherwise the week board owns horizontal pans.
        if (dx > 0 && (scroller?.scrollLeft ?? 0) <= 2) {
          const prev = adjacentRange(current, -1);
          if (prev) onChangeRef.current(prev);
        }
        return;
      }

      // Swipe left → next range; swipe right → previous.
      const dir: -1 | 1 = dx < 0 ? 1 : -1;
      const next = adjacentRange(current, dir);
      if (next) onChangeRef.current(next);
    }

    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ref, enabled]);
}
