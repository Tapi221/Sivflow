import { useCallback, useState } from "react";

type Options = { onBeforePrint?: () => void; onPrintError?: (error: unknown) => void };

const PANEL_CLASS = "calendar-print-panel";

export function useCalendarPrintController(_options: Options = {}) {
  const [isPrintPanelActive] = useState(false);
  const requestPrint = useCallback(() => window.print(), []);
  return { isPrintPanelActive, printPanelClassName: PANEL