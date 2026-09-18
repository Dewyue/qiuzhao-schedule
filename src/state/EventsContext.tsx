import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { loadEvents, saveEvents } from "../lib/storage";
import type { RecruitEvent } from "../types";

type State = { events: RecruitEvent[] };

type Action =
  | { type: "add"; event: RecruitEvent }
  | { type: "update"; event: RecruitEvent }
  | { type: "remove"; id: string }
  | { type: "replace"; events: RecruitEvent[] };

function persist(events: RecruitEvent[]): RecruitEvent[] {
  saveEvents(events);
  return events;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return { events: persist([action.event, ...state.events]) };
    case "update":
      return {
        events: persist(
          state.events.map((e) => (e.id === action.event.id ? action.event : e)),
        ),
      };
    case "remove":
      return { events: persist(state.events.filter((e) => e.id !== action.id)) };
    case "replace":
      return { events: persist(action.events) };
    default:
      return state;
  }
}

type Ctx = {
  events: RecruitEvent[];
  add: (event: Omit<RecruitEvent, "id">) => void;
  update: (event: RecruitEvent) => void;
  remove: (id: string) => void;
  replace: (events: RecruitEvent[]) => void;
};

const EventsContext = createContext<Ctx | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    events: loadEvents(),
  }));

  const add = useCallback((event: Omit<RecruitEvent, "id">) => {
    dispatch({
      type: "add",
      event: { ...event, id: crypto.randomUUID() },
    });
  }, []);

  const update = useCallback((event: RecruitEvent) => {
    dispatch({ type: "update", event });
  }, []);

  const remove = useCallback((id: string) => {
    dispatch({ type: "remove", id });
  }, []);

  const replace = useCallback((events: RecruitEvent[]) => {
    dispatch({ type: "replace", events });
  }, []);

  const value = useMemo(
    () => ({ events: state.events, add, update, remove, replace }),
    [state.events, add, update, remove, replace],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): Ctx {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}
