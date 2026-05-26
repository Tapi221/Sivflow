import type { KeyboardEvent, PointerEvent } from "react";
import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import { HoverTooltip } from "@/components/toolchip/HoverTooltip";

export type MonthRowResizeBarProps = {
  monthRowHeight: number;
  onResizeReset: () => void;
  onResizeKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onResizePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
};

export const MonthRowResizeBar = ({
  monthRowHeight,
  onResizeReset,
  onResizeKeyDown,
  onResizePointerDown,
}: MonthRowResizeBarProps) => {
  return (
    <div className="calendar-month-row-boundary-resize-handle">
      <HoverTooltip
        label={T.MONTH_ROW_RESIZE_TITLE}
        side="top"
        offset={8}
        size="compact"
        className="calendar-month-row-boundary-resize-knob-anchor !absolute"
      >
        <div
          role="separator"
          aria-label={T.MONTH_ROW_RESIZE_ARIA_LABEL}
          aria-orientation="horizontal"
          aria-valuemin={C.MIN_MONTH_ROW_HEIGHT}
          aria-valuemax={C.MAX_MONTH_ROW_HEIGHT}
          aria-valuenow={Number(monthRowHeight)}
          tabIndex={0}
          className="calendar-month-row-boundary-resize-knob h-full w-full rounded-full"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={onResizeReset}
          onKeyDown={onResizeKeyDown}
          onPointerDown={onResizePointerDown}
        />
      </HoverTooltip>
    </div>
  );
};
