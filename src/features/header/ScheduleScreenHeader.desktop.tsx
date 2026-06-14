import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@shared/i18n/useT";
import type { ChangeEvent, ReactNode, Ref } from "react";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import type { PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import { TogglePlanResult } from "@/chip/toggle/Toggle.planresult";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarPrintRangeMode, CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/scheduleScreen.types";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Download, Minus, Plus } from "@/chip/icons";

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
  onAddEvent?: () => void;
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
type ToolbarActionButtonProps = {
  children: ReactNode;
  label: string;
  title?: string;
  isActive?: boolean;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  ariaHasPopup?: "dialog";
  ariaExpanded?: boolean;
  onClick: () => void;
};

const SCHEDULE_SCREEN_HEADER_CLASS_NAME = "mb-1 flex shrink-0 items-center justify-between gap-3 px-4 pt-2";
const SCHEDULE_SCREEN_HEADER_TITLE_CLASS_NAME = "flex h-8 min-w-40 max-w-72 shrink-0 items-center truncate text-2xl font-bold leading-none tracking-tight text-neutral-900";
const SCHEDULE_SCREEN_HEADER_ACTIONS_CLASS_NAME = "ml-auto flex min-w-0 shrink-0 items-center gap-1.5";
const SCHEDULE_SCREEN_HEADER_LABEL_CLASS_NAME = "min-w-0 truncate whitespace-nowrap";
const TOOLBAR_ACTION_BUTTON_CLASS_NAME = "relative z-10 flex h-6 min-h-0 min-w-14 shrink-0 items-center justify-center gap-1 rounded-md border-0 bg-transparent px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-500 shadow-none outline-none ring-0 transition-all duration-150 ease-out hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-wait disabled:opacity-60";
const TOOLBAR_ACTION_BUTTON_ACTIVE_CLASS_NAME = "bg-neutral-100 text-neutral-800";
const CALENDAR_PRINT_MENU_CLASS_NAME = "relative flex shrink-0";
const CALENDAR_PRINT_POPOVER_CLASS_NAME = "absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-neutral-200 bg-white p-1 text-neutral-900 shadow-sm";
const CALENDAR_PRINT_POPOVER_TITLE_CLASS_NAME = "px-2 pb-1 pt-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-400";
const CALENDAR_PRINT_RANGE_OPTION_BUTTON_BASE_CLASS_NAME = "flex h-6 w-full items-center justify-between rounded-md px-1.5 text-xs font-semibold leading-none tracking-tight outline-none ring-0 transition-all duration-150 ease-out active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";
const CALENDAR_PRINT_RANGE_OPTION_ACTIVE_CLASS_NAME = "bg-neutral-100 text-neutral-800";
const CALENDAR_PRINT_RANGE_OPTION_INACTIVE_CLASS_NAME = "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800";
const CALENDAR_PRINT_RANGE_DATE_GROUP_CLASS_NAME = "mt-1 grid grid-cols-2 gap-1 border-t border-neutral-200 pt-1";
const CALENDAR_PRINT_POPOVER_FIELD_CLASS_NAME = "flex flex-col gap-1";
const CALENDAR_PRINT_POPOVER_LABEL_CLASS_NAME = "px-1 text-xs font-semibold leading-none tracking-tight text-neutral-400";
const CALENDAR_PRINT_RANGE_DATE_INPUT_CLASS_NAME = "h-6 w-full rounded-md border border-transparent bg-neutral-50 px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-600 outline-none ring-0 focus:border-neutral-200 focus:bg-white focus:outline-none focus:ring-0 focus-visible:outline-none";
const CALENDAR_PRINT_POPOVER_ACTION_CLASS_NAME = "mt-1 flex h-6 w-full items-center justify-center gap-1 rounded-md border-0 bg-transparent px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-500 outline-none ring-0 transition-all duration-150 ease-out hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-neutral-100 focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100";
const MONTH_EVENT_COUNT_CONTROL_CLASS_NAME = "relative inline-grid h-6 w-max shrink-0 grid-flow-col items-center gap-0 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-semibold leading-none tracking-tight shadow-none";
const MONTH_EVENT_COUNT_LABEL_CLASS_NAME = "relative z-10 flex h-5 min-h-0 items-center justify-center border-r border-neutral-200 px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-500";
const MONTH_EVENT_COUNT_BUTTON_CLASS_NAME = "relative z-10 flex h-5 min-h-0 w-5 min-w-0 shrink-0 items-center justify-center rounded-md p-0 text-neutral-500 outline-none ring-0 transition-all duration-150 ease-out hover:bg-white hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-white focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";
const MONTH_EVENT_COUNT_VALUE_CLASS_NAME = "relative z-10 flex h-5 min-w-5 items-center justify-center px-1 text-center text-xs font-semibold leading-none tracking-tight text-neutral-800 tabular-nums";
const DEFAULT_CALENDAR_PRINT_RANGE: CalendarPrintRangeState = { mode: "current", customStartDate: "", customEndDate: "" };

const clampMonthVisibleEventCount = (value: number): number => Math.min(C.MONTH_VISIBLE_EVENT_COUNT_MAX, Math.max(C.MONTH_VISIBLE_EVENT_COUNT_MIN, Math.round(value)));
const getCalendarPrintRangeOptionButtonClassName = (isActive: boolean): string => cn(CALENDAR_PRINT_RANGE_OPTION_BUTTON_BASE_CLASS_NAME, isActive ? CALENDAR_PRINT_RANGE_OPTION_ACTIVE_CLASS_NAME : CALENDAR_PRINT_RANGE_OPTION_INACTIVE_CLASS_NAME);

const ToolbarActionButton = ({ children, label, title = label, isActive = false, disabled = false, buttonRef, ariaHasPopup, ariaExpanded, onClick }: ToolbarActionButtonProps) => (
  <button
    ref={buttonRef}
    type="button"
    className={cn(TOOLBAR_ACTION_BUTTON_CLASS_NAME, isActive && TOOLBAR_ACTION_BUTTON_ACTIVE_CLASS_NAME)}
    aria-label={label}
    aria-haspopup={ariaHasPopup}
    aria-expanded={ariaExpanded}
    title={title}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
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
  onAddEvent,
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
  const handleChangePrintRangeMode = useCallback((mode: CalendarPrintRangeMode) => {
    handleUpdatePrintRange({ ...resolvedPrintRange, mode });
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
    <div className={cn(SCHEDULE_SCREEN_HEADER_CLASS_NAME, className)} data-calendar-print-toolbar="">
      <h1 className={SCHEDULE_SCREEN_HEADER_TITLE_CLASS_NAME}>
        {titleLabel}
      </h1>
      <div className={SCHEDULE_SCREEN_HEADER_ACTIONS_CLASS_NAME}>
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
            <span className={MONTH_EVENT_COUNT_LABEL_CLASS_NAME}>{t.monthEventCountShortLabel}</span>
            <button type="button" className={MONTH_EVENT_COUNT_BUTTON_CLASS_NAME} aria-label={t.monthEventCountDecreaseLabel} title={t.monthEventCountDecreaseLabel} disabled={!canDecreaseMonthEventCount} onClick={handleDecreaseMonthVisibleEventCount}>
              <Minus className="h-3 w-3" />
            </button>
            <span className={MONTH_EVENT_COUNT_VALUE_CLASS_NAME} aria-live="polite">{monthVisibleEventCount}</span>
            <button type="button" className={MONTH_EVENT_COUNT_BUTTON_CLASS_NAME} aria-label={t.monthEventCountIncreaseLabel} title={t.monthEventCountIncreaseLabel} disabled={!canIncreaseMonthEventCount} onClick={handleIncreaseMonthVisibleEventCount}>
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
        {onAddEvent && (
          <ToolbarActionButton label="予定を追加" onClick={onAddEvent}>
            <Plus className="h-3 w-3" />
            <span className={SCHEDULE_SCREEN_HEADER_LABEL_CLASS_NAME}>追加</span>
          </ToolbarActionButton>
        )}
        <div className={CALENDAR_PRINT_MENU_CLASS_NAME}>
          <ToolbarActionButton buttonRef={printButtonRef} label={t.exportCalendarPdf} isActive={isPrintPopoverOpen} ariaHasPopup="dialog" ariaExpanded={isPrintPopoverOpen} onClick={handleTogglePrintPopover}>
            <Download className="h-3 w-3" />
            <span className={SCHEDULE_SCREEN_HEADER_LABEL_CLASS_NAME}>{t.exportCalendarPdf}</span>
            <ChevronDown className="h-3 w-3" />
          </ToolbarActionButton>
          {isPrintPopoverOpen && (
            <div ref={printPopoverRef} className={CALENDAR_PRINT_POPOVER_CLASS_NAME} role="dialog" aria-label={t.exportCalendarPdf}>
              <div className={CALENDAR_PRINT_POPOVER_TITLE_CLASS_NAME}>{t.printRangeLabel}</div>
              <div role="group" aria-label={t.printRangeLabel}>
                {printRangeOptions.map((option) => {
                  const isActive = resolvedPrintRange.mode === option.value;
                  return (
                    <button key={option.value} type="button" className={getCalendarPrintRangeOptionButtonClassName(isActive)} aria-pressed={isActive} onClick={() => handleChangePrintRangeMode(option.value)}>
                      <span>{option.label}</span>
                      {isActive && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              {resolvedPrintRange.mode === "custom" && (
                <div className={CALENDAR_PRINT_RANGE_DATE_GROUP_CLASS_NAME}>
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
                <Download className="h-3 w-3" />
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
