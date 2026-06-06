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

const CALENDAR_PRINTING_CLASS