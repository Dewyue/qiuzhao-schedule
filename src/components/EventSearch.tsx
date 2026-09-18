import { useMemo, useState } from "react";
import { eventStatus, formatMD, TYPE_LABEL, weekdayLabel } from "../lib/time";
import type { RecruitEvent } from "../types";
import { EventRow } from "./MonthCalendar";

export function EventSearch({
  events,
  now,
  onView,
}: {
  events: RecruitEvent[];
  now: Date;
  onView: (event: RecruitEvent) => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "done" | "open">("all");

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => {
        const status = eventStatus(e, now);
        if (scope === "done" && status !== "done") return false;
        if (scope === "open" && status === "done") return false;
        if (!q) return false;
        const bag = [
          e.company,
          e.title,
          TYPE_LABEL[e.type],
          e.location ?? "",
          e.notes ?? "",
          formatMD(new Date(e.start)),
          e.kind === "deadline" ? "截止 ddl" : "",
          e.kind === "open" ? "开考 时长待定" : "",
          e.kind === "allday" ? "时间待定 当天" : "",
          e.type === "jobfair" ? "双选会" : "",
        ]
          .join(" ")
          .toLowerCase();
        return bag.includes(q);
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, now, query, scope]);

  const grouped = useMemo(() => {
    const map = new Map<string, { day: Date; items: RecruitEvent[] }>();
    for (const e of hits) {
      const day = new Date(e.start);
      day.setHours(0, 0, 0, 0);
      const key = day.toISOString();
      const bucket = map.get(key) ?? { day, items: [] };
      bucket.items.push(e);
      map.set(key, bucket);
    }
    return [...map.values()];
  }, [hits]);

  return (
    <section>
      <h3 className="text-[17px] font-semibold tracking-[-0.02em]">查找</h3>
      <p className="mt-1 text-[13px] text-muted">按公司、场次、地点、备注搜到具体日期和那一场。</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例如 字节、一面、笔试"
        className="mt-3 h-11 w-full rounded-[12px] bg-surface-muted px-3 text-[15px] outline-none"
      />
      <div className="mt-3 flex gap-2">
        {(
          [
            ["all", "全部"],
            ["open", "未完成"],
            ["done", "已完成"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setScope(id)}
            className={
              scope === id
                ? "h-8 rounded-[10px] bg-accent px-3 text-[13px] font-medium text-white"
                : "h-8 rounded-[10px] bg-surface-muted px-3 text-[13px] font-medium text-muted"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {query.trim() ? (
        grouped.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted">没有匹配的日程</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {grouped.map((g) => (
              <div key={g.day.toISOString()}>
                <p className="mb-2 text-[13px] font-medium text-muted">
                  {formatMD(g.day)} {weekdayLabel(g.day)} · {g.items.length} 场
                </p>
                <ul className="flex flex-col gap-2">
                  {g.items.map((e) => (
                    <li key={e.id}>
                      <EventRow event={e} now={now} onView={() => onView(e)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className="mt-4 text-[14px] text-muted">输入关键词后按日期列出结果</p>
      )}
    </section>
  );
}
