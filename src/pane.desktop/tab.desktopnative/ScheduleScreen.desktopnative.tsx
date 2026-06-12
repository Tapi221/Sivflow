import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { ScheduleScreen } from "@/pane.desktop/view/ScheduleScreen.desktop";
import { TabsBar } from "@/pane.desktop/tab.desktopnative/TabsBar";

const ScheduleScreenDesktopNative = (props: ScheduleScreenProps) => {
  return <ScheduleScreen {...props} contentToolbar={<TabsBar variant="titlebar" />} />;
};

export { ScheduleScreenDesktopNative };
