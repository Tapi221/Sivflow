import type { RefObject, UIEvent } from "react";

import { GridTaskDayDesktop } from "../grid/Grid.task.day.desktop";

type CalendarTaskViewProps = {
  anchorDate: Date;
  selectedDate: Date;
  dayColumnWidth: number;
  rowCount?: number;
  buffer?: {
    before: number;
    after: number;
  };
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  onSelectDate?: (date: Date) => void;
};

export const CalendarTaskView = (props: CalendarTaskViewProps) => {
  return <GridTaskDayDesktop {...props} />;
};