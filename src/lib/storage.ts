import type { EventType, RecruitEvent } from "../types";

const KEY = "qiuzhao-schedule:events:v1";

const TYPES: EventType[] = ["assessment", "exam", "interview", "jobfair", "other"];

export type ExportPayload = {
  app: "qiuzhao-schedule";
  exportedAt: string;
  events: RecruitEvent[];
};

export function loadEvents(): RecruitEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return parseEventList(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveEvents(events: RecruitEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    /* quota / private mode */
  }
}

export function toExportPayload(events: RecruitEvent[]): ExportPayload {
  return {
    app: "qiuzhao-schedule",
    exportedAt: new Date().toISOString(),
    events,
  };
}

export function parseEventList(input: unknown): RecruitEvent[] {
  const list = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as { events?: unknown }).events)
      ? (input as { events: unknown[] }).events
      : null;
  if (!list) throw new Error("JSON 里没有日程数组");
  return list.map(normalizeEvent);
}

function normalizeEvent(item: unknown, index: number): RecruitEvent {
  if (!item || typeof item !== "object") throw new Error(`第 ${index + 1} 条不是对象`);
  const row = item as Record<string, unknown>;
  const company = String(row.company ?? "").trim();
  const start = String(row.start ?? "");
  const end = String(row.end ?? "");
  if (!company || Number.isNaN(new Date(start).getTime()) || Number.isNaN(new Date(end).getTime())) {
    throw new Error(`第 ${index + 1} 条缺少有效的公司或时间`);
  }
  const type = TYPES.includes(row.type as EventType) ? (row.type as EventType) : "other";
  const kind =
    row.kind === "deadline" || row.kind === "allday" || row.kind === "open" ? row.kind : "slot";
  const startIso = new Date(start).toISOString();
  const endIso = new Date(end).toISOString();
  let deadline: string | undefined;
  if (row.deadline && !Number.isNaN(new Date(String(row.deadline)).getTime())) {
    deadline = new Date(String(row.deadline)).toISOString();
  } else if (kind === "deadline") {
    const span = new Date(endIso).getTime() - new Date(startIso).getTime();
    deadline = span > 2 * 60_000 ? endIso : startIso;
  }
  return {
    id: String(row.id ?? crypto.randomUUID()),
    company,
    type,
    title: String(row.title ?? ""),
    start: startIso,
    end: endIso,
    deadline,
    location: row.location ? String(row.location) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    kind,
  };
}

export function downloadEventsJson(events: RecruitEvent[]): void {
  const blob = new Blob([JSON.stringify(toExportPayload(events), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `qiuzhao-schedule-${day}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
