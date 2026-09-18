import type { RecruitEvent } from "../types";
import { usePressActions } from "../lib/press";
import { formatEventSpan, isSameDay, TYPE_LABEL } from "../lib/time";

export function DayDetailList({
  events,
  day,
  onView,
  onMenu,
}: {
  events: RecruitEvent[];
  day: Date;
  onView: (event: RecruitEvent) => void;
  onMenu: (event: RecruitEvent) => void;
}) {
  const items = events
    .filter((e) => isSameDay(new Date(e.start), day) || overlapsDay(e, day))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (items.length === 0) {
    return (
      <div className="px-1 py-4">
        <p className="text-[15px] font-medium">这一天还空着</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          点时间柱上的空白去记录。点一场查看详情，长按编辑或删除。
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => (
        <li key={e.id}>
          <ListRow event={e} onView={() => onView(e)} onMenu={() => onMenu(e)} />
        </li>
      ))}
    </ul>
  );
}

function ListRow({
  event,
  onView,
  onMenu,
}: {
  event: RecruitEvent;
  onView: () => void;
  onMenu: () => void;
}) {
  const press = usePressActions(onView, onMenu);
  return (
    <button
      type="button"
      {...press}
      className="flex w-full items-start justify-between gap-3 rounded-[18px] bg-surface-muted px-4 py-3 text-left select-none hover:bg-[#ececf0]"
      style={{ touchAction: "manipulation" }}
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">{event.company}</p>
        <p className="mt-0.5 text-[13px] text-muted">
          {TYPE_LABEL[event.type]}
          {event.title ? ` · ${event.title}` : ""}
        </p>
      </div>
      <p className="shrink-0 text-[13px] tabular-nums text-muted">
        {formatEventSpan(event)}
      </p>
    </button>
  );
}

function overlapsDay(e: RecruitEvent, day: Date): boolean {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return new Date(e.start) < end && new Date(e.end) > start;
}
