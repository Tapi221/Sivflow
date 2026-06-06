import { useCallback, useLayoutEffect, useState } from "react";

type UseCalendarPrintControllerOptions = {
  onBeforePrint?: () => Promise<void> | void;
  onPrintError?: (error: unknown) => void;
};

type UseCalendarPrintControllerReturn = {
  isPrintPanelActive: boolean;
  printPanelClassName: string | null;
  requestPrint: () => void;
};

const CALENDAR_PRINTING_CLASS = "calendar-printing";
const CALENDAR_PRINT_PANEL_CLASS = "calendar-print-panel";

export function useCalendarPrintController