import { createElement as h, memo } from "react";

const CalendarEventChipMonth = memo(({ event }: any) => h("div", { className: "calendar-event-chip-month flex w-full min-w-0 items-center", "data-calendar-event-chip": "month" }, event.title));

export { CalendarEventChipMonth };
