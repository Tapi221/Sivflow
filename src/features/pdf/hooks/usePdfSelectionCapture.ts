import { useCallback, useEffect, useState } from "react";
import { capturePdfViewerAreaToBlob } from "@/features/pdf/pdfSelectionCapture";
import { copyImageBlobToClipboard } from "@/features/selection-capture/clipboardImage";
import { dispatchCardSelectionCaptureEvent, type CardSelectionCaptureSide, type CardSelectionCaptureTaskResult } from "@/features/selection-capture/cardSelectionCaptureEvents";
import type { SelectionCaptureArea } from "@/features/selection-capture/selectionCapture.types";
import { recognizeSelectionCaptureText } from "@/features/selection-capture/selectionCaptureOcr";

type PdfSelectionCaptureTargetRef = {
  readonly current: HTMLElement | null;
};

type UsePdfSelectionCaptureOptions = {
  targetRef: PdfSelectionCaptureTargetRef;
  selectionCaptureSide: CardSelectionCaptureSide;
  sourceUnavailable: boolean;
  numPages: number;
};

const resolveTaskMessage = (values: CardSelectionCaptureTaskResult[]): string | null => {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
};

const resolveHandledCaptureMessage = (taskMessage: string | null, ocrText: string | null): string => {
  if (taskMessage) return taskMessage;
  return ocrText ? "PDF範囲画像とOCRテキストをカードへ追加しました" : "PDF範囲画像をカードへ追加しました";
};

export const usePdfSelectionCapture = ({
  targetRef,
  selectionCaptureSide,
  sourceUnavailable,
  numPages,
}: UsePdfSelectionCaptureOptions) => {
  const [isSelectionCaptureActive, setIsSelectionCaptureActive] = useState(false);
  const [isSelectionCaptureBusy, setIsSelectionCaptureBusy] = useState(false);
  const [selectionCaptureMessage, setSelectionCaptureMessage] = useState<string | null>(null);

  const handleToggleSelectionCapture = useCallback(() => {
    setSelectionCaptureMessage(null);
    setIsSelectionCaptureActive((isActive) => !isActive);
  }, []);

  const handleCancelSelectionCapture = useCallback(() => {
    setIsSelectionCaptureActive(false);
    setIsSelectionCaptureBusy(false);
  }, []);

  const handleCaptureSelection = useCallback(async (area: SelectionCaptureArea) => {
    const target = targetRef.current;
    if (!target) return;

    setIsSelectionCaptureBusy(true);
    try {
      const blob = await capturePdfViewerAreaToBlob(target, area);
      const ocrText = await recognizeSelectionCaptureText(blob).catch((error) => {
        console.warn("[usePdfSelectionCapture] selection capture OCR failed", error);
        return null;
      });
      const dispatched = dispatchCardSelectionCaptureEvent({
        blob,
        rect: area.rect,
        area,
        target,
        side: selectionCaptureSide,
        ocrText,
      });

      if (dispatched.handled) {
        const taskResults = await Promise.all(dispatched.tasks);
        setSelectionCaptureMessage(resolveHandledCaptureMessage(resolveTaskMessage(taskResults), ocrText));
      } else {
        await copyImageBlobToClipboard(blob);
        setSelectionCaptureMessage("PDF範囲をコピーしました");
      }

      setIsSelectionCaptureActive(false);
    } catch (error) {
      console.error("[usePdfSelectionCapture] selection capture failed", error);
      setSelectionCaptureMessage("PDF範囲処理に失敗しました");
    } finally {
      setIsSelectionCaptureBusy(false);
    }
  }, [selectionCaptureSide, targetRef]);

  useEffect(() => {
    if (!selectionCaptureMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSelectionCaptureMessage(null);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectionCaptureMessage]);

  useEffect(() => {
    if (sourceUnavailable || numPages <= 0) {
      setIsSelectionCaptureActive(false);
      setIsSelectionCaptureBusy(false);
    }
  }, [numPages, sourceUnavailable]);

  return {
    isSelectionCaptureActive,
    isSelectionCaptureBusy,
    selectionCaptureMessage,
    handleToggleSelectionCapture,
    handleCancelSelectionCapture,
    handleCaptureSelection,
  };
};
