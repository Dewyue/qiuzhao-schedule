import { useMemo, useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { DataPanel } from "./components/DataPanel";
import { DayDetailList } from "./components/DayDetailList";
import { EventDetail, EventMenu } from "./components/EventDialogs";
import { EventForm } from "./components/EventForm";
import { OccupancyBoard, RangeSummary } from "./components/OccupancyBoard";
import { RangeSwitch } from "./components/RangeSwitch";
import { addDays, startOfDay } from "./lib/time";
import { useEvents } from "./state/EventsContext";
import type { FreeSlot, RangeMode, RecruitEvent } from "./types";

export default function App() {
  const { events, add, update, remove, replace } = useEvents();
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>("schedule");
  const [mode, setMode] = useState<RangeMode>("today");
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<RecruitEvent | null>(null);
  const [draft, setDraft] = useState<Omit<RecruitEvent, "id">>(() => defaultDraft());
  const [viewing, setViewing] = useState<RecruitEvent | null>(null);
  const [menuEvent, setMenuEvent] = useState<RecruitEvent | null>(null);

  function defaultDraft(start?: Date): Omit<RecruitEvent, "id"> {
    const s = start ?? snapNextHour();
    return {
      company: "",
      type: "interview",
      title: "",
      start: s.toISOString(),
      end: "",
      location: "",
      notes: "",
      kind: "slot",
    };
  }

  function openRecord(next: Omit<RecruitEvent, "id">, event?: RecruitEvent | null) {
    setDraft(next);
    setEditing(event ?? null);
    setViewing(null);
    setMenuEvent(null);
    setTab("record");
  }

  function onSelectFree(slot: FreeSlot) {
    setSelectedDay(startOfDay(slot.start));
    openRecord(defaultDraft(slot.start));
  }

  function onPickTime(start: Date) {
    setSelectedDay(startOfDay(start));
    openRecord(defaultDraft(start));
  }

  function onViewEvent(event: RecruitEvent) {
    setMenuEvent(null);
    setSelectedDay(startOfDay(new Date(event.start)));
    setViewing(event);
  }

  function onEventMenu(event: RecruitEvent) {
    setViewing(null);
    setSelectedDay(startOfDay(new Date(event.start)));
    setMenuEvent(event);
  }

  function eventToDraft(event: RecruitEvent): Omit<RecruitEvent, "id"> {
    return {
      company: event.company,
      type: event.type,
      title: event.title,
      start: event.start,
      end: event.end,
      location: event.location ?? "",
      notes: event.notes ?? "",
      kind: event.kind ?? "slot",
    };
  }

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <div
        className={
          tab === "schedule"
            ? "flex w-full flex-col gap-3 px-2 pb-24 pt-3"
            : "mx-auto flex max-w-[1400px] flex-col gap-4 px-5 pb-24 pt-4 lg:px-8"
        }
      >
        {tab === "schedule" ? (
          <>
            <header className="flex items-center justify-between gap-3">
              <h1 className="text-[18px] font-semibold tracking-[-0.03em]">秋招日程</h1>
              <RangeSwitch
                value={mode}
                onChange={(next) => {
                  setMode(next);
                  const today = startOfDay(new Date());
                  if (next === "today") setSelectedDay(today);
                  if (next === "tomorrow") setSelectedDay(addDays(today, 1));
                }}
              />
            </header>
            <RangeSummary events={events} mode={mode} now={now} />
            <OccupancyBoard
              events={events}
              mode={mode}
              now={now}
              selectedDay={selectedDay}
              onViewEvent={onViewEvent}
              onEventMenu={onEventMenu}
              onSelectFree={onSelectFree}
              onPickTime={onPickTime}
            />
            {mode === "today" || mode === "tomorrow" ? (
              <div className="mt-2">
                <p className="mb-2 text-[13px] font-medium text-muted">当日列表</p>
                <DayDetailList
                  events={events}
                  day={selectedDay}
                  onView={onViewEvent}
                  onMenu={onEventMenu}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {tab === "record" ? (
          <div className="mx-auto w-full max-w-[480px] py-2">
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
                setTab("schedule");
              }}
              onCancel={() => {
                setEditing(null);
                setDraft(defaultDraft());
                setTab("schedule");
              }}
              onDelete={
                editing
                  ? () => {
                      remove(editing.id);
                      setEditing(null);
                      setDraft(defaultDraft());
                      setTab("schedule");
                    }
                  : undefined
              }
            />
          </div>
        ) : null}

        {tab === "data" ? (
          <DataPanel
            events={events}
            now={now}
            onImport={replace}
            onView={(event) => {
              setMenuEvent(null);
              setViewing(event);
            }}
          />
        ) : null}
      </div>
      <BottomNav value={tab} onChange={setTab} />
      {viewing ? <EventDetail event={viewing} onClose={() => setViewing(null)} /> : null}
      {menuEvent ? (
        <EventMenu
          event={menuEvent}
          onClose={() => setMenuEvent(null)}
          onEdit={() => openRecord(eventToDraft(menuEvent), menuEvent)}
          onDelete={() => {
            remove(menuEvent.id);
            setMenuEvent(null);
          }}
        />
      ) : null}
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
