import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@shared/i18n/useT";
import { TodayBar } from "@web-renderer/chip/bar/TodayBar";
import { ChevronDown, Download, Minus, Plus } from "@web-renderer/chip/icons/icons";
import type { ButtonClickPanelSchedulePrintOption } from "@web-renderer/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.SchedulePrint";
import { ButtonClickPanelSchedulePrint } from "@web-renderer/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.SchedulePrint";
import { ViewModeDropdown } from "@web-renderer/chip/toggle/Toggle.calendarviewmode";
import type { PlanResultMode } from "@web-renderer/chip/toggle/Toggle.planresult";
import { TogglePlanResult } from "@web-renderer/chip/toggle/Toggle.planresult";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode, Ref } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { CalendarPrintRangeMode, CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/scheduleScreen.types";



type HeaderScheduleViewOption = {
  value: CalendarViewMode;
  label: string;
};
type HeaderScheduleDesktopProps = {
  titleLabel: string;
  selectedViewMode: CalendarViewModeSelection;
  viewOptions: readonly HeaderScheduleViewOption[];
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
const MONTH_EVENT_COUNT_CONTROL_CLASS_NAME = "relative inline-grid h-6 w-max shrink-0 grid-flow-col items-center gap-0 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 text-xs font-semibold leading-none tracking-tight shadow-none";
const MONTH_EVENT_COUNT_LABEL_CLASS_NAME = "relative z-10 flex h-5 min-h-0 items-center justify-center border-r border-neutral-200 px-1.5 text-xs font-semibold leading-none tracking-tight text-neutral-500";
const MONTH_EVENT_COUNT_BUTTON_CLASS_NAME = "relative z-10 flex h-5 min-h-0 w-5 min-w-0 shrink-0 items-center justify-center rounded-md p-0 text-neutral-500 outline-none ring-0 transition-all duration-150 ease-out hover:bg-white hover:text-neutral-800 active:scale-95 focus:outline-none focus:ring-0 focus-visible:bg-white focus-visible:text-neutral-800 focus-visible:outline-none motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";
const MONTH_EVENT_COUNT_VALUE_CLASS_NAME = "relative z-10 flex h-5 min-w-5 items-center justify-center px-1 text-center text-xs font-semibold leading-none tracking-tight text-neutral-800 tabular-nums";
const DEFAULT_CALENDAR_PRINT_RANGE: CalendarPrintRangeState = { mode: "current", customStartDate: "", customEndDate: "" };



const clampMonthVisibleEventCount = (value: number): number => Math.min(C.MONTH_VISIBLE_EVENT_COUNT_MAX, Math.max(C.MONTH_VISIBLE_EVENT_COUNT_MIN, Math.round(value)));



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
const HeaderScheduleDesktop = ({
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
}: HeaderScheduleDesktopProps) => {
  const t = useT();
  const printButtonRef = useRef<HTMLButtonElement | null>(null);
  const printPopoverRef = useRef<HTMLDivElement | null>(null);
  const [fallbackPrintRange, setFallbackPrintRange] = useState<CalendarPrintRangeState>(DEFAULT_CALENDAR_PRINT_RANGE);
  const [isPrintPopoverOpen, setIsPrintPopoverOpen] = useState(false);
  const resolvedPrintRange = printRange ?? fallbackPrintRange;
  const canDecreaseMonthEventCount = monthVisibleEventCount > C.MONTH_VISIBLE_EVENT_COUNT_MIN;
  const canIncreaseMonthEventCount = monthVisibleEventCount < C.MONTH_VISIBLE_EVENT_COUNT_MAX;
  const printRangeOptions = [
    { value: "current", label: t.printRangeCurrent },
    { value: "day", label: t.printRangeDay },
    { value: "week", label: t.printRangeWeek },
    { value: "month", label: t.printRangeMonth },
    { value: "custom", label: t.printRangeCustom },
  ] satisfies readonly ButtonClickPanelSchedulePrintOption[];
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
  const handleChangeCustomStartDate = useCallback((customStartDate: string) => {
    handleUpdatePrintRange({ ...resolvedPrintRange, customStartDate });
  }, [handleUpdatePrintRange, resolvedPrintRange]);
  const handleChangeCustomEndDate = useCallback((customEndDate: string) => {
    handleUpdatePrintRange({ ...resolvedPrintRange, customEndDate });
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
            <ButtonClickPanelSchedulePrint
              panelRef={printPopoverRef}
              label={t.exportCalendarPdf}
              printRangeLabel={t.printRangeLabel}
              printRangeStartDateLabel={t.printRangeStartDate}
              printRangeEndDateLabel={t.printRangeEndDate}
              printRangeOptions={printRangeOptions}
              printRange={resolvedPrintRange}
              onChangePrintRangeMode={handleChangePrintRangeMode}
              onChangeCustomStartDate={handleChangeCustomStartDate}
              onChangeCustomEndDate={handleChangeCustomEndDate}
              onPrintCalendar={handlePrintCalendar}
            />
          )}
        </div>
      </div>
    </div>
  );
};



export { HeaderScheduleDesktop };
