import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { TYPE_LABEL, toDatetimeLocal } from "../lib/time";
import type { EventType, RecruitEvent } from "../types";

const ROUNDS = ["一面", "二面"] as const;
const DURATION_MINUTES = Array.from({ length: 24 }, (_, i) => (i + 1) * 10);

type Draft = Omit<RecruitEvent, "id">;

export function EventForm({
  draft,
  editing,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: Draft;
  editing: RecruitEvent | null;
  onSave: (data: Draft) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const source = editing ?? draft;
  const [company, setCompany] = useState(source.company);
  const [type, setType] = useState<EventType>(source.type);
  const [title, setTitle] = useState(source.title);
  const [start, setStart] = useState(source.start ? toDatetimeLocal(new Date(source.start)) : "");
  const [end, setEnd] = useState(source.end ? toDatetimeLocal(new Date(source.end)) : "");
  const [location, setLocation] = useState(source.location ?? "");
  const [notes, setNotes] = useState(source.notes ?? "");
  const [duration, setDuration] = useState(minutesBetween(source.start, source.end));

  useEffect(() => {
    const next = editing ?? draft;
    setCompany(next.company);
    setType(next.type);
    setTitle(next.title);
    setStart(next.start ? toDatetimeLocal(new Date(next.start)) : "");
    setEnd(next.end ? toDatetimeLocal(new Date(next.end)) : "");
    setLocation(next.location ?? "");
    setNotes(next.notes ?? "");
    setDuration(minutesBetween(next.start, next.end));
  }, [editing, draft]);

  const durationOptions = useMemo(() => {
    if (duration && !DURATION_MINUTES.includes(duration)) {
      return [...DURATION_MINUTES, duration].sort((a, b) => a - b);
    }
    return DURATION_MINUTES;
  }, [duration]);

  function applyDuration(mins: number, startLocal: string) {
    setDuration(mins);
    if (!startLocal || !mins) {
      setEnd("");
      return;
    }
    const s = new Date(startLocal);
    if (Number.isNaN(s.getTime())) return;
    setEnd(toDatetimeLocal(new Date(s.getTime() + mins * 60_000)));
  }

  function handleStartChange(value: string) {
    setStart(value);
    if (duration) applyDuration(duration, value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!company.trim() || !start || !end) return;
    if (type === "interview" && !title) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!(endDate.getTime() > startDate.getTime())) return;
    onSave({
      company: company.trim(),
      type,
      title: type === "interview" ? title : "",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: type === "exam" ? undefined : location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-medium text-accent">{editing ? "编辑日程" : "新的一场"}</p>
        <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.03em]">
          {editing ? editing.company || "编辑" : "填写后记下"}
        </h2>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">公司</span>
        <input
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="公司名称"
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">类型</span>
        <select
          value={type}
          onChange={(e) => {
            const next = e.target.value as EventType;
            setType(next);
            if (next !== "interview") setTitle("");
            if (next === "exam") setLocation("");
          }}
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        >
          {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      {type === "interview" ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-[13px] text-muted">场次</legend>
          <div className="flex gap-2">
            {ROUNDS.map((round) => (
              <button
                key={round}
                type="button"
                onClick={() => setTitle(round)}
                className={
                  title === round
                    ? "h-10 flex-1 rounded-[12px] bg-accent text-[14px] font-medium text-white"
                    : "h-10 flex-1 rounded-[12px] bg-surface text-[14px] font-medium text-foreground"
                }
              >
                {round}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">开始</span>
        <input
          type="datetime-local"
          required
          value={start}
          onChange={(e) => handleStartChange(e.target.value)}
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">时长</span>
        <select
          value={duration || ""}
          onChange={(e) => applyDuration(Number(e.target.value), start)}
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        >
          <option value="">先选时长</option>
          {durationOptions.map((mins) => (
            <option key={mins} value={mins}>
              {labelDuration(mins)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">结束</span>
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => {
            setEnd(e.target.value);
            setDuration(minutesBetween(start, e.target.value));
          }}
          placeholder="由时长填入"
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        />
      </label>

      {type !== "exam" ? (
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">链接或地点</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="会议链接 / 机房"
            className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">备注</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="可选"
          className="h-9 rounded-[12px] bg-surface px-3 text-[14px] outline-none"
        />
      </label>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="h-11 flex-1 rounded-[12px] bg-accent text-[15px] font-medium text-white hover:bg-accent-hover"
        >
          {editing ? "保存" : "记下"}
        </button>
        {editing ? (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-[12px] px-4 text-[15px] text-muted hover:text-foreground"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="h-11 rounded-[12px] px-4 text-[15px] text-danger"
            >
              删除
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}

function minutesBetween(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  return mins > 0 ? mins : 0;
}

function labelDuration(mins: number): string {
  if (mins < 60) return `${mins} 分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分`;
}
