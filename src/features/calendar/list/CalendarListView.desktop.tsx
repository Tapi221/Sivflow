import { memo } from "react";

type CalendarListViewProps = {
  className?: string;
};

const CalendarListViewComponent = ({ className }: CalendarListViewProps) => {
  return <div className={className} />;
};

const CalendarListView = memo(CalendarListViewComponent);

CalendarListView.displayName = "CalendarListView";

export { CalendarListView };
