import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { FORM_TYPES, TYPE_LABEL, toDatetimeLocal } from "../lib/time";
import type { EventKind, EventType, RecruitEvent } from "../types";

const ROUNDS = ["一面", "二面", "终面"] as const;
const DURATION_MINUTES = Array.from({ length: 24 }, (_, i) => (i + 1) * 10);
const FIELD =
  "h-11 rounded-[12px] bg-surface-muted px-3 text-[15px] outline-none";

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
  const initialType = FORM_TYPES.includes(source.type) ? source.type : "interview";
  const [company, setCompany] = useState(source.company);
  const [type, setType] = useState<EventType>(initialType);
  const [kind, setKind] = useState<EventKind>(readKind(source.kind));
  const [title, setTitle] = useState(source.title);
  const [start, setStart] = useState(source.start ? toDatetimeLocal(new Date(source.start)) : "");
  const [end, setEnd] = useState(source.end ? toDatetimeLocal(new Date(source.end)) : "");
  const [location, setLocation] = useState(source.location ?? "");
  const [notes, setNotes] = useState(source.notes ?? "");
  const [duration, setDuration] = useState(minutesBetween(source.start, source.end));

  useEffect(() => {
    const next = editing ?? draft;
    setCompany(next.company);
    setType(FORM_TYPES.includes(next.type) ? next.type : "interview");
    setKind(readKind(next.kind));
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
    if (type === "interview" && kind === "slot") {
      applyDuration(duration || 60, value);
      return;
    }
    if (kind === "deadline" || kind === "open" || kind === "allday") {
      setEnd(value);
      return;
    }
    if (duration) applyDuration(duration, value);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!company.trim() || !start) return;
    let startDate = new Date(start);
    if (kind === "allday") {
      startDate = new Date(startDate);
      startDate.setHours(0, 0, 0, 0);
    }
    const marker = kind === "deadline" || kind === "open" || kind === "allday";
    let endDate: Date;
    if (marker) {
      endDate = new Date(startDate.getTime() + 60 * 1000);
    } else if (type === "interview" && !end) {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    } else if (end) {
      endDate = new Date(end);
    } else {
      return;
    }
    if (!(endDate.getTime() > startDate.getTime())) return;
    const showLocation = type === "interview" || type === "jobfair";
    onSave({
      company: company.trim(),
      type,
      title: type === "interview" && kind === "slot" ? title : kind === "deadline" ? "截止" : "",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: showLocation ? location.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
      kind,
    });
  }

  const timed = (type === "exam" || (type === "assessment" && kind === "slot")) && kind === "slot";
  const modes = kindModes(type);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-medium text-accent">{editing ? "编辑日程" : "新的一场"}</p>
        <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.03em]">
          {editing ? editing.company || "编辑" : "填写后记下"}
        </h2>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{type === "jobfair" ? "企业名" : "公司"}</span>
        <input
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder={type === "jobfair" ? "企业 / 主办方" : "公司名称"}
          className={FIELD}
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
            if (next !== "interview" && next !== "jobfair") setLocation("");
            const allowed = kindModes(next).map((m) => m.id);
            if (!allowed.includes(kind)) setKind("slot");
            if (next === "interview") applyDuration(duration || 60, start);
          }}
          className={FIELD}
        >
          {FORM_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      {modes.length > 1 ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-[13px] text-muted">怎么记</legend>
          <div className="flex gap-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setKind(mode.id)}
                className={
                  kind === mode.id
                    ? "h-10 flex-1 rounded-[12px] bg-accent text-[14px] font-medium text-white"
                    : "h-10 flex-1 rounded-[12px] bg-surface-muted text-[14px] font-medium"
                }
              >
                {mode.label}
              </button>
            ))}
          </div>
          {kindHint(kind) ? (
            <p className="text-[12px] leading-relaxed text-muted">{kindHint(kind)}</p>
          ) : null}
        </fieldset>
      ) : null}

      {type === "interview" && kind === "slot" ? (
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
                    : "h-10 flex-1 rounded-[12px] bg-surface-muted text-[14px] font-medium text-foreground"
                }
              >
                {round}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">{timeLabel(kind, type)}</span>
        <input
          type={kind === "allday" ? "date" : "datetime-local"}
          required
          value={kind === "allday" ? start.slice(0, 10) : start}
          onChange={(e) => {
            if (kind === "allday") handleStartChange(`${e.target.value}T00:00`);
            else handleStartChange(e.target.value);
          }}
          className={FIELD}
        />
      </label>

      {timed ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">时长</span>
            <select
              value={duration || ""}
              onChange={(e) => applyDuration(Number(e.target.value), start)}
              className={FIELD}
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
              className={FIELD}
            />
          </label>
        </>
      ) : null}

      {type === "jobfair" ? (
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">结束</span>
          <input
            type="datetime-local"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={FIELD}
          />
        </label>
      ) : null}

      {type === "interview" || type === "jobfair" ? (
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">地点</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={type === "jobfair" ? "场馆 / 学校" : "线下面试 / 公司"}
            className={FIELD}
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">备注</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="可选"
          className="h-9 rounded-[12px] bg-surface-muted px-3 text-[14px] outline-none"
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

function readKind(kind: EventKind | undefined): EventKind {
  if (kind === "deadline" || kind === "allday" || kind === "open") return kind;
  return "slot";
}

function kindModes(type: EventType): { id: EventKind; label: string }[] {
  if (type === "assessment") {
    return [
      { id: "slot", label: "限时场次" },
      { id: "deadline", label: "截止提交" },
    ];
  }
  if (type === "exam") {
    return [
      { id: "slot", label: "限时场次" },
      { id: "open", label: "只知开考" },
      { id: "deadline", label: "截止提交" },
    ];
  }
  if (type === "interview") {
    return [
      { id: "slot", label: "已约时段" },
      { id: "allday", label: "当天待定" },
      { id: "deadline", label: "截止前" },
    ];
  }
  return [];
}

function kindHint(kind: EventKind): string {
  if (kind === "deadline") return "只记 DDL，不占用当天空闲。时间轴上会在截止时刻打一个标记。";
  if (kind === "open") return "只记开考时刻，不拉色块、不占用空闲。知道时长后再改成限时场次。";
  if (kind === "allday") return "挂在当天，不铺满时间轴。时间定了再改成已约时段。";
  return "";
}

function timeLabel(kind: EventKind, type: EventType): string {
  if (kind === "deadline") return "截止时间";
  if (kind === "open") return type === "exam" ? "开考时间" : "开始";
  if (kind === "allday") return "日期";
  return "开始";
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
