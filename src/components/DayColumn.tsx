import type { MouseEvent } from "react";
import type { EventSlice, FreeSlot, RangeMode, RecruitEvent } from "../types";
import { useBlockDrag } from "../lib/drag";
import {
  deadlineMoment,
  formatDuration,
  formatHM,
  isDeadline,
  isSameDay,
  mergeBusy,
  dragOffsetPx,
  shiftEvent,
  TYPE_LABEL,
  weekdayLabel,
  weekdayShort,
} from "../lib/time";

const TYPE_CLASS: Record<RecruitEvent["type"], string> = {
  interview: "bg-accent text-white",
  exam: "bg-[#1c1c1e] text-white",
  assessment: "bg-[#4a5d8c] text-white",
  jobfair: "bg-[#345c4b] text-white",
  other: "bg-muted text-white",
};

/** Side rails for scrolling; blocks sit inset so a finger can pan the page. */
function sideGutter(compact: boolean): number {
  return compact ? 10 : 22;
}

function laneFrame(lane: number, laneCount: number, gutter: number, gap: number) {
  const track = `100% - ${gutter * 2}px`;
  return {
    left: `calc(${gutter}px + (${track}) * ${lane} / ${laneCount} + ${gap / 2}px)`,
    width: `calc((${track}) / ${laneCount} - ${gap}px)`,
  };
}

export function DayColumn({
  day,
  startHour,
  endHour,
  hourHeight,
  slices,
  pins,
  pending,
  labeled,
  mode,
  now,
  selected,
  headerHeight,
  onViewEvent,
  onShiftEvent,
  onSelectFree,
  onPickTime,
}: {
  day: Date;
  startHour: number;
  endHour: number;
  hourHeight: number;
  slices: EventSlice[];
  pins: RecruitEvent[];
  pending: RecruitEvent[];
  labeled: FreeSlot[];
  mode: RangeMode;
  now: Date;
  selected: boolean;
  headerHeight: number;
  onViewEvent: (event: RecruitEvent) => void;
  onShiftEvent: (event: RecruitEvent) => void;
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
  const pxPerMinute = hourHeight / 60;
  const gutter = sideGutter(compact);

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
      <header
        className={`flex items-end px-0.5 pb-1.5 ${compact ? "justify-center" : "gap-2"}`}
        style={{ height: headerHeight }}
      >
        {compact ? (
          <div className="text-center">
            <p className="text-[10px] font-medium text-muted">{weekdayShort(day)}</p>
            <p
              className={
                selected
                  ? "text-[15px] font-semibold tracking-[-0.03em] text-accent"
                  : "text-[15px] font-semibold tracking-[-0.03em]"
              }
            >
              {day.getDate()}
            </p>
          </div>
        ) : (
          <>
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
              <span className="mb-1 text-[12px] font-medium text-danger">撞车</span>
            ) : (
              <span className="mb-1 text-[12px] text-muted">{Math.round(fill * 100)}% 占用</span>
            )}
          </>
        )}
      </header>

      <div className={`mb-3 overflow-hidden rounded-full bg-border ${compact ? "h-0.5" : "h-1"}`}>
        <div
          className={`h-full rounded-full ${conflicts ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${Math.max(fill * 100, fill > 0 ? 4 : 0)}%` }}
        />
      </div>

      <div
        className={`relative cursor-pointer bg-surface-muted ${compact ? "rounded-[10px]" : "rounded-[20px]"}`}
        style={{ height }}
        onClick={onBgClick}
        role="presentation"
      >
        {pending.length > 0 ? (
          <div className={`absolute top-1.5 right-1 left-1 z-[3] flex flex-wrap ${compact ? "justify-center gap-0.5" : "gap-1"}`}>
            {pending.map((event) => (
              <button
                key={event.id}
                type="button"
                data-block
                aria-label={`${event.company} 时间待定`}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewEvent(event);
                }}
                className={
                  compact
                    ? "size-2 rounded-full bg-accent"
                    : "rounded-[8px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-accent shadow-sm"
                }
              >
                {compact ? null : `${event.company} · 待定`}
              </button>
            ))}
          </div>
        ) : null}

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
                left: gutter,
                right: gutter,
                touchAction: "pan-y",
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
          const dense = h < 40 || compact;
          return (
            <EventChip
              key={s.event.id}
              slice={s}
              top={top}
              height={h}
              gutter={gutter}
              dense={dense}
              compact={compact}
              showTime={h > 56 && mode === "today"}
              pxPerMinute={pxPerMinute}
              day={day}
              onView={() => onViewEvent(s.event)}
              onShift={(deltaMin) => onShiftEvent(shiftEvent(s.event, deltaMin, day))}
            />
          );
        })}

        {layoutPins(pins, topOf, height, compact).map((item) => (
          <AxisPin
            key={item.event.id}
            event={item.event}
            top={item.top}
            compact={compact}
            gutter={gutter}
            pxPerMinute={pxPerMinute}
            day={day}
            onView={() => onViewEvent(item.event)}
            onShift={(deltaMin) => onShiftEvent(shiftEvent(item.event, deltaMin, day))}
          />
        ))}

        {nowTop !== null && nowTop >= 0 && nowTop <= height ? (
          <div
            className="pointer-events-none absolute right-2 left-2 z-[3] flex items-center"
            style={{ top: nowTop }}
          >
            <span className="size-1.5 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger" />
          </div>
        ) : null}

        {slices.length === 0 && labeled.length === 0 && pins.length === 0 && pending.length === 0 && !compact ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-muted">
            全天空闲
          </p>
        ) : null}
      </div>
    </section>
  );
}

