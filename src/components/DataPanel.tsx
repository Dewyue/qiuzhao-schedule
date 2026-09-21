import { useMemo, useRef, useState } from "react";
import { downloadEventsJson, parseEventList } from "../lib/storage";
import { eventStatus, startOfDay } from "../lib/time";
import type { RecruitEvent } from "../types";
import { EventSearch } from "./EventSearch";
import { MonthCalendar } from "./MonthCalendar";

export function DataPanel({
  events,
  now,
  onImport,
  onView,
}: {
  events: RecruitEvent[];
  now: Date;
  onImport: (events: RecruitEvent[]) => void;
  onView: (event: RecruitEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => startOfDay(now));

  const stats = useMemo(() => {
    const today = startOfDay(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let past = 0;
    let present = 0;
    let future = 0;
    let done = 0;
    let open = 0;
    for (const e of events) {
      const start = new Date(e.start);
      const end = new Date(e.end);
      if (end.getTime() <= today.getTime()) past += 1;
      else if (start.getTime() >= tomorrow.getTime()) future += 1;
      else present += 1;
      if (eventStatus(e, now) === "done") done += 1;
      else open += 1;
    }
    return { past, present, future, done, open };
  }, [events, now]);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseEventList(JSON.parse(String(reader.result)));
        onImport(parsed);
        setMessage(`已导入 ${parsed.length} 场，保存在本机浏览器`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "无法读取这个 JSON");
      }
    };
    reader.readAsText(file);
  }

  return (
    <section className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">数据管理</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          用整月日历看过去、今天和以后；用查找定位到哪一天的哪一场。点开后可编辑或删除。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Stat label="过去" value={stats.past} />
        <Stat label="今天" value={stats.present} />
        <Stat label="未来" value={stats.future} />
        <Stat label="已完成" value={stats.done} />
        <Stat label="未完成" value={stats.open} />
      </div>

      <MonthCalendar
        events={events}
        now={now}
        selected={selected}
        onSelectDay={setSelected}
        onView={onView}
      />

      <EventSearch events={events} now={now} onView={onView} />

      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">备份</h3>
        <p className="mt-1 text-[13px] text-muted">本机 {events.length} 场。换设备前先导出 JSON。</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              downloadEventsJson(events);
              setMessage("已下载 JSON，日程仍留在这台浏览器里");
            }}
            className="h-11 rounded-[12px] bg-accent px-5 text-[15px] font-medium text-white hover:bg-accent-hover sm:flex-1"
          >
            导出 JSON
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-11 rounded-[12px] bg-surface-muted px-5 text-[15px] font-medium sm:flex-1"
          >
            导入 JSON
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
        {message ? <p className="mt-3 text-[13px] text-muted">{message}</p> : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] bg-surface-muted px-3 py-3">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
    </div>
  );
}
