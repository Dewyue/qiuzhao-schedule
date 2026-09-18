export type EventType = "assessment" | "exam" | "interview" | "other";

export type RangeMode = "today" | "upcoming" | "week";

export type RecruitEvent = {
  id: string;
  company: string;
  type: EventType;
  title: string;
  start: string;
  end: string;
  location?: string;
  notes?: string;
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
