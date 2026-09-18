import type { FreeSlot, RangeMode, RecruitEvent } from "../types";
import {
  conflictClusterCount,
  daysForRange,
  eventTouchesDay,
  freeSlotsOnDay,
  hoursWindow,
  axisPins,
  isAllDay,
  isDeadline,
  isOpenStart,
  labeledFrees,
  layoutDayEvents,
  longestFree,
  formatDuration,
  occupancyEvents,
} from "../lib/time";
import { DayColumn } from "./DayColumn";

const HOUR_HEIGHT: Record<RangeMode, number> = {
  today: 64,
  upcoming: 50,
  week: 40,
};

export function OccupancyBoard({
  events,
  mode,
  now,
  selectedDay,
  onViewEvent,
  onEventMenu,
  onSelectFree,
  onPickTime,
}: {
  events: RecruitEvent[];
  mode: RangeMode;
  now: Date;
  selectedDay: Date;
  onViewEvent: (event: RecruitEvent) => void;
  onEventMenu: (event: RecruitEvent) => void;
  onSelectFree: (slot: FreeSlot) => void;
  onPickTime: (start: Date) => void;
}) {
  const days = daysForRange(mode, now);
  const { startHour, endHour } = hoursWindow(
    occupancyEvents(events).concat(axisPins(events)),
    days,
  );
  const hours = endHour - startHour;
  const hourHeight = HOUR_HEIGHT[mode];

  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
      <div className="sticky left-0 z-[4] flex w-10 shrink-0 flex-col bg-surface">
        <div className="h-[72px]" />
        <div className="mb-3 h-1" />
        {Array.from({ length: hours + 1 }, (_, i) => (
          <div
            key={i}
            className="relative text-right text-[11px] leading-none text-muted"
            style={{ height: i === hours ? 0 : hourHeight }}
          >
            <span className="absolute right-0 -translate-y-1/2">
              {String(startHour + i).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
      <div className={`flex min-w-0 flex-1 gap-4 ${mode === "week" ? "min-w-[720px]" : ""}`}>
        {days.map((day) => {
          const occ = occupancyEvents(events);
          const slices = layoutDayEvents(occ, day);
          const frees = freeSlotsOnDay(occ, day, startHour, endHour);
          const pins = axisPins(events).filter((e) => eventTouchesDay(e, day));
          const pending = events.filter((e) => isAllDay(e) && eventTouchesDay(e, day));
          return (
            <DayColumn
              key={day.toISOString()}
              day={day}
              startHour={startHour}
              endHour={endHour}
              hourHeight={hourHeight}
              slices={slices}
              pins={pins}
              pending={pending}
              labeled={labeledFrees(frees, mode)}
              mode={mode}
              now={now}
              selected={day.toDateString() === selectedDay.toDateString()}
              onViewEvent={onViewEvent}
              onEventMenu={onEventMenu}
              onSelectFree={onSelectFree}
              onPickTime={onPickTime}
            />
          );
        })}
      </div>
    </div>
  );
}

export function RangeSummary({
  events,
  mode,
  now,
}: {
  events: RecruitEvent[];
  mode: RangeMode;
  now: Date;
}) {
  const days = daysForRange(mode, now);
  const occ = occupancyEvents(events);
  const { startHour, endHour } = hoursWindow(occ.concat(axisPins(events)), days);
  let eventCount = 0;
  let longest = 0;
  let ddlCount = 0;
  let openCount = 0;
  let pendingCount = 0;
  for (const day of days) {
    const slices = layoutDayEvents(occ, day);
    eventCount += slices.length;
    ddlCount += events.filter((e) => isDeadline(e) && eventTouchesDay(e, day)).length;
    openCount += events.filter((e) => isOpenStart(e) && eventTouchesDay(e, day)).length;
    pendingCount += events.filter((e) => isAllDay(e) && eventTouchesDay(e, day)).length;
    const longestDay = longestFree(freeSlotsOnDay(occ, day, startHour, endHour));
    if (longestDay) longest = Math.max(longest, longestDay.minutes);
  }
  const conflicts = conflictClusterCount(occ, days);
  const rangeWord = mode === "today" ? "今天" : mode === "upcoming" ? "这几天" : "本周";

  return (
    <p className="text-[15px] text-muted">
      {rangeWord} {eventCount} 场
      {ddlCount > 0 ? (
        <>
          <span className="mx-2 text-border">·</span>
          {ddlCount} 个截止
        </>
      ) : null}
      {openCount > 0 ? (
        <>
          <span className="mx-2 text-border">·</span>
          {openCount} 个开考
        </>
      ) : null}
      {pendingCount > 0 ? (
        <>
          <span className="mx-2 text-border">·</span>
          {pendingCount} 个待定
        </>
      ) : null}
      <span className="mx-2 text-border">·</span>
      空闲最长 {longest > 0 ? formatDuration(longest) : "无"}
      {conflicts > 0 ? (
        <>
          <span className="mx-2 text-border">·</span>
          <span className="text-danger">{conflicts} 处重合</span>
        </>
      ) : (
        <>
          <span className="mx-2 text-border">·</span>
          没有重合
        </>
      )}
    </p>
  );
}
