import { memo, useCallback } from "react";
import { useIosCalendarIntegration } from "./useIosCalendarIntegration";
import { ScheduleYear } from "../../pane/schedule/ScheduleYear";
import type { ScheduleYearProps } from "../../pane/schedule/ScheduleYear";

type IosCalendarScheduleYearProps = Omit<ScheduleYearProps, "visibleEvents" | "onRenderedRangeChange">;

const IosCalendarScheduleYearComponent = (props: IosCalendarScheduleYearProps) => {
  const { events, syncRange } = useIosCalendarIntegration();

  const handleRenderedRangeChange = useCallback((range: { start: Date; end: Date }) => {
    syncRange({
      rangeEnd: range.end,
      rangeStart: range.start,
    });
  }, [syncRange]);

  return <ScheduleYear {...props} visibleEvents={events} onRenderedRangeChange={handleRenderedRangeChange} />;
};

const IosCalendarScheduleYear = memo(IosCalendarScheduleYearComponent);

IosCalendarScheduleYear.displayName = "IosCalendarScheduleYear";

export { IosCalendarScheduleYear };
export type { IosCalendarScheduleYearProps };
