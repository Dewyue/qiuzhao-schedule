import type { RecruitEvent } from "../types";
import { formatHM, isSameDay, TYPE_LABEL } from "../lib/time";

export function DayDetailList({
  events,
  day,
  onSelect,
}: {
  events: RecruitEvent[];
  day: Date;
  onSelect: (event: RecruitEvent) => void;
}) {
  const items = events
    .filter((e) => isSameDay(new Date(e.start), day) || overlapsDay(e, day))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] bg-surface-muted px-5 py-6">
        <p className="text-[15px] font-medium">这一天还空着</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          点时间柱上的空白，或右侧记下公司、时间和类型。空闲段会标出最长可排的间隔。
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            onClick={() => onSelect(e)}
            className="flex w-full items-start justify-between gap-3 rounded-[18px] bg-surface-muted px-4 py-3 text-left hover:bg-[#ececf0]"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">{e.company}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {TYPE_LABEL[e.type]}
                {e.title ? ` · ${e.title}` : ""}
              </p>
            </div>
            <p className="shrink-0 text-[13px] tabular-nums text-muted">
              {formatHM(new Date(e.start))}–{formatHM(new Date(e.end))}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function overlapsDay(e: RecruitEvent, day: Date): boolean {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return new Date(e.start) < end && new Date(e.end) > start;
}
