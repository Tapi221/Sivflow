import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useTags } from "@/hooks/useTags";
import type { Card, ReviewLog } from "@/types";

type Period = "7d" | "30d" | "all";

type CardMetaPanelProps = {
  card: Card | null;
  reviewLogs?: ReviewLog[];
  onUpdateTags: (nextTags: string[]) => void;
};

const META_DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
});

function formatDateLabel(value: unknown) {
  if (!value) return "未設定";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "未設定";
  return META_DATE_FORMATTER.format(date);
}

function aggregateDailyLast(logs: ReviewLog[]) {
  const byDay = new Map<string, ReviewLog>();

  for (const log of logs) {
    const day = String(log.reviewedAt).slice(0, 10);
    const current = byDay.get(day);
    if (!current || new Date(log.reviewedAt).getTime() >= new Date(current.reviewedAt).getTime()) {
      byDay.set(day, log);
    }
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, log]) => ({ day, resistanceScore: log.resistanceScore }));
}

export function CardMetaPanel({ card, reviewLogs = [], onUpdateTags }: CardMetaPanelProps) {
  const [newTag, setNewTag] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const { addTag, getTagColor } = useTags();

  const safeLogs = useMemo(
    () =>
      [...reviewLogs].sort(
        (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
      ),
    [reviewLogs]
  );

  const latestReview = safeLogs.at(-1);
  const recent10 = safeLogs.slice(-10).reverse();

  const distribution20 = useMemo(() => {
    const base = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const log of safeLogs.slice(-20)) base[log.rating] += 1;
    return base;
  }, [safeLogs]);

  const chartData = useMemo(() => {
    const daily = aggregateDailyLast(safeLogs);
    if (period === "all") return daily;
    const days = period === "7d" ? 7 : 30;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return daily.filter((d) => new Date(`${d.day}T00:00:00`).getTime() >= threshold.getTime());
  }, [safeLogs, period]);

  const tags = card?.tags ?? [];

  const handleAddTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setNewTag("");
      return;
    }
    await addTag(trimmed);
    onUpdateTags([...tags, trimmed]);
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    onUpdateTags(tags.filter((t) => t !== tag));
  };

  return (
    <aside className="h-full w-80 shrink-0 border-l border-slate-200 bg-white">
      <div className="h-full overflow-y-auto p-4">
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">基本情報</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>作成日: {formatDateLabel(card?.createdAt)}</p>
              <p>更新日: {formatDateLabel(card?.updatedAt)}</p>
              <p>最終復習日: {latestReview ? formatDateLabel(latestReview.reviewedAt) : "未復習"}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">復習（4択評価）</h3>
            <p className="mt-3 text-sm text-slate-700">復習回数: {safeLogs.length}</p>
            <div className="mt-3 space-y-2">
              {recent10.length === 0 ? (
                <p className="text-sm text-slate-500">未復習</p>
              ) : (
                recent10.map((log, idx) => (
                  <div key={`${log.reviewedAt}-${idx}`} className="flex items-center justify-between text-xs text-slate-700">
                    <span>{formatDateLabel(log.reviewedAt)}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5">R{log.rating}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-slate-700">
              {[1, 2, 3, 4].map((r) => (
                <div key={r} className="rounded border border-slate-200 py-1">
                  <p className="text-[10px] text-slate-500">R{r}</p>
                  <p className="font-semibold">{distribution20[r as 1 | 2 | 3 | 4]}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">耐性スコア推移</h3>
              <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
                {(["7d", "30d", "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`rounded px-2 py-1 ${period === p ? "bg-slate-900 text-white" : "text-slate-600"}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === "all" ? "全期間" : p}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 h-40 w-full rounded border border-slate-200 bg-slate-50 p-2">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">データなし</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="day" tickFormatter={(v) => DAY_FORMATTER.format(new Date(`${v}T00:00:00`))} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} width={28} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`${value}`, "Score"]} labelFormatter={(label) => String(label)} />
                    <Line type="monotone" dataKey="resistanceScore" stroke="#0f172a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">タグ管理</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-slate-500">タグなし</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${getTagColor(tag)}`}
                  >
                    {tag}
                    <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => removeTag(tag)}>
                      x
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-500"
                placeholder="タグを追加"
              />
              <button type="button" className="h-9 rounded-md bg-slate-900 px-3 text-sm text-white" onClick={handleAddTag}>
                追加
              </button>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
