import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { FORM_TYPES, TYPE_LABEL, toDatetimeLocal } from "../lib/time";
import type { EventKind, EventType, RecruitEvent } from "../types";

const ROUNDS = ["一面", "二面", "终面"] as const;
const DURATION_MINUTES = Array.from({ length: 24 }, (_, i) => (i + 1) * 10);
const DEFAULT_DDL_MINUTES = 30;
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
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState(source.location ?? "");
  const [notes, setNotes] = useState(source.notes ?? "");
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const next = editing ?? draft;
    const nextType = FORM_TYPES.includes(next.type) ? next.type : "interview";
    const nextKind = readKind(next.kind);
    const range = initialFields(next);
    setCompany(next.company);
    setType(nextType);
    setKind(nextKind);
    setTitle(next.title);
    setStart(range.start);
    setEnd(range.end);
    setDeadline(range.deadline);
    setLocation(next.location ?? "");
    setNotes(next.notes ?? "");
    setDuration(range.duration);
  }, [editing, draft]);

  const durationOptions = useMemo(() => {
    if (duration && !DURATION_MINUTES.includes(duration)) {
      return [...DURATION_MINUTES, duration].sort((a, b) => a - b);
    }
    return DURATION_MINUTES;
  }, [duration]);

  const timedSlot =
    kind === "slot" && (type === "exam" || type === "assessment" || type === "interview");
  const timedDeadline =
    kind === "deadline" && (type === "assessment" || type === "exam");
  const modes = kindModes(type);

  function applyDurationForward(mins: number, startLocal: string) {
    setDuration(mins);
    if (!startLocal || !mins) {
      setEnd("");
      return;
    }
    const s = new Date(startLocal);
    if (Number.isNaN(s.getTime())) return;
    setEnd(toDatetimeLocal(new Date(s.getTime() + mins * 60_000)));
  }

  /** From deadline: start = due - duration, end = due. */
  function syncFromDeadline(dueLocal: string, mins: number) {
    const due = new Date(dueLocal);
    if (Number.isNaN(due.getTime()) || !mins) return;
    setDeadline(dueLocal);
    setDuration(mins);
    setEnd(dueLocal);
    setStart(toDatetimeLocal(new Date(due.getTime() - mins * 60_000)));
  }

  function handleStartChange(value: string) {
    setStart(value);
    if (timedDeadline) {
      const mins = duration || DEFAULT_DDL_MINUTES;
      setDuration(mins);
      const s = new Date(value);
      if (!Number.isNaN(s.getTime())) {
        setEnd(toDatetimeLocal(new Date(s.getTime() + mins * 60_000)));
      }
      return;
    }
    if (type === "interview" && kind === "slot") {
      applyDurationForward(duration || 60, value);
      return;
    }
    if (kind === "open" || kind === "allday") {
      setEnd(value);
      return;
    }
    if (kind === "deadline" && !timedDeadline) {
      setEnd(value);
      return;
    }
    if (duration) applyDurationForward(duration, value);
  }

  function handleDeadlineChange(value: string) {
    syncFromDeadline(value, duration || DEFAULT_DDL_MINUTES);
  }

  function handleDurationForDeadline(mins: number) {
    if (deadline) {
      syncFromDeadline(deadline, mins);
      return;
    }
    setDuration(mins);
  }

  function enterDeadlineMode() {
    setKind("deadline");
    const due = deadline || end || start;
    if (!due) {
      setDuration(DEFAULT_DDL_MINUTES);
      return;
    }
    syncFromDeadline(due, duration >= 10 ? duration : DEFAULT_DDL_MINUTES);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!company.trim()) return;

    if (timedDeadline) {
      if (!deadline || !start || !end) return;
      const due = new Date(deadline);
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(due.getTime()) || !(endDate.getTime() > startDate.getTime())) return;
      onSave({
        company: company.trim(),
        type,
        title: "截止",
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        deadline: due.toISOString(),
        notes: notes.trim() || undefined,
        kind: "deadline",
      });
      return;
    }

    if (!start) return;
    let startDate = new Date(start);
    if (kind === "allday") {
      startDate = new Date(startDate);
      startDate.setHours(0, 0, 0, 0);
    }
    const marker = kind === "deadline" || kind === "open" || kind === "allday";
    let endDate: Date;
    if (marker) {
      endDate = new Date(startDate.getTime() + 60 * 1000);
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
      deadline: kind === "deadline" ? startDate.toISOString() : undefined,
      location: showLocation ? location.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
      kind,
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
            const nextKind = allowed.includes(kind) ? kind : "slot";
            setKind(nextKind);
            if (next === "interview" && nextKind === "slot") {
              applyDurationForward(duration || 60, start);
            }
            if ((next === "assessment" || next === "exam") && nextKind === "deadline") {
              const due = deadline || end || start;
              if (due) syncFromDeadline(due, duration >= 10 ? duration : DEFAULT_DDL_MINUTES);
              else setDuration(DEFAULT_DDL_MINUTES);
            }
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
                onClick={() => {
                  if (mode.id === "deadline" && (type === "assessment" || type === "exam")) {
                    enterDeadlineMode();
                    return;
                  }
                  setKind(mode.id);
                  if (mode.id === "slot" && type === "interview") {
                    applyDurationForward(duration || 60, start);
                  }
                }}
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
          {kindHint(kind, timedDeadline) ? (
            <p className="text-[12px] leading-relaxed text-muted">
              {kindHint(kind, timedDeadline)}
            </p>
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

      {timedDeadline ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">截止时间</span>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">默认时长</span>
            <select
              value={duration || DEFAULT_DDL_MINUTES}
              onChange={(e) => handleDurationForDeadline(Number(e.target.value))}
              className={FIELD}
            >
              {durationOptions.map((mins) => (
                <option key={mins} value={mins}>
                  {labelDuration(mins)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">开始时间</span>
            <input
              type="datetime-local"
              required
              value={start}
              onChange={(e) => handleStartChange(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">结束时间</span>
            <input
              type="datetime-local"
              required
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setDuration(minutesBetween(start, e.target.value) || duration);
              }}
              className={FIELD}
            />
          </label>
        </>
      ) : (
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
      )}

      {timedSlot ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">时长</span>
            <select
              value={duration || ""}
              onChange={(e) => applyDurationForward(Number(e.target.value), start)}
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
              required
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

function initialFields(source: Draft): {
  start: string;
  end: string;
  deadline: string;
  duration: number;
} {
  const kind = readKind(source.kind);
  const startLocal = source.start ? toDatetimeLocal(new Date(source.start)) : "";
  const endLocal = source.end ? toDatetimeLocal(new Date(source.end)) : "";
  const mins = minutesBetween(source.start, source.end);

  if (kind === "deadline" && (source.type === "assessment" || source.type === "exam")) {
    const dueIso = source.deadline || (mins > 2 ? source.end : source.start);
    const dueLocal = dueIso ? toDatetimeLocal(new Date(dueIso)) : "";
    const duration = mins > 2 ? mins : DEFAULT_DDL_MINUTES;
    if (mins > 2 && startLocal && endLocal) {
      return { start: startLocal, end: endLocal, deadline: dueLocal, duration };
    }
    if (dueLocal) {
      const due = new Date(dueLocal);
      return {
        deadline: dueLocal,
        duration,
        end: dueLocal,
        start: toDatetimeLocal(new Date(due.getTime() - duration * 60_000)),
      };
    }
    return { start: "", end: "", deadline: "", duration: DEFAULT_DDL_MINUTES };
  }

  if (source.type === "interview" && kind === "slot" && mins < 10 && source.start) {
    return {
      start: startLocal,
      duration: 60,
      end: toDatetimeLocal(new Date(new Date(source.start).getTime() + 60 * 60_000)),
      deadline: "",
    };
  }

  return { start: startLocal, end: endLocal, deadline: "", duration: mins };
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

function kindHint(kind: EventKind, timedDeadline: boolean): string {
  if (timedDeadline) {
    return "截止是属性。默认时长半小时：开始从截止往前倒推，结束先与截止相同。改开始时时长不变，结束跟着更新；色块按开始到结束占格。";
  }
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
