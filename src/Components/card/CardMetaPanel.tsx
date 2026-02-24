import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RatingCountTiles } from "@/Components/study/RatingCountTiles";
import { TagBadge } from "@/Components/tag/TagBadge";
import { Switch } from "@/Components/ui/switch";
import { useTags } from "@/hooks/useTags";
import type { Card, ReviewLog } from "@/types";

type Period = "7d" | "30d" | "all";

type CardMetaPanelProps = {
  card: Card | null;
  reviewLogs?: ReviewLog[];
  onUpdateTags: (nextTags: string[]) => void;
  onToggleDraft: (isDraft: boolean) => void;
  onUpdateTitle: (nextTitle: string) => void;
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

export function CardMetaPanel({
  card,
  reviewLogs = [],
  onUpdateTags,
  onToggleDraft,
  onUpdateTitle,
}: CardMetaPanelProps) {
  const [newTag, setNewTag] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [titleInput, setTitleInput] = useState(card?.title ?? "");
  const { addTag, getTagColor } = useTags();

  useEffect(() => {
    setTitleInput(card?.title ?? "");
  }, [card?.id, card?.title]);

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
    const base = { forgot: 0, vague: 0, remembered: 0, easy: 0 };
    for (const log of safeLogs.slice(-20)) {
      if (log.rating === 1) base.forgot += 1;
      else if (log.rating === 2) base.vague += 1;
      else if (log.rating === 3) base.remembered += 1;
      else if (log.rating === 4) base.easy += 1;
    }
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

  const yTicks = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    const values = chartData.map((d) => d.resistanceScore);
    const min = Math.floor(Math.min(...values));
    const max = Math.ceil(Math.max(...values));
    const ticks: number[] = [];
    for (let v = min; v <= max; v += 1) ticks.push(v);
    return ticks.length > 0 ? ticks : [0, 1];
  }, [chartData]);

  const xTicks = useMemo(() => {
    if (chartData.length <= 1) return chartData.map((d) => d.day);
    return chartData
      .filter((_, idx) => idx % 5 === 0 || idx === chartData.length - 1)
      .map((d) => d.day);
  }, [chartData]);

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

  const commitTitle = () => {
    const next = titleInput.trim();
    const current = (card?.title ?? "").trim();
    if (next === current) return;
    onUpdateTitle(next);
  };

  return (
    <aside className="h-full w-80 shrink-0 border-l border-slate-200 bg-white">
      <div className="h-full overflow-y-auto p-4">
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">基本情報</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">タイトル</p>
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitTitle();
                    }
                  }}
                  className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-500"
                  placeholder="タイトル"
                />
              </div>
              <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                <span className="text-xs font-medium text-slate-600">下書き</span>
                <Switch checked={Boolean(card?.isDraft)} onCheckedChange={onToggleDraft} />
              </div>
              <p>作成日: {formatDateLabel(card?.createdAt)}</p>
              <p>更新日: {formatDateLabel(card?.updatedAt)}</p>
              <p>最終復習日: {latestReview ? formatDateLabel(latestReview.reviewedAt) : "未復習"}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">復習</h3>
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
            <RatingCountTiles counts={distribution20} compact className="mt-3" />
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
                    <XAxis
                      dataKey="day"
                      ticks={xTicks}
                      tickFormatter={(v) => DAY_FORMATTER.format(new Date(`${v}T00:00:00`))}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      ticks={yTicks}
                      domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                      allowDecimals={false}
                      width={36}
                      tick={{ fontSize: 10 }}
                    />
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
                  <TagBadge
                    key={tag}
                    label={tag}
                    size="sm"
                    colorClass={getTagColor(tag)}
                    onRemove={() => removeTag(tag)}
                    className="max-w-full"
                  />
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
