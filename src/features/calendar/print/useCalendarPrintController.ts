import { useCallback, useState } from "react";

type Options = { onBeforePrint?: () => Promise<void> | void; onPrintError?: (error: unknown) => void };

const PANEL_CLASS = "calendar-print-panel";

export function useCalendarPrintController({ onBeforePrint, onPrintError }: Options = {}) {
  const [isPrintPanelActive, setIsPrintPanelActive] = useState(false);
  const requestPrint = useCallback(() => {
    setIsPrintPanelActive(true);
    Promise