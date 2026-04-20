import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PdfOverlayToolbar } from "@/components/pdf/PdfOverlayToolbar";

describe("PdfOverlayToolbar", () => {
  it("renders pager and zoom controls with compact overlay styling contract", () => {
    render(
      <PdfOverlayToolbar
        currentPage={3}
        numPages={12}
        scalePercent={187}
        minScalePercent={50}
        maxScalePercent={300}
        onCommitPage={vi.fn()}
        onPrevPage={vi.fn()}
        onNextPage={vi.fn()}
        onScalePercentChange={vi.fn()}
        canGoToPrevPage
        canGoToNextPage
      />,
    );

    expect(screen.getByRole("button", { name: "前のページ" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "次のページ" })).toBeTruthy();
    expect(screen.getByDisplayValue("3")).toBeTruthy();
    expect(screen.getByText("/ 12")).toBeTruthy();
    expect(screen.getByText("187%")).toBeTruthy();
  });

  it("clamps committed page input to the available page count", () => {
    const onCommitPage = vi.fn();

    render(
      <PdfOverlayToolbar
        currentPage={3}
        numPages={12}
        scalePercent={187}
        minScalePercent={50}
        maxScalePercent={300}
        onCommitPage={onCommitPage}
        onPrevPage={vi.fn()}
        onNextPage={vi.fn()}
        onScalePercentChange={vi.fn()}
        canGoToPrevPage
        canGoToNextPage
      />,
    );

    const input = screen.getByLabelText("PDFページ番号");
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.blur(input);

    expect(onCommitPage).toHaveBeenCalledWith(12);
  });

  it("emits exact slider values in 1 percent increments", () => {
    const onScalePercentChange = vi.fn();

    render(
      <PdfOverlayToolbar
        currentPage={3}
        numPages={12}
        scalePercent={187}
        minScalePercent={50}
        maxScalePercent={300}
        onCommitPage={vi.fn()}
        onPrevPage={vi.fn()}
        onNextPage={vi.fn()}
        onScalePercentChange={onScalePercentChange}
        canGoToPrevPage
        canGoToNextPage
      />,
    );

    const slider = screen.getByLabelText("PDFズーム") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "188" } });

    expect(onScalePercentChange).toHaveBeenCalledWith(188);
  });
});
