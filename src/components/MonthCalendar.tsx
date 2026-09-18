import { useMemo, useState } from "react";
import {
  eventStatus,
  eventTouchesDay,
  formatEventSpan,
  formatMD,
  isSameDay,
  monthGrid,
  startOfDay,
  TYPE_LABEL,
  weekdayLabel,
} from "../lib/time";
import type { RecruitEvent } from "../types";

export function MonthCalendar({
  events,
  now,
  selected,
  onSelectDay,
  onView,
}: {
  events: RecruitEvent[];
  now: Date;
  selected: Date;
  onSelectDay: (day: Date) => void;
  onView: (event: RecruitEvent) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const today = startOfDay(now);

  const dayEvents = events
    .filter((e) => eventTouchesDay(e, selected))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <section>
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">整月日历</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-9 w-9 text-[18px] text-muted"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="上个月"
          >
            ‹
          </button>
          <p className="min-w-[7.5rem] text-center text-[15px] font-medium">
            {year}年{month + 1}月
          </p>
          <button
            type="button"
            className="h-9 w-9 text-[18px] text-muted"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="下个月"
          >
            ›
          </button>
        </div>
      </div>
      <p className="mt-1 text-[13px] text-muted">灰点已完成，蓝点未完成。今天数字为蓝色。</p>

      <div className="mt-4 grid grid-cols-7 text-center text-[12px] text-muted">
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const onDay = events.filter((e) => eventTouchesDay(e, date));
          const done = onDay.filter((e) => eventStatus(e, now) === "done").length;
          const open = onDay.length - done;
          const isToday = isSameDay(date, today);
          const isPastDay = date.getTime() < today.getTime();
          const isSelected = isSameDay(date, selected);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDay(startOfDay(date))}
              className={`flex flex-col items-center rounded-[12px] py-1.5 ${
                isSelected ? "bg-accent-soft" : ""
              }`}
            >
              <span
                className={`text-[15px] tabular-nums ${
                  isToday
                    ? "font-semibold text-accent"
                    : isPastDay
                      ? "text-muted"
                      : "text-foreground"
                }`}
              >
                {date.getDate()}
              </span>
              <span className="mt-0.5 flex h-2 items-center justify-center gap-0.5">
                {done > 0 ? <span className="size-1 rounded-full bg-muted" /> : null}
                {open > 0 ? <span className="size-1 rounded-full bg-accent" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-medium text-muted">
          {formatMD(selected)} {weekdayLabel(selected)}
          {isSameDay(selected, today) ? " · 今天" : selected.getTime() < today.getTime() ? " · 过去" : " · 未来"}
        </p>
        {dayEvents.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">这一天没有日程</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <EventRow event={e} now={now} onView={() => onView(e)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function EventRow({
  event,
  now,
  onView,
}: {
  event: RecruitEvent;
  now: Date;
  onView: () => void;
}) {
  const status = eventStatus(event, now);
  const label = status === "done" ? "已完成" : status === "live" ? "进行中" : "未完成";
  return (
    <button
      type="button"
      onClick={onView}
      className="flex w-full items-start justify-between gap-3 rounded-[16px] bg-surface-muted px-4 py-3 text-left"
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">{event.company}</p>
        <p className="mt-0.5 text-[13px] text-muted">
          {TYPE_LABEL[event.type]}
          {event.title ? ` · ${event.title}` : ""}
          {" · "}
          {formatEventSpan(event)}
        </p>
      </div>
      <span
        className={`shrink-0 text-[12px] font-medium ${
          status === "done" ? "text-muted" : status === "live" ? "text-danger" : "text-accent"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
