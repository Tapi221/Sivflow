// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT } from "@constants/shared/flashcard";
import { CardZoomControl } from "@/features/cardsetview/presentation/web/ui/components/CardZoomControl";

describe("CardZoomControl", () => {
  it("renders minus/slider/percent/plus with 1 percent slider precision", () => {
    render(
      <CardZoomControl
        value={55}
        min={0}
        max={100}
        onCommit={vi.fn()}
        onStepDown={vi.fn()}
        onStepUp={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "ズームを縮小" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ズームを拡大" })).toBeTruthy();
    expect(screen.getByText("55%")).toBeTruthy();

    const slider = screen.getByLabelText("カードズーム") as HTMLInputElement;
    expect(slider.step).toBe(String(CARD_VIEW_ZOOM_SLIDER_STEP_PERCENT));
  });

  it("uses preview changes while dragging and commits on release", () => {
    const onPreviewChange = vi.fn();
    const onCommit = vi.fn();

    render(
      <CardZoomControl
        value={45}
        min={0}
        max={100}
        onPreviewChange={onPreviewChange}
        onCommit={onCommit}
        onStepDown={vi.fn()}
        onStepUp={vi.fn()}
      />,
    );

    const slider = screen.getByLabelText("カードズーム") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "46" } });
    fireEvent.mouseUp(slider, { target: { value: "46" } });

    expect(onPreviewChange).toHaveBeenCalledWith(46);
    expect(onCommit).toHaveBeenCalledWith(46);
  });
});
