import { useRef, useState } from "react";
import { downloadEventsJson, parseEventList } from "../lib/storage";
import type { RecruitEvent } from "../types";

export function DataPanel({
  events,
  onImport,
  onLoadSample,
}: {
  events: RecruitEvent[];
  onImport: (events: RecruitEvent[]) => void;
  onLoadSample: () => void;
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
    <section className="mx-auto flex w-full max-w-[480px] flex-col gap-6">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">数据管理</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          日程只存在这台浏览器。换设备或清站点数据前先导出 JSON。
        </p>
      </div>

      <div className="rounded-[20px] bg-surface-muted px-5 py-4">
        <p className="text-[13px] text-muted">本机已存</p>
        <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em]">{events.length} 场</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            downloadEventsJson(events);
            setMessage("已下载 JSON，日程仍留在这台浏览器里");
          }}
          className="h-11 rounded-[12px] bg-accent text-[15px] font-medium text-white hover:bg-accent-hover"
        >
          导出 JSON
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-11 rounded-[12px] bg-surface-muted text-[15px] font-medium"
        >
          导入 JSON
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
        {events.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              onLoadSample();
              setMessage("已载入示例，可在日程页查看占用与重合");
            }}
            className="h-11 text-[14px] text-accent hover:underline"
          >
            载入示例日程
          </button>
        ) : null}
      </div>

      {message ? <p className="text-[13px] text-muted">{message}</p> : null}
    </section>
  );
}
