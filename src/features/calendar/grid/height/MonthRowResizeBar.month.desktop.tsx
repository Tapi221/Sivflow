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
    <HoverTooltip
      label={T.MONTH_ROW_RESIZE_TITLE}
      side="top"
      offset={8}
      size="compact"
      className="calendar-month-row-boundary-resize-handle !absolute"
    >
      <div
        role="separator"
        aria-label={T.MONTH_ROW_RESIZE_ARIA_LABEL}
        aria-orientation="horizontal"
        aria-valuemin={C.MIN_MONTH_ROW_HEIGHT}
        aria-valuemax={C.MAX_MONTH_ROW_HEIGHT}
        aria-valuenow={Number(monthRowHeight)}
        tabIndex={0}
        className="h-full w-full"
        onClick={(event) =>
          event.stopPropagation()
        }
        onDoubleClick={onResizeReset}
        onKeyDown={onResizeKeyDown}
        onPointerDown={onResizePointerDown}
      />
    </HoverTooltip>
  );
};
