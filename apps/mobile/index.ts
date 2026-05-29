import React from "react";
import { registerRootComponent } from "expo";
import App from "@mobile-renderer/App";
import { IosCalendarScheduleYear } from "@mobile/integration/ioscalendar/IosCalendarScheduleYear";

const MobileApp = () => React.createElement(App, { ScheduleYearComponent: IosCalendarScheduleYear });

registerRootComponent(MobileApp);