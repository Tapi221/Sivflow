import { useCallback, useEffect, useState } from "react";
import { capturePdfViewerRectToBlob } from "../pdfSelectionCapture";
import { copyImageBlobToClipboard } from "@/features/selection-capture/clipboardImage";
import type { SelectionCaptureRect } from "@/features/selection-capture/selectionCapture.types";

type PdfSelectionCaptureTargetRef = {
  readonly current: HTMLElement | null;
};

type UsePdfSelectionCaptureOptions = {
  targetRef: PdfSelectionCaptureTargetRef;
  sourceUnavailable: boolean;
  numPages: number;
};

export const usePdfSelectionCapture = ({
  targetRef,
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

  const handleCaptureSelection = useCallback(async (rect: SelectionCaptureRect) => {
    const target = targetRef.current;
    if (!target) return;

    setIsSelectionCaptureBusy(true);
    try {
      const blob = await capturePdfViewerRectToBlob(target, rect);
      await copyImageBlobToClipboard(blob);
      setSelectionCaptureMessage("PDF範囲をコピーしました");
      setIsSelectionCaptureActive(false);
    } catch (error) {
      console.error("[usePdfSelectionCapture] selection capture failed", error);
      setSelectionCaptureMessage("PDF範囲コピーに失敗しました");
    } finally {
      setIsSelectionCaptureBusy(false);
    }
  }, [targetRef]);

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