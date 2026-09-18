import type { RangeMode } from "../types";

const MODES: { id: RangeMode; label: string }[] = [
  { id: "today", label: "今天" },
  { id: "tomorrow", label: "明天" },
  { id: "week", label: "本周" },
];

export function RangeSwitch({
  value,
  onChange,
}: {
  value: RangeMode;
  onChange: (mode: RangeMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="查看范围"
      className="inline-flex rounded-[14px] bg-surface-muted p-1"
    >
      {MODES.map((m) => {
        const active = m.id === value;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(m.id)}
            className={
              active
                ? "rounded-[11px] bg-surface px-3 py-1.5 text-[13px] font-medium text-foreground"
                : "rounded-[11px] px-3 py-1.5 text-[13px] font-medium text-muted hover:text-foreground"
            }
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
