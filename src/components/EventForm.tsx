import type { FormEvent } from "react";
import type { EventType, RecruitEvent } from "../types";
import { TYPE_LABEL } from "../lib/time";

const empty: Omit<RecruitEvent, "id"> = {
  company: "",
  type: "interview",
  title: "",
  start: "",
  end: "",
  location: "",
  notes: "",
};

export function EventForm({
  draft,
  editing,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: Omit<RecruitEvent, "id">;
  editing: RecruitEvent | null;
  onSave: (data: Omit<RecruitEvent, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const value = editing ?? { ...empty, ...draft };

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const company = String(form.get("company") ?? "").trim();
    const startLocal = String(form.get("start") ?? "");
    const endLocal = String(form.get("end") ?? "");
    if (!company || !startLocal || !endLocal) return;
    const start = new Date(startLocal);
    const end = new Date(endLocal);
    if (!(end.getTime() > start.getTime())) return;
    onSave({
      company,
      type: String(form.get("type") ?? "interview") as EventType,
      title: String(form.get("title") ?? "").trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      location: String(form.get("location") ?? "").trim() || undefined,
      notes: String(form.get("notes") ?? "").trim() || undefined,
    });
  }

  const startVal = value.start ? toLocal(value.start) : "";
  const endVal = value.end ? toLocal(value.end) : "";

  return (
    <form key={editing?.id ?? `${startVal}-${endVal}`} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <p className="text-[13px] font-medium text-accent">
          {editing ? "编辑日程" : "快速记录"}
        </p>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
          {editing ? editing.company : "新的一场"}
        </h2>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">公司</span>
        <input
          name="company"
          required
          defaultValue={value.company}
          placeholder="公司名称"
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">类型</span>
        <select
          name="type"
          defaultValue={value.type}
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        >
          {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">场次</span>
        <input
          name="title"
          defaultValue={value.title}
          placeholder="一面 / 性格测评"
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">开始</span>
          <input
            name="start"
            type="datetime-local"
            required
            defaultValue={startVal}
            className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">结束</span>
          <input
            name="end"
            type="datetime-local"
            required
            defaultValue={endVal}
            className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">链接或地点</span>
        <input
          name="location"
          defaultValue={value.location ?? ""}
          placeholder="会议链接 / 机房"
          className="h-11 rounded-[12px] bg-surface px-3 text-[15px] outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">备注</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={value.notes ?? ""}
          className="resize-none rounded-[12px] bg-surface px-3 py-2.5 text-[15px] outline-none"
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

function toLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.length >= 16 ? iso.slice(0, 16) : "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
