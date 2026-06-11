import { describe, expect, it } from "vitest";
import { CARD_SELECTION_CAPTURE_EVENT, dispatchCardSelectionCaptureEvent } from "@/features/selection-capture/cardSelectionCaptureEvents";

const createBlob = () => new Blob(["capture"], { type: "image/png" });

describe("cardSelectionCaptureEvents", () => {
  it("dispatches capture payload and collects async tasks", async () => {
    const target = document.createElement("div");
    const task = Promise.resolve("追加しました");

    document.addEventListener(
      CARD_SELECTION_CAPTURE_EVENT,
      (event) => {
        const captureEvent = event as CustomEvent;
        captureEvent.preventDefault();
        captureEvent.detail.addTask(task);
      },
      { once: true },
    );

    const result = dispatchCardSelectionCaptureEvent({
      blob: createBlob(),
      rect: { x: 1, y: 2, width: 30, height: 40 },
      target,
      side: "question",
      ocrText: "OCR text",
    });

    expect(result.handled).toBe(true);
    await expect(Promise.all(result.tasks)).resolves.toEqual(["追加しました"]);
  });

  it("returns unhandled when no listener consumes the event", () => {
    const result = dispatchCardSelectionCaptureEvent({
      blob: createBlob(),
      rect: { x: 0, y: 0, width: 10, height: 10 },
      target: document.createElement("div"),
      side: "answer",
      ocrText: null,
    });

    expect(result.handled).toBe(false);
    expect(result.tasks).toEqual([]);
  });
});
