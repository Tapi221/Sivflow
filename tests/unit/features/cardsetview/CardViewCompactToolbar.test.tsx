// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardViewCompactToolbar } from "@/features/cardsetview/presentation/web/ui/components/CardViewCompactToolbar";

describe("CardViewCompactToolbar", () => {
  it("Enter で入力カード番号を commit する", () => {
    const onCommit = vi.fn();

    render(
      <CardViewCompactToolbar
        displayMode="fixed"
        cardLayoutMode="stack"
        onChangeDisplayMode={vi.fn()}
        onChangeCardLayoutMode={vi.fn()}
        indexNavigator={{
          current: 3,
          total: 12,
          onCommit,
        }}
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "カード番号",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "7" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(7);
    expect(input.value).toBe("7");
  });

  it("blur 時に範囲外入力を clamp する", () => {
    const onCommit = vi.fn();

    render(
      <CardViewCompactToolbar
        displayMode="fixed"
        cardLayoutMode="stack"
        onChangeDisplayMode={vi.fn()}
        onChangeCardLayoutMode={vi.fn()}
        indexNavigator={{
          current: 4,
          total: 12,
          onCommit,
        }}
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "カード番号",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1);
    expect(input.value).toBe("1");
  });

  it("空入力の blur は現在カード番号へ戻す", () => {
    const onCommit = vi.fn();

    render(
      <CardViewCompactToolbar
        displayMode="fixed"
        cardLayoutMode="stack"
        onChangeDisplayMode={vi.fn()}
        onChangeCardLayoutMode={vi.fn()}
        indexNavigator={{
          current: 5,
          total: 12,
          onCommit,
        }}
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "カード番号",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(5);
    expect(input.value).toBe("5");
  });
});
