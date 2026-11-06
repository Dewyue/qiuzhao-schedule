export type EventType =
  | "assessment"
  | "exam"
  | "interview"
  | "fun"
  | "meeting"
  | "school"
  | "other";

export type EventKind = "slot" | "deadline" | "allday" | "open";

export type RangeMode = "today" | "tomorrow" | "week";

export type RecruitEvent = {
  id: string;
  company: string;
  type: EventType;
  title: string;
  start: string;
  end: string;
  /** Company-stated cutoff; separate from the occupied end when plans move. */
  deadline?: string;
  location?: string;
  notes?: string;
  kind?: EventKind;
  /** First-visit sample; cleared when the person records their own event. */
  demo?: boolean;
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
