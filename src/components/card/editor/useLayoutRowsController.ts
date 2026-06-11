import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CARD_HEIGHT_PHASE_PX, CARD_ROW_PX, cardHeightPxToLayoutRows, layoutRowsToCardHeightPx, minCardHeightPxToLayoutRows } from "@/domain/card/cardGeometry.constants";
import { normalizeLayoutRows } from "@/domain/card/extraRows";



type Side = "question" | "answer";
type UseLayoutRowsControllerParams<
  TDraft extends { layoutRows: number; } | null,
> = {
  draft: TDraft;
  setDraft: Dispatch<SetStateAction<TDraft>>;
  defaultLayoutRows: number;
  normalizedSelectedCardId: string | null;
  isEditing: boolean;
};



const useLayoutRowsController = <TDraft extends { layoutRows: number; } | null>({ draft, setDraft, defaultLayoutRows, normalizedSelectedCardId, isEditing }: UseLayoutRowsControllerParams<TDraft>) => {
  const rowsRafRef = useRef<number | null>(null);
  const pendingRowsRef = useRef<number | null>(null);
  const layoutRowsRef = useRef<number>(defaultLayoutRows);
  const allowAutoMinHeightSyncRef = useRef(false);
  const manualResizeInProgressRef = useRef(false);
  const minHeightPxBySideRef = useRef<Record<Side, number>>({
    question: layoutRowsToCardHeightPx(defaultLayoutRows),
    answer: layoutRowsToCardHeightPx(defaultLayoutRows),
  });

  const rowsFromMinHeightPx = useCallback((minHeightPx: number): number => {
    const safeHeight = Number.isFinite(minHeightPx) ? minHeightPx : 0;
    return normalizeLayoutRows(
      minCardHeightPxToLayoutRows(Math.max(0, safeHeight)),
    );
  }, []);

  const getRequiredMinRows = useCallback((): number => {
    const requiredHeightPx = Math.max(
      minHeightPxBySideRef.current.question,
      minHeightPxBySideRef.current.answer,
    );
    return rowsFromMinHeightPx(requiredHeightPx);
  }, [rowsFromMinHeightPx]);

  const setLayoutRows = useCallback(
    (nextRows: number) => {
      const safeRows = normalizeLayoutRows(nextRows);
      setDraft((prev) => (prev ? { ...prev, layoutRows: safeRows } : prev));
    },
    [setDraft],
  );

  const scheduleLayoutRowsFromHeight = useCallback(
    (nextHeightPx: number) => {
      const currentRows = layoutRowsRef.current;
      const currentHeightPx = layoutRowsToCardHeightPx(currentRows);
      const rawRows = (nextHeightPx - CARD_HEIGHT_PHASE_PX) / CARD_ROW_PX;
      const requestedRows = normalizeLayoutRows(
        nextHeightPx < currentHeightPx
          ? Math.floor(rawRows)
          : cardHeightPxToLayoutRows(nextHeightPx),
      );
      const nextRows = Math.max(requestedRows, getRequiredMinRows());
      pendingRowsRef.current = nextRows;

      if ((rowsRafRef.current !== null && rowsRafRef.current !== undefined)) return;
      rowsRafRef.current = window.requestAnimationFrame(() => {
        rowsRafRef.current = null;
        const pending = pendingRowsRef.current;
        pendingRowsRef.current = null;
        if ((pending === null || pending === undefined)) return;
        setLayoutRows(pending);
      });
    },
    [getRequiredMinRows, setLayoutRows],
  );

  const setManualResizeInProgress = useCallback((next: boolean) => {
    manualResizeInProgressRef.current = next;
  }, []);

  const handleSideMinHeightChange = useCallback(
    (side: Side, minHeightPx: number) => {
      minHeightPxBySideRef.current[side] = Math.max(0, minHeightPx);
      if (manualResizeInProgressRef.current) return;
      if (!allowAutoMinHeightSyncRef.current) return;
      const requiredRows = getRequiredMinRows();

      setDraft((prev) => {
        if (!prev) return prev;
        if (prev.layoutRows >= requiredRows) return prev;
        return { ...prev, layoutRows: requiredRows };
      });
    },
    [getRequiredMinRows, setDraft],
  );

  const handleQuestionMinHeightChange = useCallback(
    (minHeightPx: number) => handleSideMinHeightChange("question", minHeightPx),
    [handleSideMinHeightChange],
  );

  const handleAnswerMinHeightChange = useCallback(
    (minHeightPx: number) => handleSideMinHeightChange("answer", minHeightPx),
    [handleSideMinHeightChange],
  );

  useEffect(() => {
    layoutRowsRef.current = normalizeLayoutRows(draft?.layoutRows);
  }, [draft?.layoutRows]);

  useEffect(() => {
    const baseHeight = layoutRowsToCardHeightPx(defaultLayoutRows);
    allowAutoMinHeightSyncRef.current = false;
    minHeightPxBySideRef.current = {
      question: baseHeight,
      answer: baseHeight,
    };
  }, [defaultLayoutRows, normalizedSelectedCardId, isEditing]);

  useEffect(() => {
    return () => {
      if ((rowsRafRef.current !== null && rowsRafRef.current !== undefined)) {
        window.cancelAnimationFrame(rowsRafRef.current);
        rowsRafRef.current = null;
      }
    };
  }, []);

  return {
    allowAutoMinHeightSyncRef,
    setManualResizeInProgress,
    scheduleLayoutRowsFromHeight,
    handleQuestionMinHeightChange,
    handleAnswerMinHeightChange,
  };
};



export { useLayoutRowsController };
