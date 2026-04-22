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
        zoomPercent={100}
        minZoomPercent={0}
        maxZoomPercent={100}
        fitMode="width"
        pageLayoutMode="single"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={onFitWidth}
        onZoomPercentChange={() => {}}
        onPageLayoutModeChange={() => {}}
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

  it("ページレイアウトを単一ボタンでトグルする", async () => {
    const user = userEvent.setup();
    const onPageLayoutModeChange = vi.fn();

    const { rerender } = render(
      <PdfOverlayToolbar
        currentPage={2}
        numPages={6}
        zoomPercent={100}
        minZoomPercent={0}
        maxZoomPercent={100}
        fitMode="manual"
        pageLayoutMode="single"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={() => {}}
        onZoomPercentChange={() => {}}
        onPageLayoutModeChange={onPageLayoutModeChange}
        canGoToPrevPage={true}
        canGoToNextPage={true}
      />,
    );

    const singleToggleButton = screen.getByRole("button", {
      name: "単一表示。タップで2枚表示に切り替え",
    });

    expect(singleToggleButton.getAttribute("aria-pressed")).toBe("false");

    await user.click(singleToggleButton);

    expect(onPageLayoutModeChange).toHaveBeenCalledTimes(1);
    expect(onPageLayoutModeChange).toHaveBeenCalledWith("double");

    rerender(
      <PdfOverlayToolbar
        currentPage={2}
        numPages={6}
        zoomPercent={100}
        minZoomPercent={0}
        maxZoomPercent={100}
        fitMode="manual"
        pageLayoutMode="double"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={() => {}}
        onZoomPercentChange={() => {}}
        onPageLayoutModeChange={onPageLayoutModeChange}
        canGoToPrevPage={true}
        canGoToNextPage={true}
      />,
    );

    const doubleToggleButton = screen.getByRole("button", {
      name: "2枚表示。タップで単一表示に切り替え",
    });

    expect(doubleToggleButton.getAttribute("aria-pressed")).toBe("true");

    await user.click(doubleToggleButton);

    expect(onPageLayoutModeChange).toHaveBeenCalledTimes(2);
    expect(onPageLayoutModeChange).toHaveBeenLastCalledWith("single");
  });

  it("1ページしかないときページレイアウト切り替えを無効化する", () => {
    render(
      <PdfOverlayToolbar
        currentPage={1}
        numPages={1}
        zoomPercent={100}
        minZoomPercent={0}
        maxZoomPercent={100}
        fitMode="manual"
        pageLayoutMode="single"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={() => {}}
        onZoomPercentChange={() => {}}
        onPageLayoutModeChange={() => {}}
        canGoToPrevPage={false}
        canGoToNextPage={false}
      />,
    );

    const pageLayoutToggleButton = screen.getByRole("button", {
      name: "単一表示。タップで2枚表示に切り替え",
    }) as HTMLButtonElement;

    expect(pageLayoutToggleButton.disabled).toBe(true);
    expect(pageLayoutToggleButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("disabled のとき幅に合わせるボタンを押せない", async () => {
    const user = userEvent.setup();
    const onFitWidth = vi.fn();

    render(
      <PdfOverlayToolbar
        currentPage={1}
        numPages={1}
        zoomPercent={100}
        minZoomPercent={0}
        maxZoomPercent={100}
        fitMode="manual"
        pageLayoutMode="single"
        onCommitPage={() => {}}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onFitWidth={onFitWidth}
        onZoomPercentChange={() => {}}
        onPageLayoutModeChange={() => {}}
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
