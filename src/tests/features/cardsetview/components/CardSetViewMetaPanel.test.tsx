// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardSetViewMetaPanel } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMetaPanel";
import type { Card } from "@/types";

const cardMetaPanelPropsSpy = vi.hoisted(() => vi.fn());

vi.mock("@/components/card/panels/CardMetaPanel", () => ({
  CardMetaPanel: (props: unknown) => {
    cardMetaPanelPropsSpy(props);
    return null;
  },
}));

const makeCard = (overrides: Partial<Card> = {}) => {
  return {
    id: "card-1",
    title: "old-title",
    reviewLogs: [],
    ...overrides,
  } as Card;
};

describe("CardSetViewMetaPanel", () => {
  it("dispatches editing draft patch while typing title in global edit mode", async () => {
    cardMetaPanelPropsSpy.mockClear();

    render(
      <CardSetViewMetaPanel
        selectedCard={makeCard()}
        isGlobalEditing
        settings={undefined}
        updateCard={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const props = cardMetaPanelPropsSpy.mock.calls.at(-1)?.[0] as
      | {
          onTitleInputChange?: (nextTitle: string) => void;
        }
      | undefined;

    expect(props?.onTitleInputChange).toBeTypeOf("function");

    const listener = vi.fn();

    window.addEventListener(
      "cardsetview:editing-draft-patch",
      listener as EventListener,
    );

    await act(async () => {
      props?.onTitleInputChange?.("new-title");
    });

    expect(listener).toHaveBeenCalledTimes(1);

    const event = listener.mock.calls[0][0] as CustomEvent<{
      cardId: string;
      patch: { title: string };
    }>;

    expect(event.detail).toEqual({
      cardId: "card-1",
      patch: { title: "new-title" },
    });

    window.removeEventListener(
      "cardsetview:editing-draft-patch",
      listener as EventListener,
    );
  });

  it("does not dispatch draft patch on typing when not in global edit mode", async () => {
    cardMetaPanelPropsSpy.mockClear();

    render(
      <CardSetViewMetaPanel
        selectedCard={makeCard()}
        isGlobalEditing={false}
        settings={undefined}
        updateCard={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const props = cardMetaPanelPropsSpy.mock.calls.at(-1)?.[0] as
      | {
          onTitleInputChange?: (nextTitle: string) => void;
        }
      | undefined;

    const listener = vi.fn();

    window.addEventListener(
      "cardsetview:editing-draft-patch",
      listener as EventListener,
    );

    await act(async () => {
      props?.onTitleInputChange?.("new-title");
    });

    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(
      "cardsetview:editing-draft-patch",
      listener as EventListener,
    );
  });
});
