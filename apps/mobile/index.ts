import { registerRootComponent } from "expo";
import App from "@mobile-renderer/App";
import { IosCalendarScheduleYear } from "@mobile/integration/ioscalendar/IosCalendarScheduleYear";

const MobileApp = () => <App ScheduleYearComponent={IosCalendarScheduleYear} />;

registerRootComponent(MobileApp);