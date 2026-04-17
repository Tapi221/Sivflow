// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardZoomControl } from "@/features/cardsetview/presentation/web/ui/components/CardZoomControl";

describe("CardZoomControl", () => {
  it("renders minus/slider/percent/plus without reset button", () => {
    render(
      <CardZoomControl
        value={55}
        min={0}
        max={100}
        onChange={vi.fn()}
        onStepDown={vi.fn()}
        onStepUp={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "ズームを縮小" })).toBeTruthy();
    expect(screen.getByLabelText("閲覧ズーム")).toBeTruthy();
    expect(screen.getByText("55%")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ズームを拡大" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "ズームを既定値に戻す" })).toBe(
      null,
    );
  });
});
