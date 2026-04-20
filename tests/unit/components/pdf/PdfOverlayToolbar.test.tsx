// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PdfOverlayToolbar } from "@/components/pdf/PdfOverlayToolbar";

afterEach(() => {
  cleanup();
});

describe("PdfOverlayToolbar", () => {
  it("幅に合わせるボタンを表示し、fitMode が width のとき active になる", async () => {
    const user = userEvent.setup();
    const onFitWidth = vi.fn();

    render(
      <PdfOverlayToolbar
        currentPage={2}
        numPages={6}
        scalePercent={100}
        minScalePercent={50}
        maxScalePercent={300}
        fitMode="width"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={onFitWidth}
        onScalePercentChange={() => {}}
        canGoToPrevPage={true}
        canGoToNextPage={true}
      />,
    );

    const fitWidthButton = screen.getByRole("button", {
      name: "幅に合わせる",
    });

    expect(fitWidthButton.getAttribute("aria-pressed")).toBe("true");

    await user.click(fitWidthButton);

    expect(onFitWidth).toHaveBeenCalledTimes(1);
  });

  it("disabled のとき幅に合わせるボタンを押せない", async () => {
    const user = userEvent.setup();
    const onFitWidth = vi.fn();

    render(
      <PdfOverlayToolbar
        currentPage={1}
        numPages={1}
        scalePercent={100}
        minScalePercent={50}
        maxScalePercent={300}
        fitMode="manual"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={onFitWidth}
        onScalePercentChange={() => {}}
        canGoToPrevPage={false}
        canGoToNextPage={false}
        disabled={true}
      />,
    );

    const fitWidthButton = screen.getByRole("button", {
      name: "幅に合わせる",
    }) as HTMLButtonElement;

    expect(fitWidthButton.disabled).toBe(true);
    expect(fitWidthButton.getAttribute("aria-pressed")).toBe("false");

    await user.click(fitWidthButton);

    expect(onFitWidth).not.toHaveBeenCalled();
  });
});
