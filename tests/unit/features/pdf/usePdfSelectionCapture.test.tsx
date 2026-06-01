// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectionCaptureRect } from "@/features/selection-capture/selectionCapture.types";

const state = vi.hoisted(() => {
  return {
    capturePdfViewerRectToBlob: vi.fn(),
    copyImageBlobToClipboard: vi.fn(),
    recognizeSelectionCaptureText: vi.fn(),
  };
});

vi.mock("@/features/pdf/pdfSelectionCapture", () => ({
  capturePdfViewerRectToBlob: state.capturePdfViewerRectToBlob,
}));

vi.mock("@/features/selection-capture/clipboardImage", () => ({
  copyImageBlobToClipboard: state.copyImageBlobToClipboard,
}));

vi.mock("@/features/selection-capture/selectionCaptureOcr", () => ({
  recognizeSelectionCaptureText: state.recognizeSelectionCaptureText,
}));

import { usePdfSelectionCapture } from "@/features/pdf/hooks/usePdfSelectionCapture";
import { CARD_SELECTION_CAPTURE_EVENT, type CardSelectionCaptureEventDetail } from "@/features/selection-capture/cardSelectionCaptureEvents";

const CAPTURE_RECT: SelectionCaptureRect = {
  x: 4,
  y: 8,
  width: 120,
  height: 64,
};

const createPngBlob = () => new Blob(["pdf-capture"], { type: "image/png" });

const createTargetRef = () => {
  return {
    current: document.createElement("div"),
  };
};

describe("usePdfSelectionCapture", () => {
  beforeEach(() => {
    cleanup();
    state.capturePdfViewerRectToBlob.mockReset();
    state.copyImageBlobToClipboard.mockReset().mockResolvedValue(undefined);
    state.recognizeSelectionCaptureText.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("カード側で capture event が処理された場合は clipboard fallback せず task message を表示する", async () => {
    const blob = createPngBlob();
    const targetRef = createTargetRef();
    const receivedDetails: CardSelectionCaptureEventDetail[] = [];

    state.capturePdfViewerRectToBlob.mockResolvedValue(blob);
    state.recognizeSelectionCaptureText.mockResolvedValue("PDF OCR text");

    document.addEventListener(
      CARD_SELECTION_CAPTURE_EVENT,
      (event) => {
        const captureEvent = event as CustomEvent<CardSelectionCaptureEventDetail>;
        captureEvent.preventDefault();
        receivedDetails.push(captureEvent.detail);
        captureEvent.detail.addTask(Promise.resolve("カードへ追加しました"));
      },
      { once: true },
    );

    const { result } = renderHook(() =>
      usePdfSelectionCapture({
        targetRef,
        selectionCaptureSide: "answer",
        sourceUnavailable: false,
        numPages: 1,
      }),
    );

    await act(async () => {
      await result.current.handleCaptureSelection(CAPTURE_RECT);
    });

    expect(state.capturePdfViewerRectToBlob).toHaveBeenCalledWith(targetRef.current, CAPTURE_RECT);
    expect(state.recognizeSelectionCaptureText).toHaveBeenCalledWith(blob);
    expect(state.copyImageBlobToClipboard).not.toHaveBeenCalled();
    expect(receivedDetails).toHaveLength(1);
    expect(receivedDetails[0].blob).toBe(blob);
    expect(receivedDetails[0].rect).toEqual(CAPTURE_RECT);
    expect(receivedDetails[0].target).toBe(targetRef.current);
    expect(receivedDetails[0].side).toBe("answer");
    expect(receivedDetails[0].ocrText).toBe("PDF OCR text");
    expect(result.current.selectionCaptureMessage).toBe("カードへ追加しました");
  });

  it("capture event が未処理の場合は従来通り画像を clipboard にコピーする", async () => {
    const blob = createPngBlob();
    const targetRef = createTargetRef();

    state.capturePdfViewerRectToBlob.mockResolvedValue(blob);
    state.recognizeSelectionCaptureText.mockResolvedValue(null);

    const { result } = renderHook(() =>
      usePdfSelectionCapture({
        targetRef,
        selectionCaptureSide: "question",
        sourceUnavailable: false,
        numPages: 1,
      }),
    );

    await act(async () => {
      await result.current.handleCaptureSelection(CAPTURE_RECT);
    });

    expect(state.capturePdfViewerRectToBlob).toHaveBeenCalledWith(targetRef.current, CAPTURE_RECT);
    expect(state.copyImageBlobToClipboard).toHaveBeenCalledWith(blob);
    expect(result.current.selectionCaptureMessage).toBe("PDF範囲をコピーしました");
  });
});