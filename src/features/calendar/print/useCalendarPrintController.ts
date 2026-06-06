import { useCallback } from "react";

export function useCalendarPrintController() {
  const requestPrint = useCallback(() => window.print(), []);
  return { isPrintPanelActive: false, printPanelClassName: "calendar-print-panel", requestPrint };
}
