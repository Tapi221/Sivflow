import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { TabsBar } from "./TabsBar";
import { ScheduleScreen } from "@/pane.desktop/view/ScheduleScreen.desktop";



const ScheduleScreenDesktopNative = (props: ScheduleScreenProps) => {
  return <ScheduleScreen {...props} contentToolbar={<TabsBar variant="titlebar" />} />;
};



export { ScheduleScreenDesktopNative };
