import { useEffect, useMemo } from "react";

import { useSetBreadcrumbAction } from "@/contexts/BreadcrumbContext";
import { CalendarWorkspaceToolbar } from "@/features/calendar/ui/ExplorerCalendarPane";

const Tasks = () => {
  const setBreadcrumbAction = useSetBreadcrumbAction();
  const breadcrumbToolbar = useMemo(
    () => (
      <CalendarWorkspaceToolbar
        activeMode="calendar"
        onSelectCalendar={() => undefined}
        onSelectTimeline={() => undefined}
      />
    ),
    [],
  );

  useEffect(() => {
    setBreadcrumbAction(breadcrumbToolbar);
    return () => setBreadcrumbAction(null);
  }, [breadcrumbToolbar, setBreadcrumbAction]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white text-[#25272d]">
      <div className="px-5 py-6 text-[13px] font-medium leading-[17px] text-[#8f929c]">
        タスク
      </div>
    </div>
  );
};

export default Tasks;
