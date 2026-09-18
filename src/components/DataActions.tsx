import { useRef, useState } from "react";
import { downloadEventsJson, parseEventList } from "../lib/storage";
import type { RecruitEvent } from "../types";

export function DataActions({
  events,
  onImport,
}: {
  events: RecruitEvent[];
  onImport: (events: RecruitEvent[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseEventList(JSON.parse(String(reader.result)));
        onImport(parsed);
        setMessage(`已导入 ${parsed.length} 场，保存在本机浏览器`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "无法读取这个 JSON");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            downloadEventsJson(events);
            setMessage("已下载 JSON，日程仍留在这台浏览器里");
          }}
          className="h-9 rounded-[11px] bg-surface-muted px-3.5 text-[13px] font-medium hover:bg-[#ececf0]"
        >
          导出 JSON
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-9 rounded-[11px] px-3.5 text-[13px] font-medium text-accent hover:underline"
        >
          导入
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </div>
      <p className="text-[12px] text-muted">
        {message ?? "增改会立刻写入本机，换设备请先导出 JSON"}
      </p>
    </div>
  );
}
