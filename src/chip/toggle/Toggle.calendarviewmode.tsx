import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@shared/i18n/useT";
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

const CALENDAR_VIEW_MODE_ACTIVE_TEXT_CLASS = "text-[#2f343b]";
const CALENDAR_VIEW_MODE_INACTIVE_TEXT_CLASS = "text-[#c7c7c7]";
const CALENDAR_VIEW_MODE_HOVER_TEXT_CLASS = "hover:bg-transparent hover:text-[#2f343b]";
const CALENDAR_VIEW_MODE_DISABLED_TEXT_CLASS = "cursor-not-allowed text-[#d6d6d6]";
const CALENDAR_VIEW_MODE_BUTTON_CLASS_NAME = "relative isolate z-10 flex h-7 min-h-0 min-w-6 items-center justify-center rounded-none px-1 appearance-none select-none text-sm font-semibold leading-none tracking-tight outline-none ring-0 transition-[color,transform] duration-150 ease-out motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.97] focus:outline-none focus:ring-0 focus-visible:bg-transparent focus-visible:text-[#2f343b] focus-visible:outline-none";
const MULTI_SELECT_VIEW_MODES = ["days", "timetable", "list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const MULTI_SELECT_VIEW_MODE_SET = new Set<CalendarViewMode>(MULTI_SELECT_VIEW_MODES);
const STATIC_TIMETABLE_VIEW_MODE = "timetable" satisfies CalendarViewMode;

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
          CALENDAR_VIEW_MODE_BUTTON_CLASS_NAME,
          isDisabled
            ? CALENDAR_VIEW_MODE_DISABLED_TEXT_CLASS
            : isActive
              ? CALENDAR_VIEW_MODE_ACTIVE_TEXT_CLASS
              : `${CALENDAR_VIEW_MODE_INACTIVE_TEXT_CLASS} ${CALENDAR_VIEW_MODE_HOVER_TEXT_CLASS}`,
        )}
      >
        <span className="relative z-10">{option.label}</span>
      </button>
    );
  }), [displayedValue, handleChange, options]);
  return (
    <div
      role="group"
      aria-label="表示形式"
      className={cn(
        "relative inline-grid h-7 w-max grid-flow-col items-center gap-2.5 rounded-none bg-transparent p-0",
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
            CALENDAR_VIEW_MODE_BUTTON_CLASS_NAME,
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
