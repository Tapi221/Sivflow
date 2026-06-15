import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { TabsBar } from "@/pane.desktop/tab.desktopnative/TabsBar";
import { ScheduleScreen } from "@/pane.desktop/view/Screen.Schedule.desktop";

const ScheduleScreenDesktopNative = (props: ScheduleScreenProps) => {
  return <ScheduleScreen {...props} contentToolbar={<TabsBar variant="titlebar" />} />;
};

export { ScheduleScreenDesktopNative };
