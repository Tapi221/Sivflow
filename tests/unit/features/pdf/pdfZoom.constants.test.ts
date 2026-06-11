import { describe, expect, it } from "vitest";


import { PDF_TRACKPAD_ZOOM_SENSITIVITY, PDF_ZOOM_BUTTON_SCALE_FACTOR, PDF_ZOOM_MAX_SCALE, PDF_ZOOM_MIN_SCALE, PDF_ZOOM_STEP } from "@/features/pdf/pdfZoom.constants";

describe("pdfZoom.constants", () => {
  it("PDF zoom の共有定数を固定する", () => {
    expect(PDF_TRACKPAD_ZOOM_SENSITIVITY).toBe(0.0015);
    expect(PDF_ZOOM_BUTTON_SCALE_FACTOR).toBe(1.1);
    expect(PDF_ZOOM_MAX_SCALE).toBe(5);
    expect(PDF_ZOOM_MIN_SCALE).toBe(0.25);
    expect(PDF_ZOOM_STEP).toBe(0.2);
  });
});
