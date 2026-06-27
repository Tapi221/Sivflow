import React from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { Card, CardContent } from "@web-renderer/chip/ui/card";
import type { PracticeFilterRating } from "@/features/study/hooks/usePracticeMode";
import { RatingCountTiles } from "./RatingCountTiles";



type Tile = {
  rating: PracticeFilterRating; score: number; Icon: unknown; };
type Props = {
  ratingTiles: Tile[];
  ratingCounts: Record<PracticeFilterRating, number>;
  isPracticeFeatureEnabled: boolean;
  results: Record<string | number, number>;
  ratingLabels: Record<PracticeFilterRating, string>;
  handleStartPractice: (rating: PracticeFilterRating) => void;
  onBackToSchedule: () => void;
  compact?: boolean;
};



const StudyComplete = ({ ratingTiles, ratingCounts, isPracticeFeatureEnabled, results, ratingLabels, handleStartPractice, onBackToSchedule, compact = false }: Props) => {
  const faceDesign = { forgot: { iconWrap: "bg-red-50 text-[#FF5A65] face-badge-convex", labelHover: "group-hover:text-[#FF5A65]", svg: (<> <circle cx="12" cy="12" r="10" stroke="none" /> <path d="M16 16s-1.5-2-4-2-4 2-4 2" /> <line x1="9" y1="9" x2="9.01" y2="9" /> <line x1="15" y1="9" x2="15.01" y2="9" /> </>) }, vague: { iconWrap: "bg-amber-50 text-[#F9A825] face-badge-convex", labelHover: "group-hover:text-[#F9A825]", svg: (<> <line x1="8" y1="15" x2="16" y2="15" /> <line x1="9" y1="9" x2="9.01" y2="9" /> <line x1="15" y1="9" x2="15.01" y2="9" /> </>) }, remembered: { iconWrap: "bg-blue-50 text-[#00A3FF] face-badge-convex", labelHover: "group-hover:text-[#00A3FF]", svg: (<> <path d="M8 14s1.5 2 4 2 4-2 4-2" /> <line x1="9" y1="9" x2="9.01" y2="9" /> <line x1="15" y1="9" x2="15.01" y2="9" /> </>) }, easy: { iconWrap: "bg-emerald-50 text-[#00B67A] face-badge-convex", labelHover: "group-hover:text-[#00B67A]", svg: (<> <path d="M8 13s1.5 3 4 3 4-3 4-3" /> <line x1="9" y1="9" x2="9.01" y2="9" /> <line x1="15" y1="9" x2="15.01" y2="9" /> </>) } } as const;

  return (
    <div
      className={`animate-in fade-in duration-700 ${compact ? "h-full min-h-0 flex flex-col" : ""}`}
    >
      <Card
        className={`max-w-3xl mx-auto border-none shadow-xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-700 delay-300 ${compact ? "w-full" : ""}`}
      >
        <CardContent
          className={`text-center relative overflow-hidden ${compact ? "py-8 px-6 md:py-9 md:px-8" : "py-12 px-8"}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-[#e0f2f1] opacity-80"></div>
          <div className="relative z-10">
            <h2
              className={`font-bold mb-2 text-[#1e293b] ${compact ? "text-3xl leading-none md:text-3xl" : "text-2xl"}`}
            >
              Complete!
            </h2>
            <p
              className={`text-sm text-[#94a3b8] ${compact ? "mb-5 md:mb-6" : "mb-8"}`}
            >
              全てのカードを学習しました
            </p>
            <div
              className={`grid grid-cols-2 md:grid-cols-4 max-w-2xl mx-auto ${compact ? "gap-2 md:gap-2.5 mb-6" : "gap-2 md:gap-3 mb-8"}`}
            >
              {ratingTiles.map(({ rating }) => {
                const count = ratingCounts[rating] ?? 0;
                const canPractice = isPracticeFeatureEnabled && count > 0;
                const design = faceDesign[rating];

                if (!isPracticeFeatureEnabled) return null;

                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleStartPractice(rating)}
                    disabled={!canPractice}
                    className={`bg-white rounded-2xl border border-[var(--surface-border)] surface-concave flex flex-col items-center transform transition-all ${compact ? "p-2.5 md:p-3" : "p-3"} ${canPractice ? "hover:scale-105" : "opacity-50 cursor-not-allowed"}`}
                  >
                    <div
                      className={`mb-1 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${design.iconWrap}`}
                    >
                      <svg
                        width="18"
                        height="18"
                        className="md:w-5 md:h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {design.svg}
                      </svg>
                    </div>
                    <span className="text-lg font-bold text-[#1e293b]">
                      {count}
                    </span>
                    <span
                      className={`text-xs text-[#94a3b8] font-medium uppercase tracking-wider ${design.labelHover}`}
                    >
                      {ratingLabels[rating]}
                    </span>
                  </button>
                );
              })}
            </div>
            {!isPracticeFeatureEnabled && (
              <RatingCountTiles
                compact={compact}
                className={
                  compact ? "max-w-2xl mx-auto mb-6" : "max-w-2xl mx-auto mb-8"
                }
                surface="concave"
                counts={{
                  forgot: results[0] ?? 0,
                  vague: results[1] ?? 0,
                  remembered: results[2] ?? 0,
                  easy: results[3] ?? 0,
                }}
              />
            )}

            {isPracticeFeatureEnabled && (
              <p
                className={`text-xs text-slate-400 ${compact ? "mb-5 md:mb-6" : "mb-8"}`}
              >
                ※追い復習は追加練習です（復習予定は変更されません）
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={onBackToSchedule}
                className="rounded-xl px-8 h-12 border-slate-200 hover:bg-slate-50 text-[#64748b] text-base"
              >
                スケジュールに戻る
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};



export { StudyComplete };
