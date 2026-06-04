import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { TogglePlanResult, type PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarPrintRangeMode, CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/scheduleScreen.types";
import { Download, Minus, Plus } from "@/ui/icons";
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
  showMonthEventCountControl: boolean;
  monthVisibleEventCount: number;
  printRange?: CalendarPrintRangeState;
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
  onChangePlanResultModes: (value: PlanResultMode[]) => void;
  onChangeMonthVisibleEventCount: (value: number) => void;
  onChangePrintRange?: (value: CalendarPrintRangeState) => void;
  onPrintCalendar?: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

type CalendarPrintRangeOption = {
  value: CalendarPrintRangeMode;
  label: string;
};

const CALENDAR_PRINT_MENU_CLASS_NAME = "relative flex shrink-0";
const CALENDAR_PRINT_BUTTON_CLASS_NAME = "relative z-10 flex h-7 min-h-0 min-w-[84px] shrink-0 items-center justify-center gap-1 rounded-[9px] border border-[#eeeeee] bg-white px-2.5 text-[11px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none ring-0 transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:text-[#6f6f6f] hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60";
const CALENDAR_PRINT_POPOVER_CLASS_NAME = "absolute right-0 top-full z-30 mt-1.5 w-[238px] rounded-[12px] border border-[#e6e8ec] bg-[#fbfbfc] p-2.5 text-[#1c1c1e] shadow-[0_4px_14px_rgba(15,23,42,0.08)]";
const CALENDAR_PRINT_POPOVER_FIELD_CLASS_NAME = "flex flex-col gap-1.5";
const CALENDAR_PRINT_POPOVER_LABEL_CLASS_NAME = "text-[10px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c]";
const CALENDAR_PRINT_RANGE_SELECT_CLASS_NAME = "h-8 w-full rounded-[9px] border border-[#e6e8ec] bg-white px-2.5 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#4b5563] outline-none ring-0 focus:border-[#d4d8df] focus:outline-none focus:ring-0 focus-visible:outline-none";
const CALENDAR_PRINT_RANGE_DATE_INPUT_CLASS_NAME = "h-8 w-full rounded-[9px] border border-[#e6e8ec] bg-white px-2.5 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#4b5563] outline-none ring-0 focus:border-[#d4d8df] focus:outline-none focus:ring-0 focus-visible:outline-none";
const CALENDAR_PRINT_POPOVER_ACTION_CLASS_NAME = "mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-[9px] bg-[#2554d9] px-3 text-[12px] font-semibold tracking-[-0.01em] text-white outline-none ring-0 transition-colors duration-200 hover:bg-[#2148bd] focus:outline-none focus:ring-0 focus-visible:outline-none";
const MONTH_EVENT_COUNT_CONTROL_CLASS_NAME = "flex h-7 shrink-0 items-center overflow-hidden rounded-[9px] border border-[#eeeeee] bg-white text-[11px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
const MONTH_EVENT_COUNT_BUTTON_CLASS_NAME = "flex h-7 w-7 items-center justify-center text-[#8c8c8c] outline-none transition-colors duration-200 hover:bg-[#f7f7f8] hover:text-[#4b5563] focus:outline-none focus:ring-0 focus-visible:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-40";
const DEFAULT_CALENDAR_PRINT_RANGE: CalendarPrintRangeState = { mode: "current", customStartDate: "", customEndDate: "" };

const clampMonthVisibleEventCount = (value: number): number => Math.min(C.MONTH_VISIBLE_EVENT_COUNT_MAX, Math.max(C.MONTH_VISIBLE_EVENT_COUNT_MIN, Math.round(value)));

const ScheduleScreenHeaderDesktop = ({
  titleLabel,
  selectedViewMode,
  viewOptions,
  planResultModes,
  showPlanResultToggle,
  showMonthEventCountControl,
  monthVisibleEventCount,
  printRange,
  onSelectViewMode,
  onChangePlanResultModes,
  onChangeMonthVisibleEventCount,
  onChangePrintRange,
  onPrintCalendar,
  onPrevious,
  onNext,
  onToday,
  className,
}: ScheduleScreenHeaderDesktopProps) => {
  const t = useT();
  const printButtonRef = useRef<HTMLButtonElement | null>(null);
  const printPopoverRef = useRef<HTMLDivElement | null>(null);
  const [fallbackPrintRange, setFallbackPrintRange] = useState<CalendarPrintRangeState>(DEFAULT_CALENDAR_PRINT_RANGE);
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const resolvedPrintRange = printRange ?? fallbackPrintRange;
  const canDecreaseMonthEventCount = monthVisibleEventCount > C.MONTH_VISIBLE_EVENT_COUNT_MIN;
  const canIncreaseMonthEventCount = monthVisibleEventCount < C.MONTH_VISIBLE_EVENT_COUNT_MAX;
  const printButtonClassName = `${CALENDAR_PRINT_BUTTON_CLASS_NAME}${isPrintPopoverOpen ? " bg-[#f7f7f8] text-[#4b5563]" : ""}`;
  const printRangeOptions: readonly CalendarPrintRangeOption[] = [
    { value: "current", label: t.printRangeCurrent },
    { value: "day", label: t.printRangeDay },
    { value: "week", label: t.printRangeWeek },
    { value: "month", label: t.printRangeMonth },
    { value: "custom", label: t.printRangeCustom },
  ];
  const handlePrintCalendar = useCallback(() => {
    setIsPrintPopoverOpen(false);
    onPrintCalendar?.();
  }, [onPrintCalendar]);
  const handleTogglePrintPopover = useCallback(() => {
    setIsPrintPopoverOpen((value) => !value);
  }, []);
  const handleUpdatePrintRange = useCallback((value: CalendarPrintRangeState) => {
    setFallbackPrintRange(value);
    onChangePrintRange?.(value);
  }, [onChangePrintRange]);
  const handleChangePrintRangeMode = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    handleUpdatePrintRange({ ...resolvedPrintRange, mode: event.target.value as CalendarPrintRangeMode });
  }, [handleUpdatePrintRange, resolvedPrintRange]);
  const handleChangeCustomStartDate = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    handleUpdatePrintRange({ ...resolvedPrintRange, customStartDate: event.target.value });
  }, [handleUpdatePrintRange, resolvedPrintRange]);
  const handleChangeCustomEndDate = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    handleUpdatePrintRange({ ...resolvedPrintRange, customEndDate: event.target.value });
  }, [handleUpdatePrintRange, resolvedPrintRange]);
  const handleDecreaseMonthVisibleEventCount = useCallback(() => {
    onChangeMonthVisibleEventCount(clampMonthVisibleEventCount(monthVisibleEventCount - 1));
  }, [monthVisibleEventCount, onChangeMonthVisibleEventCount]);
  const handleIncreaseMonthVisibleEventCount = useCallback(() => {
    onChangeMonthVisibleEventCount(clampMonthVisibleEventCount(monthVisibleEventCount + 1));
  }, [monthVisibleEventCount, onChangeMonthVisibleEventCount]);

  useEffect(() => {
    if (!isPrintPopoverOpen || typeof document === "undefined") return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (printButtonRef.current?.contains(target) || printPopoverRef.current?.contains(target)) return;
      setIsPrintPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPrintPopoverOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPrintPopoverOpen]);

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

        {showMonthEventCountControl && (
          <div className={MONTH_EVENT_COUNT_CONTROL_CLASS_NAME} role="group" aria-label={t.monthEventCountLabel} title={t.monthEventCountLabel}>
            <span className="px-2 text-[10px] text-[#9ca3af]">{t.monthEventCountShortLabel}</span>
            <button type="button" className={MONTH_EVENT_COUNT_BUTTON_CLASS_NAME} aria-label={t.monthEventCountDecreaseLabel} title={t.monthEventCountDecreaseLabel} disabled={!canDecreaseMonthEventCount} onClick={handleDecreaseMonthVisibleEventCount}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[18px] text-center text-[11px] text-[#4b5563]" aria-live="polite">{monthVisibleEventCount}</span>
            <button type="button" className={MONTH_EVENT_COUNT_BUTTON_CLASS_NAME} aria-label={t.monthEventCountIncreaseLabel} title={t.monthEventCountIncreaseLabel} disabled={!canIncreaseMonthEventCount} onClick={handleIncreaseMonthVisibleEventCount}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className={CALENDAR_PRINT_MENU_CLASS_NAME}>
          <button
            ref={printButtonRef}
            type="button"
            className={printButtonClassName}
            aria-label={t.exportCalendarPdf}
            aria-haspopup="dialog"
            aria-expanded={isPrintPopoverOpen}
            title={t.exportCalendarPdf}
            onClick={handleTogglePrintPopover}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="min-w-0 truncate whitespace-nowrap">PDF</span>
            <span className="text-[10px] leading-none text-[#9ca3af]">⌄</span>
          </button>

          {isPrintPopoverOpen && (
            <div ref={printPopoverRef} className={CALENDAR_PRINT_POPOVER_CLASS_NAME} role="dialog" aria-label={t.exportCalendarPdf}>
              <label className={CALENDAR_PRINT_POPOVER_FIELD_CLASS_NAME}>
                <span className={CALENDAR_PRINT_POPOVER_LABEL_CLASS_NAME}>{t.printRangeLabel}</span>
                <select
                  className={CALENDAR_PRINT_RANGE_SELECT_CLASS_NAME}
                  value={resolvedPrintRange.mode}
                  aria-label={t.printRangeLabel}
                  title={t.printRangeLabel}
                  onChange={handleChangePrintRangeMode}
                >
                  {printRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              {resolvedPrintRange.mode === "custom" && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className={CALENDAR_PRINT_POPOVER_FIELD_CLASS_NAME}>
                    <span className={CALENDAR_PRINT_POPOVER_LABEL_CLASS_NAME}>{t.printRangeStartDate}</span>
                    <input className={CALENDAR_PRINT_RANGE_DATE_INPUT_CLASS_NAME} type="date" value={resolvedPrintRange.customStartDate} aria-label={t.printRangeStartDate} title={t.printRangeStartDate} onChange={handleChangeCustomStartDate} />
                  </label>
                  <label className={CALENDAR_PRINT_POPOVER_FIELD_CLASS_NAME}>
                    <span className={CALENDAR_PRINT_POPOVER_LABEL_CLASS_NAME}>{t.printRangeEndDate}</span>
                    <input className={CALENDAR_PRINT_RANGE_DATE_INPUT_CLASS_NAME} type="date" value={resolvedPrintRange.customEndDate} aria-label={t.printRangeEndDate} title={t.printRangeEndDate} onChange={handleChangeCustomEndDate} />
                  </label>
                </div>
              )}

              <button type="button" className={CALENDAR_PRINT_POPOVER_ACTION_CLASS_NAME} onClick={handlePrintCalendar}>
                <Download className="h-3.5 w-3.5" />
                <span>{t.exportCalendarPdf}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { ScheduleScreenHeaderDesktop };
