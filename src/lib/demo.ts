import type { EventKind, EventType, RecruitEvent } from "../types";
import { addDays, startOfDay } from "./time";

const ONBOARDED_KEY = "qiuzhao-schedule:onboarded:v1";
const NOTICE_KEY = "qiuzhao-schedule:demo-notice:v1";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function demoNoticeDismissed(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissDemoNotice(): void {
  try {
    localStorage.setItem(NOTICE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function isDemoEvent(event: Pick<RecruitEvent, "demo">): boolean {
  return event.demo === true;
}

export function hasDemoEvents(events: RecruitEvent[]): boolean {
  return events.some(isDemoEvent);
}

export function stripDemoEvents(events: RecruitEvent[]): RecruitEvent[] {
  return events.filter((e) => !isDemoEvent(e));
}

type DemoSpec = {
  id: string;
  day: number;
  startH: number;
  startM: number;
  minutes: number;
  company: string;
  type: EventType;
  title?: string;
  kind?: EventKind;
  location?: string;
};

const TEMPLATE: DemoSpec[] = [
  {
    id: "demo-interview",
    day: 0,
    startH: 10,
    startM: 0,
    minutes: 60,
    company: "字节",
    type: "interview",
    title: "一面",
  },
  {
    id: "demo-exam",
    day: 0,
    startH: 10,
    startM: 30,
    minutes: 90,
    company: "美团",
    type: "exam",
  },
  {
    id: "demo-assessment",
    day: 0,
    startH: 14,
    startM: 0,
    minutes: 60,
    company: "网易",
    type: "assessment",
  },
  {
    id: "demo-fun",
    day: 1,
    startH: 16,
    startM: 0,
    minutes: 90,
    company: "羽毛球",
    type: "fun",
    title: "约球",
    location: "校内馆",
  },
  {
    id: "demo-other",
    day: 2,
    startH: 19,
    startM: 0,
    minutes: 120,
    company: "朋友局",
    type: "other",
    title: "聚餐",
  },
  {
    id: "demo-meeting",
    day: 3,
    startH: 10,
    startM: 0,
    minutes: 60,
    company: "组会",
    type: "meeting",
  },
  {
    id: "demo-school",
    day: 4,
    startH: 14,
    startM: 0,
    minutes: 90,
    company: "答辩排练",
    type: "school",
  },
  {
    id: "demo-week2",
    day: 8,
    startH: 11,
    startM: 0,
    minutes: 60,
    company: "华为",
    type: "interview",
    title: "二面",
  },
];

export function buildDemoEvents(now = new Date()): RecruitEvent[] {
  const origin = startOfDay(now);
  return TEMPLATE.map((spec) => {
    const start = addDays(origin, spec.day);
    start.setHours(spec.startH, spec.startM, 0, 0);
    const end = new Date(start.getTime() + spec.minutes * 60_000);
    return {
      id: spec.id,
      company: spec.company,
      type: spec.type,
      title: spec.title ?? "",
      start: start.toISOString(),
      end: end.toISOString(),
      location: spec.location,
      kind: spec.kind ?? "slot",
      demo: true,
    };
  });
}
