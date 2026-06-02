import { useCallback, useLayoutEffect, useState, useRef } from "react";

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
const CALENDAR_PRINT_CLEANUP_DELAY_MS = 30_000;

const useCalendarPrintController = ({ onBeforePrint, onPrintError }: UseCalendarPrintControllerOptions = {}): UseCalendarPrintControllerReturn => {
  const printCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPrintPanelActive, setIsPrintPanelActive] = useState(false);
  const [printRequestToken, setPrintRequestToken] = useState(0);
  const clearPrintCleanupTimer = useCallback(() => {
    if (printCleanupTimerRef.current === null) return;

    window.clearTimeout(printCleanupTimerRef.current);
    printCleanupTimerRef.current = null;
  }, []);
  const requestPrint = useCallback(() => {
    void (async () => {
      try {
        await onBeforePrint?.();
      } catch (error) {
        onPrintError?.(error);
      }

      setPrintRequestToken((value) => value + 1);
      setIsPrintPanelActive(true);
    })();
  }, [onBeforePrint, onPrintError]);

  useLayoutEffect(() => {
    if (!isPrintPanelActive || typeof window === "undefined" || typeof document === "undefined") return undefined;

    const cleanup = () => {
      clearPrintCleanupTimer();
      document.body.classList.remove(CALENDAR_PRINTING_CLASS);
      window.removeEventListener("afterprint", cleanup);
      setIsPrintPanelActive(false);
    };

    document.body.classList.add(CALENDAR_PRINTING_CLASS);
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    printCleanupTimerRef.current = window.setTimeout(cleanup, CALENDAR_PRINT_CLEANUP_DELAY_MS);

    return () => {
      clearPrintCleanupTimer();
      document.body.classList.remove(CALENDAR_PRINTING_CLASS);
      window.removeEventListener("afterprint", cleanup);
    };
  }, [clearPrintCleanupTimer, isPrintPanelActive, printRequestToken]);

  return {
    isPrintPanelActive,
    printPanelClassName: isPrintPanelActive ? CALENDAR_PRINT_PANEL_CLASS : null,
    requestPrint,
  };
};

export { useCalendarPrintController };
