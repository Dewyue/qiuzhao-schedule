import type { EventSlice, FreeSlot, RangeMode, RecruitEvent } from "../types";

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 22;

export const TYPE_LABEL: Record<RecruitEvent["type"], string> = {
  assessment: "测评",
  exam: "笔试",
  interview: "面试",
  jobfair: "双选会",
  other: "其他",
};

export const FORM_TYPES: RecruitEvent["type"][] = [
  "assessment",
  "exam",
  "interview",
  "jobfair",
];

export function eventKind(event: Pick<RecruitEvent, "kind">): RecruitEvent["kind"] {
  return event.kind ?? "slot";
}

export function isDeadline(event: Pick<RecruitEvent, "kind">): boolean {
  return eventKind(event) === "deadline";
}

export function isAllDay(event: Pick<RecruitEvent, "kind">): boolean {
  return eventKind(event) === "allday";
}

export function isOpenStart(event: Pick<RecruitEvent, "kind">): boolean {
  return eventKind(event) === "open";
}

/** Move a block by snapped minutes. Duration stays; occupying deadlines keep their cutoff. */
export function shiftEvent(event: RecruitEvent, deltaMin: number, day: Date): RecruitEvent {
  if (!deltaMin) return event;
  const startMs = new Date(event.start).getTime();
  const endMs = new Date(event.end).getTime();
  const dur = Math.max(endMs - startMs, 60_000);
  const day0 = startOfDay(day).getTime();
  const day1 = addDays(startOfDay(day), 1).getTime();
  let next = startMs + deltaMin * 60_000;
  if (next < day0) next = day0;
  if (dur < day1 - day0 && next + dur > day1) next = day1 - dur;
  if (dur >= day1 - day0 && next >= day1) next = day1 - 15 * 60_000;
  if (next === startMs) return event;
  const moved = next - startMs;
  const shifted: RecruitEvent = {
    ...event,
    start: new Date(next).toISOString(),
    end: new Date(next + dur).toISOString(),
  };
  if (isDeadline(event) && occupiesTime(event)) shifted.deadline = event.deadline;
  else if (event.deadline) {
    shifted.deadline = new Date(new Date(event.deadline).getTime() + moved).toISOString();
  }
  return shifted;
}

export function occupiesTime(event: Pick<RecruitEvent, "kind" | "start" | "end">): boolean {
  if (eventKind(event) === "slot") return true;
  if (!isDeadline(event)) return false;
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  return end - start > 2 * 60_000;
}

export function occupancyEvents(events: RecruitEvent[]): RecruitEvent[] {
  return events.filter(occupiesTime);
}

export function axisPins(events: RecruitEvent[]): RecruitEvent[] {
  return events.filter((e) => {
    if (isOpenStart(e)) return true;
    return isDeadline(e) && !occupiesTime(e);
  });
}

export function deadlineMoment(
  event: Pick<RecruitEvent, "kind" | "start" | "end" | "deadline">,
): Date {
  if (!isDeadline(event)) return new Date(event.start);
  if (event.deadline && !Number.isNaN(new Date(event.deadline).getTime())) {
    return new Date(event.deadline);
  }
  const start = new Date(event.start);
  const end = new Date(event.end);
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (mins > 2) return end;
  return start;
}

export function formatEventSpan(event: RecruitEvent): string {
  if (isDeadline(event)) {
    if (occupiesTime(event)) {
      return `${formatHM(new Date(event.start))}–${formatHM(new Date(event.end))}`;
    }
    return `截止 ${formatHM(deadlineMoment(event))}`;
  }
  if (isAllDay(event)) return "当天 · 时间待定";
  if (isOpenStart(event)) {
    const verb = event.type === "exam" ? "开考" : "开始";
    return `${verb} ${formatHM(new Date(event.start))} · 时长待定`;
  }
  return `${formatHM(new Date(event.start))}–${formatHM(new Date(event.end))}`;
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(x, diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function daysForRange(mode: RangeMode, now = new Date()): Date[] {
  const today = startOfDay(now);
  if (mode === "today") return [today];
  if (mode === "tomorrow") return [addDays(today, 1)];
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i));
}

