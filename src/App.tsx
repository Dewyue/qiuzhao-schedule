import { useMemo, useState } from "react";
import { DataActions } from "./components/DataActions";
import { DayDetailList } from "./components/DayDetailList";
import { EventForm } from "./components/EventForm";
import { OccupancyBoard, RangeSummary } from "./components/OccupancyBoard";
import { RangeSwitch } from "./components/RangeSwitch";
import { addDays, sampleEvents, startOfDay } from "./lib/time";
import { useEvents } from "./state/EventsContext";
import type { FreeSlot, RangeMode, RecruitEvent } from "./types";

export default function App() {
  const { events, add, update, remove, replace } = useEvents();
  const now = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<RangeMode>("today");
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<RecruitEvent | null>(null);
  const [draft, setDraft] = useState<Omit<RecruitEvent, "id">>(() => defaultDraft());

  function defaultDraft(start?: Date): Omit<RecruitEvent, "id"> {
    const s = start ?? snapNextHour();
    const e = new Date(s.getTime() + 60 * 60 * 1000);
    return {
      company: "",
      type: "interview",
      title: "",
      start: s.toISOString(),
      end: e.toISOString(),
      location: "",
      notes: "",
    };
  }

  function onSelectFree(slot: FreeSlot) {
    setEditing(null);
    setSelectedDay(startOfDay(slot.start));
    const end = new Date(Math.min(slot.end.getTime(), slot.start.getTime() + 60 * 60 * 1000));
    setDraft({
      ...defaultDraft(slot.start),
      start: slot.start.toISOString(),
      end: end.toISOString(),
    });
  }

  function onPickTime(start: Date) {
    setEditing(null);
    setSelectedDay(startOfDay(start));
    setDraft(defaultDraft(start));
  }

  function onSelectEvent(event: RecruitEvent) {
    setEditing(event);
    setSelectedDay(startOfDay(new Date(event.start)));
  }

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-8 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[40px] font-semibold tracking-[-0.035em] sm:text-[48px]">
              秋招日程
            </h1>
          </div>
          <div className="flex flex-col gap-4 lg:items-end">
            <RangeSwitch value={mode} onChange={setMode} />
            <DataActions events={events} onImport={replace} />
          </div>
        </header>

        <RangeSummary events={events} mode={mode} now={now} />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <OccupancyBoard
              events={events}
              mode={mode}
              now={now}
              selectedDay={selectedDay}
              onSelectEvent={onSelectEvent}
              onSelectFree={onSelectFree}
              onPickTime={onPickTime}
            />
          </div>

          <aside className="w-full shrink-0 lg:w-[340px]">
            {mode === "today" ? (
              <div className="mb-6">
                <p className="mb-3 text-[13px] font-medium text-muted">当日列表</p>
                <DayDetailList events={events} day={selectedDay} onSelect={onSelectEvent} />
              </div>
            ) : (
              <div className="mb-6 rounded-[24px] bg-surface-muted px-5 py-5">
                <p className="text-[15px] font-medium">同一套时间柱</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">
                  实心是占用，标了「空」的是可排时段。点空白或空闲标签即可预填开始时间。
                </p>
              </div>
            )}

            <div className="rounded-[24px] bg-surface-muted p-5">
              <EventForm
                draft={draft}
                editing={editing}
                onSave={(data) => {
                  if (editing) {
                    update({ ...editing, ...data });
                    setEditing(null);
                  } else {
                    add(data);
                  }
                  setDraft(defaultDraft());
                }}
                onCancel={() => {
                  setEditing(null);
                  setDraft(defaultDraft());
                }}
                onDelete={
                  editing
                    ? () => {
                        remove(editing.id);
                        setEditing(null);
                        setDraft(defaultDraft());
                      }
                    : undefined
                }
              />
            </div>

            {events.length === 0 ? (
              <button
                type="button"
                onClick={() => replace(sampleEvents())}
                className="mt-4 w-full text-center text-[13px] text-accent hover:underline"
              >
                载入示例日程，看占用与重合
              </button>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function snapNextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  if (d.getHours() < 8) d.setHours(8);
  if (d.getHours() >= 22) {
    const n = addDays(startOfDay(d), 1);
    n.setHours(9, 0, 0, 0);
    return n;
  }
  return d;
}
