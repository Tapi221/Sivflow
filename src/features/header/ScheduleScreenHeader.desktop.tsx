import { useCallback, useRef } from "react";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { TogglePlanResult, type PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/scheduleScreen.types";
import { Download } from "@/ui/icons";
import { useT } from "@shared/i18n/useT";

type ScheduleScreenHeaderViewOption = {
  value: CalendarViewMode;
  label: string;
};

type ScheduleScreenHeaderDesktopProps = {
  titleLabel: string;
  selectedViewMode: CalendarViewModeSelection;
  viewOptions: readonly ScheduleScreenHeaderViewOption[];
  planResultModes: readonly PlanResultMode[];
  showPlanResultToggle: boolean;
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
  onChangePlanResultModes: (value: PlanResultMode[]) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

const CALENDAR_PRINTING_CLASS = "calendar-printing";
const CALENDAR_PRINT_PANEL_CLASS = "calendar-print-panel";
const CALENDAR_PRINT_CLEANUP_DELAY_MS = 30_000;
const CALENDAR_PRINT_BUTTON_CLASS_NAME = "relative z-10 flex h-7 min-h-0 min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-[9px] border border-[#eeeeee] bg-white px-2.5 text-[11px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none ring-0 transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:text-[#6f6f6f] hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none";

const getCalendarPrintPanel = (source: HTMLElement | null): HTMLElement | null => {
  const toolbar = source?.closest<HTMLElement>("[data-calendar-print-toolbar]");

  return toolbar?.parentElement ?? null;
};

const printCalendarPanel = (source: HTMLElement | null) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const panel = getCalendarPrintPanel(source);

  if (!panel) {
    window.print();
    return;
  }

  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    panel.classList.remove(CALENDAR_PRINT_PANEL_CLASS);
    document.body.classList.remove(CALENDAR_PRINTING_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  panel.classList.add(CALENDAR_PRINT_PANEL_CLASS);
  document.body.classList.add(CALENDAR_PRINTING_CLASS);
  window.addEventListener("afterprint", cleanup, { once: true });
  window.requestAnimationFrame(() => {
    window.print();
    window.setTimeout(cleanup, CALENDAR_PRINT_CLEANUP_DELAY_MS);
  });
};

const ScheduleScreenHeaderDesktop = ({
  titleLabel,
  selectedViewMode,
  viewOptions,
  planResultModes,
  showPlanResultToggle,
  onSelectViewMode,
  onChangePlanResultModes,
  onPrevious,
  onNext,
  onToday,
  className,
}: ScheduleScreenHeaderDesktopProps) => {
  const t = useT();
  const printButtonRef = useRef<HTMLButtonElement | null>(null);
  const handlePrintCalendar = useCallback(() => {
    printCalendarPanel(printButtonRef.current);
  }, []);

  return (
    <div className={className} data-calendar-print-toolbar="">
      <h1 className="w-32 shrink-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
        {titleLabel}
      </h1>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <TodayBar
          onPrevious={onPrevious}
          onNext={onNext}
          onToday={onToday}
        />

        <ViewModeDropdown
          value={selectedViewMode}
          onChange={onSelectViewMode}
          options={viewOptions}
        />

        {showPlanResultToggle && (
          <TogglePlanResult
            value={planResultModes}
            onChange={onChangePlanResultModes}
          />
        )}

        <button
          ref={printButtonRef}
          type="button"
          className={CALENDAR_PRINT_BUTTON_CLASS_NAME}
          aria-label={t.exportCalendarPdf}
          title={t.exportCalendarPdf}
          onClick={handlePrintCalendar}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="min-w-0 truncate whitespace-nowrap">PDF</span>
        </button>
      </div>
    </div>
  );
};

export { ScheduleScreenHeaderDesktop };
