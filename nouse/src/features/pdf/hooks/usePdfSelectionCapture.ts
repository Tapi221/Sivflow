import { useCallback, useEffect, useState } from "react";
import { capturePdfViewerAreaToBlob } from "@/features/pdf/pdfSelectionCapture";
import type { CardSelectionCaptureSide, CardSelectionCaptureTaskResult } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { dispatchCardSelectionCaptureEvent } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { copyImageBlobToClipboard } from "@/features/selection-capture/clipboardImage";
import type { SelectionCaptureArea } from "@/features/selection-capture/selectionCapture.types";
import { recognizeSelectionCaptureText } from "@/features/selection-capture/selectionCaptureOcr";



type PdfSelectionCaptureTargetRef = {
  readonly current: HTMLElement | null;
};
type UsePdfSelectionCaptureParams = {
  targetRef: PdfSelectionCaptureTargetRef;
  selectionCaptureSide: CardSelectionCaptureSide;
  sourceUnavailable: boolean;
  numPages: number;
};
type UsePdfSelectionCaptureResult = {
  isSelectionCaptureBusy: boolean;
  selectionCaptureMessage: string | null;
  handleCaptureSelection: (area: SelectionCaptureArea) => Promise<void>;
};



const PDF_SELECTION_CAPTURE_MESSAGE_TIMEOUT_MS = 1800;



const resolvePdfSelectionCaptureTaskMessage = (results: CardSelectionCaptureTaskResult[]): string | null => {
  return results.find((result): result is string => typeof result === "string" && result.trim().length > 0) ?? null;
};
const usePdfSelectionCapture = ({ targetRef, selectionCaptureSide, sourceUnavailable, numPages }: UsePdfSelectionCaptureParams): UsePdfSelectionCaptureResult => {
  const [isSelectionCaptureBusy, setIsSelectionCaptureBusy] = useState(false);
  const [selectionCaptureMessage, setSelectionCaptureMessage] = useState<string | null>(null);

  const handleCaptureSelection = useCallback(async (area: SelectionCaptureArea) => {
    const target = targetRef.current;
    if (!target || sourceUnavailable || numPages <= 0) return;

    setIsSelectionCaptureBusy(true);
    try {
      const blob = await capturePdfViewerAreaToBlob(target, area);
      const ocrText = await recognizeSelectionCaptureText(blob).catch((error) => {
        console.warn("[usePdfSelectionCapture] OCR failed", error);
        return null;
      });
      const dispatched = dispatchCardSelectionCaptureEvent({ blob, rect: area.rect, area, target, side: selectionCaptureSide, ocrText });

      if (dispatched.handled) {
        const taskResults = await Promise.all(dispatched.tasks);
        setSelectionCaptureMessage(resolvePdfSelectionCaptureTaskMessage(taskResults) ?? "PDF範囲をカードへ追加しました");
      } else {
        await copyImageBlobToClipboard(blob);
        setSelectionCaptureMessage("PDF範囲をコピーしました");
      }
    } catch (error) {
      console.error("[usePdfSelectionCapture] capture failed", error);
      setSelectionCaptureMessage("PDF範囲コピーに失敗しました");
    } finally {
      setIsSelectionCaptureBusy(false);
    }
  }, [numPages, selectionCaptureSide, sourceUnavailable, targetRef]);

  useEffect(() => {
    if (!selectionCaptureMessage) return undefined;

    const timeoutId = globalThis.setTimeout(() => {
      setSelectionCaptureMessage(null);
    }, PDF_SELECTION_CAPTURE_MESSAGE_TIMEOUT_MS);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [selectionCaptureMessage]);

  return {
    isSelectionCaptureBusy,
    selectionCaptureMessage,
    handleCaptureSelection,
  };
};



export { usePdfSelectionCapture };


export type { UsePdfSelectionCaptureParams, UsePdfSelectionCaptureResult };
