import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { RatingCountTiles } from "@/components/study/RatingCountTiles";
import TagManagerDialog from "@/components/tag/TagManagerDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import type { Card, ReviewLog } from "@/types";
import { NUMERIC_TYPO, UI_TYPO } from "@/styles/typography";

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

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toDayKeyAndTs(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dayDate = new Date(year, month, day);
  const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { dayKey, dayTs: dayDate.getTime() };
}

function formatDateLabel(value: unknown) {
  const date = toValidDate(value);
  if (!date) return "未設定";
  return META_DATE_FORMATTER.format(date);
}

function aggregateDailyLast(logs: ReviewLog[]) {
  const byDay = new Map<
    string,
    { dayKey: string; dayTs: number; reviewedAtTs: number; resistanceScore: number }
  >();

  for (const log of logs) {
    const reviewedAt = toValidDate(log.reviewedAt);
    if (!reviewedAt) continue;
    const reviewedAtTs = reviewedAt.getTime();
    const { dayKey, dayTs } = toDayKeyAndTs(reviewedAt);
    const current = byDay.get(dayKey);
    if (!current || reviewedAtTs >= current.reviewedAtTs) {
      byDay.set(dayKey, { dayKey, dayTs, reviewedAtTs, resistanceScore: log.resistanceScore });
    }
  }

  return [...byDay.values()]
    .sort((a, b) => a.dayTs - b.dayTs)
    .map(({ dayKey, dayTs, resistanceScore }) => ({ dayKey, dayTs, resistanceScore }));
}

export function CardMetaPanel({
  card,
  reviewLogs = [],
  onUpdateTags,
  onToggleDraft,
  onUpdateTitle,
}: CardMetaPanelProps) {
  const [period, setPeriod] = useState<Period>("30d");
  const [titleInput, setTitleInput] = useState(card?.title ?? "");
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  useEffect(() => {
    setTitleInput(card?.title ?? "");
  }, [card?.id, card?.title]);

  const safeLogs = useMemo(
    () => [...reviewLogs].sort((a, b) => {
      const aTs = toValidDate(a.reviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
      const bTs = toValidDate(b.reviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
      return aTs - bTs;
    }),
    [reviewLogs]
  );

  const latestReview = safeLogs.at(-1);
  const recent10 = safeLogs.slice(-10).reverse();

  // reviewCount は snake_case で入ってくるケースがあるので両対応しておく（UI側は事故らないのが正義）
  const rawReviewCount = (card?.reviewCount ?? (card as any)?.review_count ?? 0) as unknown;
  const normalizedReviewCount = Number.isFinite(Number(rawReviewCount))
    ? Math.max(0, Math.trunc(Number(rawReviewCount)))
    : 0;

  // SSOT は card.reviewCount（互換あり）。ログはあってもなくても表示が壊れないよう max を取る。
  const completedReviewCount = Math.max(normalizedReviewCount, safeLogs.length);
  const nextReviewAttempt = completedReviewCount + 1;

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
    const thresholdTs = threshold.getTime();
    return daily.filter((d) => d.dayTs >= thresholdTs);
  }, [safeLogs, period]);

  const xTicks = useMemo(() => {
    if (chartData.length <= 1) return chartData.map((d) => d.dayTs);
    return chartData
      .filter((_, idx) => idx % 5 === 0 || idx === chartData.length - 1)
      .map((d) => d.dayTs);
  }, [chartData]);

  const tags = card?.tags ?? [];

  const commitTitle = () => {
    const next = titleInput.trim();
    const current = (card?.title ?? "").trim();
    if (next === current) return;
    onUpdateTitle(next);
  };

  return (
    <aside className={`h-full w-80 shrink-0 border-l border-slate-200 bg-white ${UI_TYPO} ${NUMERIC_TYPO}`}>
      <div className="h-full overflow-y-auto p-4">
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">基本情報</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div>
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={commitTitle}
                  disabled={!card}
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
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">タグ管理</h3>
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setTagManagerOpen(true)}>
                    色を変更
                  </Button>
                </div>
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                  <TagInput
                    tags={tags}
                    onChange={(nextTags) => {
                      if (!card) return;
                      onUpdateTags(nextTags);
                    }}
                    placeholder="タグを選択・追加"
                    quietHover
                    className={`bg-transparent ${!card ? "pointer-events-none opacity-60" : ""}`}
                  />
                </div>
              </section>
              <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                <span className="text-xs font-medium text-slate-600">下書き</span>
                <Switch checked={Boolean(card?.isDraft)} onCheckedChange={onToggleDraft} disabled={!card} />
              </div>
              <p>作成日: {formatDateLabel(card?.createdAt ?? (card as any)?.created_at)}</p>
              <p>更新日: {formatDateLabel(card?.updatedAt ?? (card as any)?.updated_at)}</p>
              <p>最終復習日: {latestReview ? formatDateLabel(latestReview.reviewedAt) : formatDateLabel(card?.lastReviewAt ?? (card as any)?.last_review_at)}</p>
              <p>次回復習日 ({nextReviewAttempt}回目): {formatDateLabel(card?.nextReviewDate ?? (card as any)?.next_review_date)}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">復習</h3>
            <p className="mt-3 text-sm text-slate-700">復習回数: {completedReviewCount}</p>
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
            <RatingCountTiles counts={distribution20} compact disableHover className="mt-3" />
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
                      dataKey="dayTs"
                      ticks={xTicks}
                      tickFormatter={(v) => {
                        const date = new Date(Number(v));
                        return Number.isNaN(date.getTime()) ? "" : DAY_FORMATTER.format(date);
                      }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      domain={["dataMin", "dataMax"]}
                      tickCount={6}
                      allowDecimals={false}
                      width={36}
                      tick={{ fontSize: 10 }}
                    />
                    <Line type="monotone" dataKey="resistanceScore" stroke="#0f172a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

        </div>
      </div>
      <TagManagerDialog open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
    </aside>
  );
}