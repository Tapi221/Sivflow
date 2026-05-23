import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CalendarPanelEdge = "trailing" | "top";

type CalendarPanelProps = {
  children: ReactNode;
  edge?: CalendarPanelEdge;
  className?: string;
};

const CALENDAR_PANEL_BASE_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden border border-b-0 border-[#eeeeee] bg-white backdrop-blur-xl shadow-[0_18px_48px_rgba(15,23,42,0.10),0_1px_0_rgba(255,255,255,0.85)_inset]";

const CALENDAR_PANEL_EDGE_CLASS: Record<CalendarPanelEdge, string> = {
  trailing: "rounded-tl-[28px] rounded-tr-none border-r-0",
  top: "rounded-t-[28px]",
};

export const CalendarPanel = ({
  children,
  edge = "trailing",
  className,
}: CalendarPanelProps) => {
  return (
    <div className={cn(CALENDAR_PANEL_BASE_CLASS, CALENDAR_PANEL_EDGE_CLASS[edge], className)}>
      {children}
    </div>
  );
};
