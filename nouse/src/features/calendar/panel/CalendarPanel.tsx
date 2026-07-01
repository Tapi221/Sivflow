import { forwardRef } from "react";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode } from "react";



type CalendarPanelProps = {
  children: ReactNode;
  hasTrailingPanel?: boolean;
  className?: string;
};
type CalendarPanelViewportProps = {
  children: ReactNode;
  hasTrailingPanel?: boolean;
  className?: string;
};



const CALENDAR_PANEL_VIEWPORT_BASE_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col bg-white";
const CALENDAR_PANEL_VIEWPORT_STANDALONE_CLASS = "pl-4 pr-0 pt-0 pb-0";
const CALENDAR_PANEL_VIEWPORT_WITH_TRAILING_PANEL_CLASS = "px-4 pt-0 pb-0";
const CALENDAR_PANEL_BASE_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-slate-200 bg-white backdrop-blur-xl shadow-[0_18px_48px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.85)_inset]";
const CALENDAR_PANEL_STANDALONE_CLASS =
  "rounded-tl-[28px] rounded-tr-none border-r-0";
const CALENDAR_PANEL_WITH_TRAILING_PANEL_CLASS = "rounded-t-[28px]";



const CalendarPanelViewport = forwardRef<HTMLDivElement, CalendarPanelViewportProps>(({ children, hasTrailingPanel = false, className }, ref) => {
  return (<div ref={ref} className={cn(CALENDAR_PANEL_VIEWPORT_BASE_CLASS, hasTrailingPanel ? CALENDAR_PANEL_VIEWPORT_WITH_TRAILING_PANEL_CLASS : CALENDAR_PANEL_VIEWPORT_STANDALONE_CLASS, className)} > {children} </div>);
},
);
const CalendarPanel = ({ children, hasTrailingPanel = false, className }: CalendarPanelProps) => {
  return (<div className={cn(CALENDAR_PANEL_BASE_CLASS, hasTrailingPanel ? CALENDAR_PANEL_WITH_TRAILING_PANEL_CLASS : CALENDAR_PANEL_STANDALONE_CLASS, className)} > {children} </div>);
};



CalendarPanelViewport.displayName = "CalendarPanelViewport";

export { CalendarPanelViewport, CalendarPanel };
