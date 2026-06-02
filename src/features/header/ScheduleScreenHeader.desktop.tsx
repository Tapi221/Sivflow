import type { ChangeEvent, CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { TogglePlanResult, type PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import type { CalendarPrintRangeMode, CalendarPrintRangeState } from "@/features/calendar/print/calendarPrint.types";
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
  printRange?: CalendarPrintRangeState;
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
  onChangePlanResultModes: (value: PlanResultMode[]) => void;
  onChangePrintRange?: (value: CalendarPrintRangeState) => void;
  onBeforePrint?: () => Promise<void> | void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

type CalendarPrintRangeOption = {
  value: CalendarPrintRangeMode;
  label: string;
};

type CalendarPrintPopoverPosition = {
  top: number;
  right: number;
};

const CALENDAR_PRINTING_CLASS = "calendar-printing";
const CALENDAR_PRINT_PANEL_CLASS = "calendar-print-panel";
const CALENDAR_PRINT_CLEANUP_DELAY_MS = 30_000;
const CALENDAR_PRINT_POPOVER_OFFSET_PX = 8;
const CALENDAR_PRINT_POPOVER_MIN_SIDE_MARGIN_PX = 16;
const CALENDAR_PRINT_BUTTON_CLASS_NAME = "relative z-10 flex h-7 min-h-0 min-w-[84px] shrink-0 items-center justify-center gap-1 rounded-[9px] border border-[#eeeeee] bg-white px-2.5 text-[11px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)] outline-none ring-0 transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:text-[#6f6f6f] hover:shadow-[0_1px_4px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60";
const CALENDAR_PRINT_POPOVER_CLASS_NAME = "fixed z-[9999] w-[260px] rounded-[14px] border border-[#eeeeee] bg-white p-3 text-[#1c1c1e] shadow-[0_12px_32px_rgba(15,23,42,0.14)]";
const CALENDAR_PRINT_POPOVER_FIELD_CLASS_NAME = "flex flex-col gap-1.5";
const CALENDAR_PRINT_POPOVER_LABEL_CLASS_NAME = "text-[10px] font-semibold leading-none tracking-[-0.01em] text-[#8c8c8c]";
const CALENDAR_PRINT_RANGE_SELECT_CLASS_NAME = "h-9 w-full rounded-[10px] border border-[#eeeeee] bg-white px-3 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#4b5563] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none";
const CALENDAR_PRINT_RANGE_DATE_INPUT_CLASS_NAME = "h-9 w-full rounded-[10px] border border-[#eeeeee] bg-white px-3 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#4b5563] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none";
const CALENDAR_PRINT_POPOVER_ACTION_CLASS_NAME = "mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-[10px] bg-[#1d4ed8] px-3 text-[12px] font-semibold tracking-[-0.01em] text-white outline-none ring-0 transition-colors duration-200 hover:bg-[#1e40af] focus:outline-none focus:ring-0 focus-visible:outline-none";
const DEFAULT_CALENDAR_PRINT_RANGE: CalendarPrintRangeState = { mode: "current", customStartDate: "", customEndDate: "" };

const getCalendarPrintPanel = (source: HTMLElement | null): HTMLElement | null => {
  const toolbar = source?.closest<HTMLElement>("[data-calendar-print-toolbar]");

  return toolbar?.parentElement ?? null;
};

const getCalendarPrintPopoverPosition = (button: HTMLElement | null): CalendarPrintPopoverPosition | null => {
  if (typeof window === "undefined" || !button) return null;

  const rect = button.getBoundingClientRect();

  return {
    top: rect.bottom + CALENDAR_PRINT_POPOVER_OFFSET_PX,
    right: Math.max(CALENDAR_PRINT_POPOVER_MIN_SIDE_MARGIN_PX, window.innerWidth - rect.right),
  };
};

const printCalendarPanel = async (source: HTMLElement | null, onBeforePrint?: () => Promise<void> | void) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  await onBeforePrint?.();

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
  printRange,
  onSelectViewMode,
  onChangePlanResultModes,
  onChangePrintRange,
  onBeforePrint,
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
  const [printPopoverPosition, setPrintPopoverPosition] = useState<CalendarPrintPopoverPosition | null>(null);
  const resolvedPrintRange = printRange ?? fallbackPrintRange;
  const printPopoverStyle: CSSProperties | undefined = printPopoverPosition ? { top: printPopoverPosition.top, right: printPopoverPosition.right } : undefined;
  const printRangeOptions: readonly CalendarPrintRangeOption[] = [
    { value: "current", label: t.printRangeCurrent },
    { value: "day", label: t.printRangeDay },
    { value: "week", label: t.printRangeWeek },
    { value: "month", label: t.printRangeMonth },
    { value: "custom", label: t.printRangeCustom },
  ];
  const updatePrintPopoverPosition = useCallback(() => {
    setPrintPopoverPosition(getCalendarPrintPopoverPosition(printButtonRef.current));
  }, []);
  const handlePrintCalendar = useCallback(() => {
    setIsPrintPopoverOpen(false);
    void printCalendarPanel(printButtonRef.current, onBeforePrint);
  }, [onBeforePrint]);
  const handleTogglePrintPopover = useCallback(() => {
    setIsPrintPopoverOpen((value) => {
      const nextValue = !value;

      if (nextValue) setPrintPopoverPosition(getCalendarPrintPopoverPosition(printButtonRef.current));

      return nextValue;
    });
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

  useEffect(() => {
    if (!isPrintPopoverOpen || typeof document === "undefined" || typeof window === "undefined") return undefined;

    updatePrintPopoverPosition();

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
    window.addEventListener("resize", updatePrintPopoverPosition);
    window.addEventListener("scroll", updatePrintPopoverPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePrintPopoverPosition);
      window.removeEventListener("scroll", updatePrintPopoverPosition, true);
    };
  }, [isPrintPopoverOpen, updatePrintPopoverPosition]);

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
          aria-haspopup="dialog"
          aria-expanded={isPrintPopoverOpen}
          title={t.exportCalendarPdf}
          onClick={handleTogglePrintPopover}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="min-w-0 truncate whitespace-nowrap">PDF</span>
          <span className="text-[10px] leading-none text-[#9ca3af]">⌄</span>
        </button>

        {isPrintPopoverOpen && typeof document !== "undefined" && createPortal(
          <div ref={printPopoverRef} className={CALENDAR_PRINT_POPOVER_CLASS_NAME} style={printPopoverStyle} role="dialog" aria-label={t.exportCalendarPdf}>
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
              <div className="mt-3 grid grid-cols-2 gap-2">
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
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
};

export { ScheduleScreenHeaderDesktop };
