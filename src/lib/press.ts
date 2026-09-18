import type { MouseEvent, PointerEvent } from "react";
import { useRef } from "react";

const LONG_MS = 500;

export function usePressActions(onPress: () => void, onLongPress: () => void) {
  const timer = useRef(0);
  const long = useRef(false);

  function clear() {
    window.clearTimeout(timer.current);
    timer.current = 0;
  }

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      long.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        long.current = true;
        onLongPress();
      }, LONG_MS);
    },
    onPointerUp: () => clear(),
    onPointerLeave: () => clear(),
    onPointerCancel: () => clear(),
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      clear();
      long.current = true;
      onLongPress();
    },
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (long.current) {
        long.current = false;
        return;
      }
      onPress();
    },
  };
}
