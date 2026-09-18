import type { MouseEvent } from "react";
import type { EventSlice, FreeSlot, RangeMode, RecruitEvent } from "../types";
import {
  formatDuration,
  formatHM,
  isSameDay,
  mergeBusy,
  TYPE_LABEL,
  weekdayLabel,
} from "../lib/time";

const TYPE_CLASS: Record<RecruitEvent["type"], string> = {
  interview: "bg-accent text-white",
  exam: "bg-[#1c1c1e] text-white",
  assessment: "bg-[#4a5d8c] text-white",
  other: "bg-muted text-white",
};

export function DayColumn({
  day,
  startHour,
  endHour,
  hourHeight,
  slices,
  labeled,
  mode,
  now,
  selected,
  onSelectEvent,
  onSelectFree,
  onPickTime,
}: {
  day: Date;
  startHour: number;
  endHour: number;
  hourHeight: number;
  slices: EventSlice[];
  labeled: FreeSlot[];
  mode: RangeMode;
  now: Date;
  selected: boolean;
  onSelectEvent: (event: RecruitEvent) => void;
  onSelectFree: (slot: FreeSlot) => void;
  onPickTime: (start: Date) => void;
}) {
  const hours = endHour - startHour;
  const height = hours * hourHeight;
  const isToday = isSameDay(day, now);
  const busyMinutes = mergeBusy(slices).reduce(
    (acc, s) => acc + (s.end.getTime() - s.start.getTime()) / 60_000,
    0,
  );
  const windowMinutes = hours * 60;
  const fill = Math.min(1, busyMinutes / windowMinutes);
  const conflicts = slices.some((s) => s.conflicted);
  const compact = mode === "week";

  function topOf(d: Date) {
    const origin = new Date(day);
    origin.setHours(0, 0, 0, 0);
    const h = (d.getTime() - origin.getTime()) / 3_600_000;
    return ((h - startHour) / hours) * height;
  }

  function onBgClick(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = Math.min(1, Math.max(0, y / height));
    const hour = startHour + ratio * hours;
    const t = new Date(day);
    const hh = Math.floor(hour);
    const mm = Math.round(((hour - hh) * 60) / 15) * 15;
    t.setHours(hh, mm, 0, 0);
    if (mm === 60) {
      t.setHours(hh + 1, 0, 0, 0);
    }
    onPickTime(t);
  }

  const nowTop = isToday ? topOf(now) : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[72px] items-end gap-3 px-0.5 pb-2">
        <div>
          <p className="text-[12px] font-medium text-muted">
            {weekdayLabel(day)}
            {isToday ? " · 今天" : ""}
          </p>
          <p
            className={
              selected
                ? "text-[28px] font-semibold tracking-[-0.04em] text-accent"
                : "text-[28px] font-semibold tracking-[-0.04em]"
            }
          >
            {day.getDate()}
          </p>
        </div>
        {conflicts ? (
          <span className="mb-1.5 text-[12px] font-medium text-danger">撞车</span>
        ) : (
          <span className="mb-1.5 text-[12px] text-muted">{Math.round(fill * 100)}% 占用</span>
        )}
      </header>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${conflicts ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${Math.max(fill * 100, fill > 0 ? 4 : 0)}%` }}
        />
      </div>

      <div
        className="relative cursor-pointer rounded-[20px] bg-surface-muted"
        style={{ height }}
        onClick={onBgClick}
        role="presentation"
      >
        {Array.from({ length: hours + 1 }, (_, i) => (
          <div
            key={i}
            className="pointer-events-none absolute right-0 left-0 border-t border-border/80"
            style={{ top: i * hourHeight }}
          />
        ))}

        {labeled.map((slot) => {
          const top = topOf(slot.start);
          const h = Math.max(18, topOf(slot.end) - top);
          return (
            <button
              key={slot.start.toISOString()}
              type="button"
              data-block
              onClick={(e) => {
                e.stopPropagation();
                onSelectFree(slot);
              }}
              className="absolute z-[1] flex items-center justify-center rounded-[10px] text-left text-accent hover:bg-accent-soft"
              style={{
                top: top + 2,
                height: h - 4,
                left: 6,
                right: 6,
              }}
            >
              <span className={`font-medium ${compact ? "text-[11px]" : "text-[12px]"}`}>
                空 {formatDuration(slot.minutes)}
              </span>
            </button>
          );
        })}

        {slices.map((s) => {
          const top = topOf(s.start);
          const h = Math.max(22, topOf(s.end) - top);
          const widthPct = 100 / s.laneCount;
          const dense = h < 40 || compact;
          return (
            <button
              key={s.event.id}
              type="button"
              data-block
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(s.event);
              }}
              className={`absolute z-[2] overflow-hidden rounded-[12px] px-2 py-1 text-left ${TYPE_CLASS[s.event.type]} ${
                s.conflicted ? "ring-2 ring-danger ring-offset-1 ring-offset-surface-muted" : ""
              }`}
              style={{
                top: top + 2,
                height: h - 4,
                left: `calc(${s.lane * widthPct}% + 6px)`,
                width: `calc(${widthPct}% - 10px)`,
              }}
            >
              <p className={`truncate font-semibold ${dense ? "text-[12px]" : "text-[13px]"}`}>
                {s.event.company}
              </p>
              {!dense ? (
                <p className="truncate text-[11px] opacity-80">
                  {TYPE_LABEL[s.event.type]}
                  {s.event.title ? ` · ${s.event.title}` : ""}
                </p>
              ) : null}
              {h > 56 && mode === "today" ? (
                <p className="mt-0.5 text-[11px] opacity-80">
                  {formatHM(s.start)}–{formatHM(s.end)}
                </p>
              ) : null}
            </button>
          );
        })}

        {nowTop !== null && nowTop >= 0 && nowTop <= height ? (
          <div
            className="pointer-events-none absolute right-2 left-2 z-[3] flex items-center"
            style={{ top: nowTop }}
          >
            <span className="size-1.5 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger" />
          </div>
        ) : null}

        {slices.length === 0 && labeled.length === 0 ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-muted">
            全天空闲
          </p>
        ) : null}
      </div>
    </section>
  );
}
