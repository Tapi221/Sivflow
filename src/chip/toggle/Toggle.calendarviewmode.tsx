import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@shared/i18n/useT";
import type { Transition } from "framer-motion";
import { motion } from "framer-motion";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/calendar.types";
import { cn } from "@/lib/utils";

type CalendarViewModeOption = {
  value: CalendarViewMode;
  label: string;
};
type ToggleCalendarViewModeProps = {
  value: CalendarViewModeSelection;
  onChange: (value: CalendarViewMode) => void;
  options: readonly CalendarViewModeOption[];
  className?: string;
};

const CALENDAR_VIEW_MODE_INDICATOR_ID = "calendar-view-mode-indicator";
const CALENDAR_VIEW_MODE_ACTIVE_TEXT_CLASS = "text-[#242426]";
const CALENDAR_VIEW_MODE_INACTIVE_TEXT_CLASS = "text-[#777579]";
const CALENDAR_VIEW_MODE_HOVER_TEXT_CLASS = "hover:text-[#242426]";
const CALENDAR_VIEW_MODE_DISABLED_TEXT_CLASS = "cursor-not-allowed text-[#b8b4ae]";
const CALENDAR_VIEW_MODE_INDICATOR_CLASS = "pointer-events-none absolute inset-0 z-0 rounded-[13px] bg-white shadow-none ring-1 ring-black/[0.04]";
const MULTI_SELECT_VIEW_MODES = ["days", "timetable", "list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const MULTI_SELECT_VIEW_MODE_SET = new Set<CalendarViewMode>(MULTI_SELECT_VIEW_MODES);
const STATIC_TIMETABLE_VIEW_MODE = "timetable" satisfies CalendarViewMode;
const CALENDAR_VIEW_MODE_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.12,
  ease: "easeOut",
};

const isViewModeSelectionArray = (value: CalendarViewModeSelection): value is readonly CalendarViewMode[] => Array.isArray(value);
const isMultiSelectViewMode = (viewMode: CalendarViewMode): boolean => MULTI_SELECT_VIEW_MODE_SET.has(viewMode);
const sortMultiSelectViewModes = (viewModes: readonly CalendarViewMode[]): CalendarViewMode[] => MULTI_SELECT_VIEW_MODES.filter((viewMode) => viewModes.includes(viewMode));
const resolveOptimisticViewMode = (
  currentValue: CalendarViewModeSelection,
  nextValue: CalendarViewMode,
): CalendarViewModeSelection => {
  if (!isMultiSelectViewMode(nextValue)) return nextValue;
  if (isViewModeSelectionArray(currentValue)) {
    if (currentValue.includes(nextValue)) {
      const remainingSelection = currentValue.filter((viewMode) => viewMode !== nextValue);
      return remainingSelection[0] ?? nextValue;
    }
    return sortMultiSelectViewModes([...currentValue.filter(isMultiSelectViewMode), nextValue].slice(-2));
  }
  if (isMultiSelectViewMode(currentValue) && currentValue !== nextValue) {
    return sortMultiSelectViewModes([currentValue, nextValue]);
  }
  return nextValue;
};
const isSelectedViewMode = (
  value: CalendarViewModeSelection,
  optionValue: CalendarViewMode,
) => isViewModeSelectionArray(value) ? value.includes(optionValue) : value === optionValue;
const hasMultipleSelectedViewModes = (
  value: CalendarViewModeSelection,
) => isViewModeSelectionArray(value) && value.length > 1;
const isDisabledViewModeOption = (
  value: CalendarViewModeSelection,
  optionValue: CalendarViewMode,
) => hasMultipleSelectedViewModes(value) && !isSelectedViewMode(value, optionValue);

