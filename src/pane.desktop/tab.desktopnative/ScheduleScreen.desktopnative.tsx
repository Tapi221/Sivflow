import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { ScheduleScreen } from "@/pane.desktop/view/Screen.Schedule.desktop";
import { TabsBar } from "./TabsBar";



const ScheduleScreenDesktopNative = (props: ScheduleScreenProps) => {
  return <ScheduleScreen {...props} contentToolbar={<TabsBar variant="titlebar" />} />;
};



export { ScheduleScreenDesktopNative };
