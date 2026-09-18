import type { RecruitEvent } from "../types";

const KEY = "qiuzhao-schedule:events:v1";

export function loadEvents(): RecruitEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecruitEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: RecruitEvent[]): void {
  localStorage.setItem(KEY, JSON.stringify(events));
}
