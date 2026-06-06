import { useCallback, useState } from "react";

type CalendarPrintControllerOptions = {
  onBeforePrint?: () => Promise<void> | void;
  onPrintError?: (error: unknown) => void;
};

type CalendarPrintSnapshot = {
  printRoot: HTMLDivElement;
};

const CALENDAR_PRINT_PANEL_CLASS_NAME = "calendar-print-panel";
const CALENDAR_PRINT_ROOT_CLASS_NAME = "calendar-print-root";
const CALENDAR_PRINTING_BODY_CLASS_NAME = "calendar-printing";
const CALENDAR_PRINT_LAYOUT_FRAME_COUNT = 2;

const waitForCalendar