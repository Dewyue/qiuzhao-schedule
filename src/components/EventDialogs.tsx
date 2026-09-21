import { deadlineMoment, formatEventSpan, formatHM, isDeadline, occupiesTime, TYPE_LABEL } from "../lib/time";
import type { RecruitEvent } from "../types";

export function EventDetail({
  event,
  onClose,
}: {
  event: RecruitEvent;
  onClose: () => void;
}) {
  const due = isDeadline(event) ? deadlineMoment(event) : null;
  const rangedDeadline = due !== null && occupiesTime(event);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="关闭" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="event-detail-title"
        className="relative w-full max-w-[400px] rounded-[20px] bg-surface px-5 py-5"
      >
        <p className="text-[13px] font-medium text-accent">
          {TYPE_LABEL[event.type]}
          {event.kind === "deadline"
            ? event.type === "interview"
              ? " · 截止前"
              : " · 截止提交"
            : event.title
              ? ` · ${event.title}`
              : ""}
        </p>
        <h2 id="event-detail-title" className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
          {event.company}
        </h2>
        <p className="mt-3 text-[15px] tabular-nums text-muted">
          {new Date(event.start).getMonth() + 1}月{new Date(event.start).getDate()}日{" "}
          {rangedDeadline
            ? `${formatHM(new Date(event.start))}–${formatHM(new Date(event.end))}`
            : formatEventSpan(event)}
        </p>
        {isDeadline(event) && due ? (
          <p className="mt-2 text-[15px] tabular-nums">
            截止 {due.getMonth() + 1}月{due.getDate()}日 {formatHM(due)}
          </p>
        ) : null}
        {event.location ? <p className="mt-2 text-[15px]">{event.location}</p> : null}
        {event.notes ? <p className="mt-2 text-[14px] leading-relaxed text-muted">{event.notes}</p> : null}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-[12px] bg-surface-muted text-[15px] font-medium"
        >
          关闭
        </button>
      </div>
    </div>
  );
}

export function EventMenu({
  event,
  onEdit,
  onDelete,
  onClose,
}: {
  event: RecruitEvent;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="取消" onClick={onClose} />
      <div role="dialog" className="relative w-full max-w-[400px] overflow-hidden rounded-[20px] bg-surface">
        <p className="px-5 pt-4 text-[13px] text-muted">{event.company}</p>
        <button
          type="button"
          onClick={onEdit}
          className="h-12 w-full px-5 text-left text-[16px] font-medium"
        >
          编辑
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="h-12 w-full px-5 text-left text-[16px] font-medium text-danger"
        >
          删除
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full border-t border-border px-5 text-left text-[16px] text-muted"
        >
          取消
        </button>
      </div>
    </div>
  );
}
