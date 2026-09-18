type Tab = "schedule" | "record" | "data";

const ITEMS: { id: Tab; label: string }[] = [
  { id: "schedule", label: "日程" },
  { id: "record", label: "记录" },
  { id: "data", label: "数据" },
];

export function BottomNav({
  value,
  onChange,
}: {
  value: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-3">
        {ITEMS.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={
                active
                  ? "h-12 text-[13px] font-semibold text-accent"
                  : "h-12 text-[13px] font-medium text-muted"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export type { Tab };
