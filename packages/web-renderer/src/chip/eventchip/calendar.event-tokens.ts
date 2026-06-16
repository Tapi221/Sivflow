import { SCHEDULE_EVENT_COLOR } from "@shared/design-tokens/color/Color.Schedule";



type CalendarEventVariant = | "purple" | "teal" | "pink" | "amber" | "blue" | "green" | "red" | "gray" | "coral" | "sky";
type CalendarEventToken = {
  bg: string;
  border: string;
  text: string;
};



const CALENDAR_EVENT_TOKENS = { purple: { bg: "#EEEDFE", border: "#534AB7", text: "#3C3489" }, teal: { bg: "#E1F5EE", border: "#0F6E56", text: "#085041" }, pink: { bg: "#FBEAF0", border: "#993556", text: "#72243E" }, amber: { bg: "#FAEEDA", border: "#854F0B", text: "#633806" }, blue: { bg: "#E6F1FB", border: SCHEDULE_EVENT_COLOR.fallbackAccent, text: "#0C447C" }, green: { bg: "#EAF3DE", border: "#3B6D11", text: "#27500A" }, red: { bg: "#FCEBEB", border: "#A32D2D", text: "#791F1F" }, gray: { bg: "#F1EFE8", border: "#5F5E5A", text: "#444441" }, coral: { bg: "#FAECE7", border: "#993C1D", text: "#712B13" }, sky: { bg: "#E1F4FA", border: SCHEDULE_EVENT_COLOR.fallbackAccent, text: "#0C4A6E" } } as const satisfies Record<CalendarEventVariant, CalendarEventToken>;



export { CALENDAR_EVENT_TOKENS };


export type { CalendarEventToken, CalendarEventVariant };
