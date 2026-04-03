// @vitest-environment jsdom
import { BlockRenderer } from "@/components/card/blocks/render/BlockRenderer";
import { MathBlockContent } from "@/components/card/blocks/math/MathBlockContent";
import type { CardBlock } from "@/types/domain/card";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Math block consistency", () => {
  it("viewer and editor-preview path both use mathBlockRoot frame", () => {
    const view = render(
      <BlockRenderer
        blocks={[
          {
            id: "math-1",
            type: "math",
            orderIndex: 0,
            math: { latex: "x^2+1", displayMode: "block" },
          } as CardBlock,
        ]}
      />,
    );

    const previewLike = render(
      <MathBlockContent latex={"x^2+1"} displayMode="block" />,
    );

    expect(view.container.querySelector(".mathBlockRoot")).toBeTruthy();
    expect(previewLike.container.querySelector(".mathBlockRoot")).toBeTruthy();
  });
});







