import { EmptyMetaPanel } from "@/components/card/panels/EmptyMetaPanel";
import { RatingCountTiles } from "@/features/study/RatingCountTiles";
import { createPageUrl } from "@/platform/web/navigation/toWebPath";
import { ChevronRight } from "@/ui/icons";

type CalendarMetaPanelProps = {
  isOpen: boolean;
  isTodaySelected: boolean;
  todayDueCount: number;
  todayDescription: string;
  ratings: {
    forgot: number;
    vague: number;
    remembered: number;
    easy: number;
  };
  onNavigateStudy: (path: string) => void;
};

export const CalendarMetaPanel = ({
  isOpen,
  isTodaySelected,
  todayDueCount,
  todayDescription,
  ratings,
  onNavigateStudy,
}: CalendarMetaPanelProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <EmptyMetaPanel contentClassName="space-y-3">
      {isTodaySelected ? (
        <>
          <button
            type="button"
            onClick={() => onNavigateStudy(createPageUrl("study"))}
            className="w-full text-left rounded-2xl border border-[var(--surface-border)] bg-white p-3 surface-panel-convex transition-colors hover:bg-[var(--sidebar-active-bg)]"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                優先タスク
              </span>
              {todayDueCount > 0 ? (
                <span className="h-2 w-2 rounded-full bg-[#FF5A65]" />
              ) : null}
            </div>

            <h3 className="text-2xl font-bold leading-tight text-slate-800">
              今日の復習
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {todayDescription}
            </p>

            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-convex text-4xl font-bold italic leading-none tracking-tight text-primary-600">
                  {todayDueCount}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Cards Due
                </div>
              </div>

              <div className="face-badge-convex flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </button>

          <section>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              TODAY&apos;S RATINGS
            </h3>
            <RatingCountTiles
              counts={{
                forgot: ratings.forgot,
                vague: ratings.vague,
                remembered: ratings.remembered,
                easy: ratings.easy,
              }}
              compact
              disableHover
              singleRow
              surface="concave"
            />
          </section>
        </>
      ) : null}
    </EmptyMetaPanel>
  );
};