function EventChip({
  slice,
  top,
  height,
  gutter,
  dense,
  compact,
  showTime,
  pxPerMinute,
  day,
  onView,
  onShift,
}: {
  slice: EventSlice;
  top: number;
  height: number;
  gutter: number;
  dense: boolean;
  compact: boolean;
  showTime: boolean;
  pxPerMinute: number;
  day: Date;
  onView: () => void;
  onShift: (deltaMin: number) => void;
}) {
  const { live, previewMin, bind } = useBlockDrag(pxPerMinute, onView, onShift, (dy) =>
    dragOffsetPx(slice.event, dy, pxPerMinute, day),
  );
  const moved = shiftEvent(slice.event, previewMin, day);
  const timeLabel = `${formatHM(new Date(moved.start))}–${formatHM(new Date(moved.end))}`;
  const frame = laneFrame(slice.lane, slice.laneCount, gutter, compact ? 2 : 4);
  if (compact) {
    return (
      <button
        type="button"
        data-block
        aria-label={`${slice.event.company} ${TYPE_LABEL[slice.event.type]} ${timeLabel}`}
        {...bind}
        className={`absolute select-none rounded-[5px] ${TYPE_CLASS[slice.event.type]} ${
          slice.conflicted ? "ring-1 ring-danger" : ""
        } ${live ? "z-[6] shadow-lg" : "z-[2]"}`}
        style={{
          top: top + 1,
          height: Math.max(8, height - 2),
          ...frame,
          willChange: live ? "transform" : undefined,
        }}
      />
    );
  }
  return (
    <button
      type="button"
      data-block
      {...bind}
        className={`absolute overflow-hidden rounded-[12px] px-2 py-1 text-left select-none ${TYPE_CLASS[slice.event.type]} ${
        slice.conflicted ? "ring-2 ring-danger ring-offset-1 ring-offset-surface-muted" : ""
      } ${live ? "z-[6] shadow-lg" : "z-[2]"}`}
        style={{
          top: top + 2,
          height: height - 4,
          ...frame,
          willChange: live ? "transform" : undefined,
        }}
    >
      <p className={`truncate font-semibold ${dense ? "text-[12px]" : "text-[13px]"}`}>
        {slice.event.company}
      </p>
      {!dense ? (
        <p className="truncate text-[11px] opacity-80">
          {TYPE_LABEL[slice.event.type]}
          {slice.event.kind === "deadline"
            ? " · 截止"
            : slice.event.title
              ? ` · ${slice.event.title}`
              : ""}
        </p>
      ) : null}
      {showTime || live ? (
        <p className="mt-0.5 text-[11px] opacity-80">{timeLabel}</p>
      ) : null}
    </button>
  );
}

function pinAt(event: RecruitEvent): Date {
  return isDeadline(event) ? deadlineMoment(event) : new Date(event.start);
}

function layoutPins(
  pins: RecruitEvent[],
  topOf: (d: Date) => number,
  height: number,
  compact: boolean,
): { event: RecruitEvent; top: number }[] {
  const sorted = [...pins].sort((a, b) => pinAt(a).getTime() - pinAt(b).getTime());
  const gap = compact ? 8 : 22;
  const out: { event: RecruitEvent; top: number }[] = [];
  let last = -999;
  for (const event of sorted) {
    let top = Math.min(height - gap, Math.max(0, topOf(pinAt(event))));
    if (top - last < gap) top = last + gap;
    last = top;
    out.push({ event, top });
  }
  return out;
}

function AxisPin({
  event,
  top,
  compact,
  gutter,
  pxPerMinute,
  day,
  onView,
  onShift,
}: {
  event: RecruitEvent;
  top: number;
  compact: boolean;
  gutter: number;
  pxPerMinute: number;
  day: Date;
  onView: () => void;
  onShift: (deltaMin: number) => void;
}) {
  const { live, previewMin, bind } = useBlockDrag(pxPerMinute, onView, onShift, (dy) =>
    dragOffsetPx(event, dy, pxPerMinute, day),
  );
  const moved = shiftEvent(event, previewMin, day);
  const at = pinAt(moved);
  const hm = formatHM(at);
  const label = isDeadline(event)
    ? `截止 ${hm} · ${event.company}`
    : event.type === "exam"
      ? `开考 ${hm} · ${event.company}`
      : `开始 ${hm} · ${event.company}`;
  if (compact) {
    return (
      <button
        type="button"
        data-block
        aria-label={label}
        {...bind}
        className={`absolute select-none rounded-[3px] ${TYPE_CLASS[event.type]} ${live ? "z-[6] shadow-lg" : "z-[3]"}`}
        style={{
          top: Math.max(2, top - 3),
          height: 6,
          left: gutter,
          right: gutter,
          willChange: live ? "transform" : undefined,
        }}
      />
    );
  }
  return (
    <button
      type="button"
      data-block
      {...bind}
      className={`absolute flex items-center gap-1.5 rounded-[10px] px-2 py-0.5 text-left text-white select-none ${TYPE_CLASS[event.type]} ${live ? "z-[6] shadow-lg" : "z-[3]"}`}
      style={{
        top: Math.max(4, top - 11),
        left: gutter,
        right: gutter,
        willChange: live ? "transform" : undefined,
      }}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-white" />
      <span className={`truncate font-medium ${compact ? "text-[11px]" : "text-[12px]"}`}>
        {label}
      </span>
    </button>
  );
}
