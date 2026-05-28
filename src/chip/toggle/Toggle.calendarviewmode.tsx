import { motion, type Transition } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const CALENDAR_VIEW_MODE_ACTIVE_TEXT_CLASS = "text-[#8c8c8c]";
const CALENDAR_VIEW_MODE_INACTIVE_TEXT_CLASS = "text-[#d5d5d5]";
const CALENDAR_VIEW_MODE_HOVER_TEXT_CLASS = "hover:text-[#8c8c8c]";
const CALENDAR_VIEW_MODE_INDICATOR_CLASS = "absolute inset-0 -z-10 rounded-[8px] border border-[#eeeeee] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
const LIST_PIE_CHART_VIEW_MODES = ["list", "pieChart"] as const satisfies readonly CalendarViewMode[];
const CALENDAR_VIEW_MODE_MOTION_TRANSITION: Transition = {
  type: "tween",
  duration: 0.12,
  ease: "easeOut",
};

const isListPieChartViewMode = (viewMode: CalendarViewMode) => (
  viewMode === "list" || viewMode === "pieChart"
);

const isSelectedViewMode = (
  value: CalendarViewModeSelection,
  optionValue: CalendarViewMode,
) => Array.isArray(value) ? value.includes(optionValue) : value === optionValue;

const hasMultipleSelectedViewModes = (
  value: CalendarViewModeSelection,
) => Array.isArray(value) && value.length > 1;

const resolveOptimisticViewMode = (
  currentValue: CalendarViewModeSelection,
  nextValue: CalendarViewMode,
): CalendarViewModeSelection => {
  if (!isListPieChartViewMode(nextValue)) return nextValue;

  if (Array.isArray(currentValue)) {
    if (currentValue.includes(nextValue)) {
      const remainingSelection = currentValue.filter((viewMode) => viewMode !== nextValue);
      return remainingSelection[0] ?? nextValue;
    }

    return LIST_PIE_CHART_VIEW_MODES;
  }

  if (isListPieChartViewMode(currentValue) && currentValue !== nextValue) {
    return LIST_PIE_CHART_VIEW_MODES;
  }

  return nextValue;
};

const ToggleCalendarViewMode = ({
  value,
  onChange,
  options,
  className,
}: ToggleCalendarViewModeProps) => {
  const changeFrameRef = useRef<number | null>(null);
  const [optimisticValue, setOptimisticValue] = useState<CalendarViewModeSelection>(value);
  const displayedValue = optimisticValue;
  const shouldRenderStaticIndicators = hasMultipleSelectedViewModes(displayedValue);

  const handleChange = useCallback(
    (nextValue: CalendarViewMode) => {
      setOptimisticValue((currentValue) => resolveOptimisticViewMode(currentValue, nextValue));

      if (typeof window === "undefined") {
        onChange(nextValue);
        return;
      }

      if (changeFrameRef.current != null) {
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
      if (changeFrameRef.current != null) {
        window.cancelAnimationFrame(changeFrameRef.current);
      }
    };
  }, []);

  const renderedOptions = useMemo(() => options.map((option) => {
    const isActive = isSelectedViewMode(displayedValue, option.value);

    return (
      <button
        key={option.value}
        type="button"
        aria-pressed={isActive}
        onClick={() => handleChange(option.value)}
        className={cn(
          "relative z-10 flex h-6 min-w-7 items-center justify-center rounded-[8px] px-1.5",
          "appearance-none select-none text-[11px] font-semibold leading-none tracking-[-0.01em]",
          "outline-none ring-0 transition-colors duration-100 ease-out motion-reduce:transition-none",
          "focus:outline-none focus:ring-0 focus-visible:outline-none",
          isActive
            ? CALENDAR_VIEW_MODE_ACTIVE_TEXT_CLASS
            : `${CALENDAR_VIEW_MODE_INACTIVE_TEXT_CLASS} ${CALENDAR_VIEW_MODE_HOVER_TEXT_CLASS}`,
        )}
      >
        {isActive && (
          shouldRenderStaticIndicators ? (
            <span className={CALENDAR_VIEW_MODE_INDICATOR_CLASS} />
          ) : (
            <motion.span
              layoutId={CALENDAR_VIEW_MODE_INDICATOR_ID}
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
      aria-label="表示形式"
      className={cn(
        "relative inline-grid h-7 w-max grid-flow-col items-center gap-1 rounded-[10px] bg-[#f7f7f7] p-0.5",
        className,
      )}
    >
      {renderedOptions}
    </div>
  );
};

export { ToggleCalendarViewMode };
export const ViewModeDropdown = ToggleCalendarViewMode;
