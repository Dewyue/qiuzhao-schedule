export type EventType = "assessment" | "exam" | "interview" | "jobfair" | "other";

export type EventKind = "slot" | "deadline" | "allday" | "open";

export type RangeMode = "today" | "tomorrow" | "week";

export type RecruitEvent = {
  id: string;
  company: string;
  type: EventType;
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
  kind?: EventKind;
};

export type FreeSlot = {
  start: Date;
  end: Date;
  minutes: number;
};

export type EventSlice = {
  event: RecruitEvent;
  start: Date;
  end: Date;
  lane: number;
  laneCount: number;
  conflicted: boolean;
};
