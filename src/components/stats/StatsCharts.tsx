import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  normalizeMemoryStability,
  getStabilityPhase,
} from "@/utils/reviewUtils";
import { calculateAverageStability, isReviewed } from "@/utils/statistics";
import { calculateResistanceScore } from "@/utils/reviewMetrics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// ... (omitted lines)

export function StabilityDistributionChart({
  cards,
  className,

  data: manualData = null,
  showReferenceLines = true,
  compact = false,
  tiny = false,
  studyCount,
  minStudyCount = 1,
  onStartStudy,
}) {
  // Use utility for calculation
  const [, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    handleResize(); // Initial check

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate Average Resistance Score
  const averageResistance = useMemo(() => {
    let totalScore = 0;
    let count = 0;

    cards.forEach((card) => {
      if (!isReviewed(card)) return;

      // Same logic as buckets
      let intervalDays = 0;
      const lastReview = card.lastReviewAt
        ? new Date(card.lastReviewAt).getTime()
        : 0;
      const nextReview = card.nextReviewDate
        ? new Date(card.nextReviewDate).getTime()
        : 0;

      if (lastReview > 0 && nextReview > lastReview) {
        const diffMs = nextReview - lastReview;
        intervalDays = diffMs / (1000 * 60 * 60 * 24);
      }

      totalScore += calculateResistanceScore(intervalDays);
      count++;
    });

    return count > 0 ? Math.round(totalScore / count) : 0;
  }, [cards]);

  const hasData = averageResistance > 0;
  const avgPercent = averageResistance;

  // Calculate buckets only if manualData is not provided
  const buckets = useMemo(() => {
    if (manualData) return manualData;

    // Create 5% buckets: 0-5%, 5-10%, ..., 95-100%
    const newBuckets = Array.from({ length: 20 }, (_, i) => ({
      range: `${i * 5}-${(i + 1) * 5}%`,
      count: 0,
      min: i * 5,
      mid: i * 5 + 2.5,
      max: (i + 1) * 5,
    }));

    // Count cards in each bucket (Only reviewed cards)
    cards.forEach((card) => {
      // Only count reviewed cards for the distribution
      if (!isReviewed(card)) return;

      // Calculate interval based on dates
      // If nextReviewDate or lastReviewAt is missing, fallback to 0 or other logic
      // Try to determine interval from schedule first
      let intervalDays = 0;

      const lastReview = card.lastReviewAt
        ? new Date(card.lastReviewAt).getTime()
        : 0;
      const nextReview = card.nextReviewDate
        ? new Date(card.nextReviewDate).getTime()
        : 0;

      if (lastReview > 0 && nextReview > lastReview) {
        const diffMs = nextReview - lastReview;
        intervalDays = diffMs / (1000 * 60 * 60 * 24);
      }

      const resistanceScore = calculateResistanceScore(intervalDays);

      const percentage = Math.min(100, Math.max(0, resistanceScore));
      const bucketIndex = Math.min(19, Math.floor(percentage / 5));
      newBuckets[bucketIndex].count++;
    });
    return newBuckets;
  }, [cards, manualData]);

  const yDomainMax = Math.max(...buckets.map((b) => b.count)) + 2; // More padding for labels

  // Refined Color Palette (Sophisticated/Muted)
  // Low Tolerance -> Red-Orange muted
  // Mid Tolerance -> Yellow-Teal muted
  // High Tolerance -> Teal-Green muted
  const getBarColor = (min: number) => {
    if (min >= 85) return "#5A8684"; // Dark Primary (Stable/Long Term)
    if (min >= 65) return "#7BACAA"; // Primary (Stable)
    if (min >= 40) return "#94bab8"; // Light Primary (Learning)
    if (min >= 20) return "#cbdad9"; // Very Light / Neutral (New)
    return "#e2e8f0"; // Gray (Need Review)
  };

  const isTight = compact || tiny;
  const effectiveStudyCount = useMemo(() => {
    if (typeof studyCount === "number") return studyCount;
    return cards.filter((card) => isReviewed(card)).length;
  }, [cards, studyCount]);
  const isChartReady = effectiveStudyCount >= minStudyCount;
  const dummyBarHeights = [30, 55, 20, 70, 40, 60, 35];

  return (
    <Card
      className={cn(
        "rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.05)] bg-white/80 backdrop-blur-sm",
        tiny
          ? "p-3 rounded-xl"
          : isTight
            ? "p-4 md:p-5 rounded-2xl"
            : "p-6 md:p-10",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          tiny ? "mb-2.5" : isTight ? "mb-4" : "mb-8 md:mb-12",
        )}
      >
        <div>
          <h2
            className={cn(
              "font-bold text-slate-800 tracking-tight",
              tiny ? "text-xs" : isTight ? "text-sm" : "text-base md:text-lg",
            )}
          >
            耐性スコア分布
          </h2>
          <p
            className={cn(
              "text-slate-400 font-medium",
              tiny
                ? "text-[8px]"
                : isTight
                  ? "text-[9px]"
                  : "text-[10px] md:text-xs",
            )}
          >
            学習の定着度と忘れにくさを可視化
          </p>
        </div>
        {isChartReady && hasData && (
          <div
            className={cn(
              "bg-primary-50 rounded-2xl border border-primary-100/50",
              tiny
                ? "px-1.5 py-1 rounded-lg"
                : isTight
                  ? "px-2 py-1 rounded-xl"
                  : "px-4 py-2",
            )}
          >
            <span
              className={cn(
                "uppercase tracking-wider text-primary-600/70 font-bold block leading-none",
                tiny
                  ? "text-[7px] mb-0.5"
                  : isTight
                    ? "text-[8px] mb-0.5"
                    : "text-[10px] mb-1",
              )}
            >
              Average
            </span>
            <span
              className={cn(
                "font-black text-primary-700 leading-none",
                tiny ? "text-xs" : isTight ? "text-sm" : "text-lg md:text-xl",
              )}
            >
              {avgPercent}%
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-0">
        <style>{`
          .recharts-wrapper, .recharts-surface, .recharts-layer { outline: none !important; }
          *:focus { outline: none !important; }
          @keyframes dummyBarPulse {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.25; }
          }
        `}</style>
        <div
          className="w-full outline-none focus:outline-none"
          style={{
            position: "relative",
            width: "100%",
            height: tiny ? 120 : isTight ? 160 : 260,
            minWidth: 0,
          }}
        >
          {isChartReady ? (
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart
                data={buckets}
                margin={{
                  top: 20,
                  right: 0,
                  left: isTight ? -20 : -4,
                  bottom: 0,
                }}
                barCategoryGap="15%"
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="currentColor"
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor="currentColor"
                      stopOpacity={0.7}
                    />
                  </linearGradient>
                  <filter id="shadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                    <feOffset dx="0" dy="2" result="offsetblur" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.1" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <XAxis
                  type="number"
                  dataKey="mid"
                  hide={true}
                  domain={[0, 100]}
                />
                <YAxis
                  hide={isTight}
                  domain={[0, yDomainMax]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  stroke="#94a3b8"
                  width={isTight ? 0 : 28}
                  tickFormatter={(v) => (v === 0 ? "" : String(v))}
                />

                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                  isAnimationActive
                >
                  {buckets.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.min)}
                      style={{ filter: "url(#shadow)" }}
                    />
                  ))}
                </Bar>

                {showReferenceLines && hasData && (
                  <ReferenceLine
                    x={avgPercent}
                    stroke="#689A98"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={({ viewBox }) => {
                      const xPos = viewBox.x;
                      return (
                        <foreignObject
                          x={xPos - 50}
                          y={-10}
                          width={100}
                          height={40}
                          style={{ overflow: "visible" }}
                        >
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary-600 ring-4 ring-primary-100 mb-1" />
                          </div>
                        </foreignObject>
                      );
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="h-full w-full flex items-end gap-3 px-1 pointer-events-none"
              style={{
                opacity: 0.2,
                animation: "dummyBarPulse 2.5s ease-in-out infinite",
              }}
            >
              {dummyBarHeights.map((height, index) => (
                <div
                  key={`dummy-bar-${index}`}
                  className="flex-1 min-w-0 bg-slate-500 rounded-t-[6px]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Phase Visualization Bar - Redesigned */}
        {isChartReady ? (
          <div
            className={cn(
              "px-2 md:px-4",
              tiny ? "mt-2.5" : isTight ? "mt-4" : "mt-8",
            )}
          >
            <div
              className={cn(
                "flex justify-between items-center",
                tiny ? "mb-1" : isTight ? "mb-1.5" : "mb-3",
              )}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Learn Phase
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Mastery
              </span>
            </div>

            <div
              className={cn(
                "flex w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50",
                tiny ? "h-1.5" : isTight ? "h-2" : "h-3",
              )}
            >
              {[
                { width: "20%", color: "#f1f5f9" }, // Gray/Neutral
                { width: "20%", color: "#cbdad9" }, // Very Light Primary
                { width: "25%", color: "#94bab8" }, // Light Primary
                { width: "20%", color: "#7BACAA" }, // Primary
                { width: "15%", color: "#5A8684" }, // Dark Primary
              ].map((phase, i) => (
                <div
                  key={i}
                  style={{ width: phase.width, backgroundColor: phase.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all hover:brightness-95"
                />
              ))}
            </div>

            <div
              className={cn(
                "flex justify-between",
                tiny ? "mt-1.5" : isTight ? "mt-2" : "mt-4",
              )}
            >
              {[
                { label: "要復習", color: "text-slate-400" },
                { label: "覚えかけ", color: "text-slate-500" },
                { label: "定着途上", color: "text-primary-400" },
                { label: "安定維持", color: "text-primary-600" },
                { label: "完全習得", color: "text-primary-800" },
              ].map((phase, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span
                    className={cn(
                      "font-bold",
                      phase.color,
                      tiny ? "text-[8px]" : "text-[9px] md:text-[11px]",
                    )}
                  >
                    {phase.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "px-2 md:px-4",
              tiny ? "mt-2.5" : isTight ? "mt-4" : "mt-8",
            )}
          >
            <p
              className={cn(
                "text-center font-bold text-slate-400",
                tiny ? "text-[9px]" : "text-[10px] md:text-xs",
              )}
            >
              1回以上学習すると表示されます
            </p>
            {onStartStudy && (
              <div className="mt-2 flex justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onStartStudy}
                  className={cn(
                    "font-bold text-slate-600 border-slate-200 hover:bg-slate-50",
                    tiny ? "h-7 px-3 text-[10px]" : "h-8 px-4 text-[11px]",
                  )}
                >
                  学習を始める
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LevelSummary({ cards }) {
  const totalCards = cards.length;

  // Use utility for calculation
  const avgStability = calculateAverageStability(cards);

  // Choose phase label based on result
  // If null -> Unmeasured
  // If number -> Get phase label
  const avgPhaseLabel =
    avgStability !== null
      ? getStabilityPhase(avgStability).shortLabel
      : "未計測";

  const masteredCards = cards.filter((c) => {
    const stability = normalizeMemoryStability(
      c.memoryStability ?? c.memory_stability,
      c.currentLevel ?? c.current_level ?? c.level,
    );
    return getStabilityPhase(stability).key === "solid";
  }).length;

  const needReviewCards = cards.filter((c) => {
    const reviewDate = c.nextReviewDate ?? c.next_review_date;
    if (!reviewDate) return false;
    const normalized =
      typeof reviewDate?.toDate === "function"
        ? reviewDate.toDate()
        : new Date(reviewDate);
    return normalized <= new Date();
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">総カード数</p>
          <p className="text-3xl font-bold text-indigo-600">{totalCards}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">平均フェーズ</p>
          <p className="text-3xl font-bold text-cyan-600">{avgPhaseLabel}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">習得済み</p>
          <p className="text-3xl font-bold text-green-600">{masteredCards}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">要復習</p>
          <p className="text-3xl font-bold text-red-600">{needReviewCards}</p>
        </CardContent>
      </Card>
    </div>
  );
}
