import { useCallback, useLayoutEffect, useState } from "react";

type Options = { onBeforePrint?: () => Promise<void> | void; onPrintError?: (error: unknown) => void };

const BODY_CLASS = "calendar-printing";
const PANEL_CLASS = "calendar-print-panel";

export function useCalendarPrintController({ onBeforePrint, onPrintError }: Options = {}) {
  const [isPrintPanelActive, setIsPrintPanelActive] = useState(false);
  useLayoutEffect(() => {
    document