export function weekdayLabel(d: Date): string {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()] ?? "";
}

export function weekdayShort(d: Date): string {
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()] ?? "";
}

export function formatHM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatMD(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatYMD(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export type EventStatus = "done" | "live" | "upcoming";

export function eventStatus(event: RecruitEvent, now = new Date()): EventStatus {
  const t = now.getTime();
  if (isDeadline(event) || isAllDay(event)) {
    if (isAllDay(event)) {
      const dayEnd = addDays(startOfDay(new Date(event.start)), 1);
      return t >= dayEnd.getTime() ? "done" : "upcoming";
    }
    const due = deadlineMoment(event).getTime();
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    if (occupiesTime(event)) {
      if (end <= t) return "done";
      if (start <= t) return "live";
      return "upcoming";
    }
    return due <= t ? "done" : "upcoming";
  }
  if (isOpenStart(event)) {
    const start = new Date(event.start).getTime();
    const dayEnd = addDays(startOfDay(new Date(event.start)), 1).getTime();
    if (t >= dayEnd) return "done";
    if (t >= start) return "live";
    return "upcoming";
  }
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  if (end <= t) return "done";
  if (start <= t) return "live";
  return "upcoming";
}

export function eventTouchesDay(event: RecruitEvent, day: Date): boolean {
  return sliceEventOnDay(event, day) !== null;
}

export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const padLeft = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < padLeft; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}小时`;
  if (m === 30) return `${h}.5小时`;
  return `${h}小时${m}分`;
}

export function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}

export function sliceEventOnDay(
  event: RecruitEvent,
  day: Date,
): { start: Date; end: Date } | null {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (end <= dayStart || start >= dayEnd) return null;
  const s = start < dayStart ? dayStart : start;
  const e = end > dayEnd ? dayEnd : end;
  if (e <= s) return null;
  return { start: s, end: e };
}

function hourDecimal(d: Date, day: Date): number {
  const start = startOfDay(day).getTime();
  return (d.getTime() - start) / 3_600_000;
}

export function hoursWindow(
  events: RecruitEvent[],
  days: Date[],
): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const day of days) {
    for (const event of events) {
      if (isAllDay(event)) continue;
      const slice = sliceEventOnDay(event, day);
      if (!slice) continue;
      startHour = Math.min(startHour, Math.floor(hourDecimal(slice.start, day)));
      endHour = Math.max(endHour, Math.ceil(hourDecimal(slice.end, day)));
    }
  }
  return {
    startHour: Math.max(0, startHour),
    endHour: Math.min(24, Math.max(endHour, startHour + 1)),
  };
}

export function mergeBusy(
  slices: { start: Date; end: Date }[],
): { start: Date; end: Date }[] {
  const sorted = [...slices].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: { start: Date; end: Date }[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (!last || s.start.getTime() > last.end.getTime()) {
      out.push({ start: new Date(s.start), end: new Date(s.end) });
    } else if (s.end.getTime() > last.end.getTime()) {
      last.end = new Date(s.end);
    }
  }
  return out;
}

export function freeSlotsOnDay(
  events: RecruitEvent[],
  day: Date,
  startHour: number,
  endHour: number,
): FreeSlot[] {
  const winStart = new Date(day);
  winStart.setHours(startHour, 0, 0, 0);
  const winEnd = new Date(day);
  if (endHour >= 24) {
    winEnd.setTime(addDays(startOfDay(day), 1).getTime());
  } else {
    winEnd.setHours(endHour, 0, 0, 0);
  }

  const slices = occupancyEvents(events)
    .map((e) => sliceEventOnDay(e, day))
    .filter((s): s is { start: Date; end: Date } => s !== null)
    .map((s) => ({
      start: s.start < winStart ? winStart : s.start,
      end: s.end > winEnd ? winEnd : s.end,
    }))
    .filter((s) => s.end > s.start);

  const busy = mergeBusy(slices);
  const free: FreeSlot[] = [];
  let cursor = winStart;
  for (const b of busy) {
    if (b.start.getTime() > cursor.getTime()) {
      const minutes = Math.round((b.start.getTime() - cursor.getTime()) / 60_000);
      if (minutes > 0) free.push({ start: new Date(cursor), end: new Date(b.start), minutes });
    }
    if (b.end.getTime() > cursor.getTime()) cursor = b.end;
  }
  if (cursor.getTime() < winEnd.getTime()) {
    const minutes = Math.round((winEnd.getTime() - cursor.getTime()) / 60_000);
    if (minutes > 0) free.push({ start: new Date(cursor), end: new Date(winEnd), minutes });
  }
  return free;
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

export function layoutDayEvents(events: RecruitEvent[], day: Date): EventSlice[] {
  const slices = occupancyEvents(events)
    .map((event) => {
      const s = sliceEventOnDay(event, day);
      if (!s) return null;
      return { event, start: s.start, end: s.end };
    })
    .filter((s): s is { event: RecruitEvent; start: Date; end: Date } => s !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());

  const n = slices.length;
  const parent = slices.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i] ?? i] ?? i;
      i = parent[i] ?? i;
    }
    return i;
  };
  const unite = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = slices[i];
      const b = slices[j];
      if (a && b && overlaps(a, b)) unite(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const laneOf = new Array<number>(n).fill(0);
  const laneCountOf = new Array<number>(n).fill(1);

  for (const members of groups.values()) {
    const ordered = [...members].sort((i, j) => {
      const a = slices[i];
      const b = slices[j];
      if (!a || !b) return 0;
      return a.start.getTime() - b.start.getTime();
    });
    const laneEnd: number[] = [];
    for (const idx of ordered) {
      const item = slices[idx];
      if (!item) continue;
      let lane = laneEnd.findIndex((t) => t <= item.start.getTime());
      if (lane === -1) {
        lane = laneEnd.length;
        laneEnd.push(item.end.getTime());
      } else {
        laneEnd[lane] = item.end.getTime();
      }
      laneOf[idx] = lane;
    }
    const count = Math.max(1, laneEnd.length);
    for (const idx of members) laneCountOf[idx] = count;
  }

  return slices.map((s, i) => ({
    ...s,
    lane: laneOf[i] ?? 0,
    laneCount: laneCountOf[i] ?? 1,
    conflicted: (laneCountOf[i] ?? 1) > 1,
  }));
}

export function conflictClusterCount(events: RecruitEvent[], days: Date[]): number {
  let count = 0;
  for (const day of days) {
    const conflicted = layoutDayEvents(events, day).filter((s) => s.conflicted);
    const seen = new Set<string>();
    for (const s of conflicted) {
      if (seen.has(s.event.id)) continue;
      count += 1;
      const stack = [s];
      seen.add(s.event.id);
      while (stack.length > 0) {
        const cur = stack.pop();
        if (!cur) break;
        for (const other of conflicted) {
          if (seen.has(other.event.id) || !overlaps(cur, other)) continue;
          seen.add(other.event.id);
          stack.push(other);
        }
      }
    }
  }
  return count;
}

export function minFreeMinutes(mode: RangeMode): number {
  if (mode === "week") return 90;
  return 45;
}

export function labeledFrees(slots: FreeSlot[], mode: RangeMode): FreeSlot[] {
  if (mode === "week") return [];
  const min = minFreeMinutes(mode);
  return slots.filter((s) => s.minutes >= min);
}

export function longestFree(slots: FreeSlot[]): FreeSlot | null {
  if (slots.length === 0) return null;
  return slots.reduce((a, b) => (a.minutes >= b.minutes ? a : b));
}

export function snapToQuarter(d: Date): Date {
  const x = new Date(d);
  const m = x.getMinutes();
  const snapped = Math.round(m / 15) * 15;
  x.setMinutes(snapped, 0, 0);
  if (snapped === 60) {
    x.setHours(x.getHours() + 1);
    x.setMinutes(0);
  }
  return x;
}

export function yToTime(
  y: number,
  height: number,
  day: Date,
  startHour: number,
  endHour: number,
): Date {
  const ratio = Math.min(1, Math.max(0, y / height));
  const hours = startHour + ratio * (endHour - startHour);
  const t = new Date(day);
  const h = Math.floor(hours);
  const m = (hours - h) * 60;
  t.setHours(h, m, 0, 0);
  return snapToQuarter(t);
}
