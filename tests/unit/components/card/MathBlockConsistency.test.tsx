// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathBlockContent } from "@/components/card/blocks/math/MathBlockContent";
import { BlockRenderer } from "@/components/card/blocks/render/BlockRenderer";
import type { CardBlock } from "@/types/domain/card";

describe("数式ブロックの表示構造の一貫性", () => {
  it("閲覧側とエディタープレビュー側の両方で mathBlockRoot フレームを使う", () => {
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