const ToggleCalendarViewMode = ({
  value,
  onChange,
  options,
  className,
}: ToggleCalendarViewModeProps) => {
  const t = useT();
  const changeFrameRef = useRef<number | null>(null);
  const [optimisticValue, setOptimisticValue] = useState<CalendarViewModeSelection>(value);
  const displayedValue = optimisticValue;
  const shouldRenderStaticIndicators = hasMultipleSelectedViewModes(displayedValue);
  const shouldRenderStaticTimetableOption = options.every((option) => option.value !== STATIC_TIMETABLE_VIEW_MODE);
  const handleChange = useCallback(
    (nextValue: CalendarViewMode) => {
      setOptimisticValue((currentValue) => resolveOptimisticViewMode(currentValue, nextValue));
      if (typeof window === "undefined") {
        onChange(nextValue);
        return;
      }
      if (changeFrameRef.current !== null && changeFrameRef.current !== undefined) {
        window.cancelAnimationFrame(changeFrameRef.current);
      }
      changeFrameRef.current = window.requestAnimationFrame(() => {
        changeFrameRef.current = null;
        onChange(nextValue);
      });
    },
    [onChange],
  );
  useEffect(() => {
    setOptimisticValue(value);
  }, [value]);
  useEffect(() => {
    return () => {
      if (changeFrameRef.current !== null && changeFrameRef.current !== undefined) {
        window.cancelAnimationFrame(changeFrameRef.current);
      }
    };
  }, []);
  const renderedOptions = useMemo(() => options.map((option) => {
    const isActive = isSelectedViewMode(displayedValue, option.value);
    const isDisabled = isDisabledViewModeOption(displayedValue, option.value);
    return (
      <button
        key={option.value}
        type="button"
        aria-pressed={isActive}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        onClick={() => handleChange(option.value)}
        className={cn(
          "relative isolate z-10 flex h-7 min-h-0 min-w-7 items-center justify-center rounded-[13px] px-[9px]",
          "appearance-none select-none text-[13px] font-semibold leading-none tracking-tight",
          "outline-none ring-0 transition-[color,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:active:scale-100",
          "active:scale-[0.98] focus:outline-none focus:ring-0 focus-visible:text-[#242426] focus-visible:outline-none",
          isDisabled
            ? CALENDAR_VIEW_MODE_DISABLED_TEXT_CLASS
            : isActive
              ? CALENDAR_VIEW_MODE_ACTIVE_TEXT_CLASS
              : `${CALENDAR_VIEW_MODE_INACTIVE_TEXT_CLASS} ${CALENDAR_VIEW_MODE_HOVER_TEXT_CLASS}`,
        )}
      >
        {isActive && (
          shouldRenderStaticIndicators ? (
            <span aria-hidden="true" className={CALENDAR_VIEW_MODE_INDICATOR_CLASS} />
          ) : (
            <motion.span
              layoutId={CALENDAR_VIEW_MODE_INDICATOR_ID}
              aria-hidden="true"
              initial={false}
              className={CALENDAR_VIEW_MODE_INDICATOR_CLASS}
              transition={CALENDAR_VIEW_MODE_MOTION_TRANSITION}
            />
          )
        )}
        <span className="relative z-10">{option.label}</span>
      </button>
    );
  }), [displayedValue, handleChange, options, shouldRenderStaticIndicators]);
  return (
    <div
      role="group"
      aria-label={t.viewsLabel}
      className={cn(
        "relative inline-grid h-[34px] w-max grid-flow-col items-center gap-0 rounded-[17px] bg-[#f2f2f3] p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        className,
      )}
    >
      {renderedOptions}
      {shouldRenderStaticTimetableOption && (
        <button
          type="button"
          aria-disabled={true}
          tabIndex={-1}
          className={cn(
            "relative isolate z-10 flex h-7 min-h-0 min-w-7 cursor-default items-center justify-center rounded-[13px] px-[9px]",
            "appearance-none select-none text-[13px] font-semibold leading-none tracking-tight",
            "outline-none ring-0",
            CALENDAR_VIEW_MODE_DISABLED_TEXT_CLASS,
          )}
        >
          <span className="relative z-10">{t.viewTimetable}</span>
        </button>
      )}
    </div>
  );
};

const ViewModeDropdown = ToggleCalendarViewMode;

export { ToggleCalendarViewMode, ViewModeDropdown };
