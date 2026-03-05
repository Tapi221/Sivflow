import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { RatingCountTiles } from "@/features/study/RatingCountTiles";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import type { Card, ReviewLog } from "@/types";
import { NUMERIC_TYPO, UI_TYPO } from "@/styles/tokens/typography";
import { calculateResistanceScore } from "@/utils/reviewMetrics";
import { useTags, resolveCardTagNames } from "@/hooks/useTags";

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


function formatDateLabel(value: unknown) {
  const date = toValidDate(value);
  if (!date) return "未設定";
  return META_DATE_FORMATTER.format(date);
}


export function CardMetaPanel({
  card,
  reviewLogs = [],
  onUpdateTags,
  onToggleDraft,
  onUpdateTitle,
}: CardMetaPanelProps) {
  const infoRowClass = "h-[var(--meta-row-px)] leading-[var(--meta-row-px)] text-sm text-[var(--sidebar-text)]";
  const actionRowClass = "min-h-[var(--meta-action-min-h)] flex items-center";
  const [period, setPeriod] = useState<Period>("30d");
  const [titleInput, setTitleInput] = useState(card?.title ?? "");
  const [, setSearchParams] = useSearchParams();
  const { tagById } = useTags();

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

  const currentResistanceScore = useMemo(() => {
    if (!card) return null;
    if (latestReview?.resistanceScore != null && latestReview.resistanceScore > 0) {
      return latestReview.resistanceScore;
    }
    const next = toValidDate(card.nextReviewDate ?? (card as any).next_review_date);
    const last = toValidDate(card.lastReviewAt ?? (card as any).last_review_at);
    if (!next || !last) return null;
    const intervalDays = Math.max(0, (next.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return calculateResistanceScore(intervalDays);
  }, [card, latestReview]);

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
    const all = safeLogs
      .filter((log) => log.resistanceScore != null)
      .map((log, idx) => ({ reviewIndex: idx + 1, resistanceScore: log.resistanceScore }));
    if (period === "all") return all;
    const count = period === "7d" ? 7 : 30;
    return all.slice(-count);
  }, [safeLogs, period]);

  const xTicks = useMemo(() => {
    if (chartData.length <= 1) return chartData.map((d) => d.reviewIndex);
    return chartData
      .filter((_, idx) => idx % 5 === 0 || idx === chartData.length - 1)
      .map((d) => d.reviewIndex);
  }, [chartData]);

  // tagIds 優先、fallback: card.tags（移行期間互換）
  const tags = resolveCardTagNames(card?.tagIds, card?.tags, tagById);

  const commitTitle = () => {
    const next = titleInput.trim();
    const current = (card?.title ?? "").trim();
    if (next === current) return;
    onUpdateTitle(next);
  };

  const openTagSettings = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("settings", "true");
      next.set("settingsTab", "tags");
      return next;
    }, { replace: true });
  };

  return (
    <aside
      className={`meta-panel h-full w-80 shrink-0 border-l border-sidebar-border bg-sidebar font-serif text-[var(--sidebar-text)] ${UI_TYPO} ${NUMERIC_TYPO}`}
      style={
        {
          "--meta-row-px": "24px",
          "--meta-action-min-h": "44px",
          backgroundColor: "var(--sidebar-bg)",
        } as CSSProperties
      }
    >
      <div className="h-full overflow-y-auto bg-sidebar p-4">
        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">基本情報</h3>
            <div className="mt-3 space-y-2 text-sm text-[var(--sidebar-text)]">
              <div className={actionRowClass}>
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
                  className="h-[var(--meta-action-min-h)] w-full rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-2 text-sm leading-[var(--meta-row-px)] outline-none focus:border-[var(--sidebar-text-muted)]"
                  placeholder="タイトル"
                />
              </div>
              <section>
                <div className={`${actionRowClass} justify-between`}>
                  <h3 className="text-xs font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">タグ管理</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-[var(--meta-action-min-h)] px-3 text-xs leading-[var(--meta-row-px)]"
                    onClick={openTagSettings}
                  >
                    設定で管理
                  </Button>
                </div>
                <div className="mt-3 rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)] px-2 py-2">
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
              <div className={`${actionRowClass} justify-between rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)] px-2`}>
                <span className="text-xs font-medium leading-[var(--meta-row-px)] text-[var(--sidebar-text-muted)]">下書き</span>
                <Switch checked={Boolean(card?.isDraft)} onCheckedChange={onToggleDraft} disabled={!card} />
              </div>
              <p className={infoRowClass}>作成日: {formatDateLabel(card?.createdAt ?? (card as any)?.created_at)}</p>
              <p className={infoRowClass}>更新日: {formatDateLabel(card?.updatedAt ?? (card as any)?.updated_at)}</p>
              <p className={infoRowClass}>最終復習日: {latestReview ? formatDateLabel(latestReview.reviewedAt) : formatDateLabel(card?.lastReviewAt ?? (card as any)?.last_review_at)}</p>
              <p className={infoRowClass}>次回復習日 ({nextReviewAttempt}回目): {formatDateLabel(card?.nextReviewDate ?? (card as any)?.next_review_date)}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">復習</h3>
            <p className={`mt-3 ${infoRowClass}`}>復習回数: {completedReviewCount}</p>
            <div className="mt-3 space-y-2">
              {recent10.length === 0 ? (
                <p className="h-[var(--meta-row-px)] leading-[var(--meta-row-px)] text-sm text-[var(--sidebar-text-muted)]">未復習</p>
              ) : (
                recent10.map((log, idx) => (
                  <div
                    key={`${log.reviewedAt}-${idx}`}
                    className="flex h-[var(--meta-row-px)] items-center justify-between text-xs leading-[var(--meta-row-px)] text-[var(--sidebar-text)]"
                  >
                    <span>{formatDateLabel(log.reviewedAt)}</span>
                    <span className="rounded bg-[var(--sidebar-active-bg)] px-2 leading-[var(--meta-row-px)]">R{log.rating}</span>
                  </div>
                ))
              )}
            </div>
            <RatingCountTiles counts={distribution20} compact disableHover className="mt-3" />
          </section>

          <section>
            {currentResistanceScore !== null && (
              <div className="mb-3 flex min-h-[var(--meta-action-min-h)] items-center justify-between rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)] px-3">
                <span className="text-xs font-medium leading-[var(--meta-row-px)] text-[var(--sidebar-text-muted)]">現在の耐性スコア</span>
                <span className="text-sm font-semibold leading-[var(--meta-row-px)] tabular-nums text-[var(--sidebar-text)]">{currentResistanceScore}%</span>
              </div>
            )}
            <div className="flex min-h-[var(--meta-action-min-h)] items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-[var(--sidebar-text-muted)] uppercase">耐性スコア推移</h3>
              <div className="flex rounded-md border border-[var(--sidebar-border)] p-0.5 text-xs">
                {(["7d", "30d", "all"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`min-h-[var(--meta-action-min-h)] rounded px-2 leading-[var(--meta-row-px)] ${period === p ? "bg-[var(--sidebar-text)] text-white" : "text-[var(--sidebar-text-muted)]"}`}
                    onClick={() => setPeriod(p)}
                  >
                    {p === "all" ? "全期間" : p === "7d" ? "直近7" : "直近30"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 h-40 w-full rounded border border-[var(--sidebar-border)] bg-[var(--sidebar-active-bg)] p-2">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--sidebar-text-muted)]">データなし</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="reviewIndex"
                      ticks={xTicks}
                      tick={{ fontSize: 10 }}
                      label={{ value: "復習回数", position: "insideBottomRight", offset: -4, fontSize: 10 }}
                    />
                    <YAxis
                      domain={[0, 100]}
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
    </aside>
  );
}
