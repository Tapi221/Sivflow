import React from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import { MobileScalableCard } from "@/components/card/frame/MobileScalableCard";
import { CANONICAL_CARD_WIDTH, CARD_SAFE_PADDING_PX } from "@/domain/card/cardGeometry.constants";
import type { CardBlock } from "@/types/domain/card";



const FIXTURE_BLOCKS: CardBlock[] = [
  {
    id: "fixture-code-1",
    type: "code",
    orderIndex: 0,
    code: {
      language: "typescript",
      code: "export const sum = (a: number, b: number) => a + b;\nconsole.log(sum(2, 3));",
    },
  },
];
const FIXTURE_CARD = {
  id: "layout-fixture-card",
  title: "Layout Fixture",
  front: {
    blocks: FIXTURE_BLOCKS,
  },
  back: {
    blocks: FIXTURE_BLOCKS,
  },
  questionExtraRows: 2,
  answerExtraRows: 2,
};



const CardLayoutConsistencyTest = () => {
  const [editBlocks, setEditBlocks] =
    React.useState<CardBlock[]>(FIXTURE_BLOCKS);
  const canRender =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("test_bypass") === "true";

  if (!canRender) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2">
        <section data-testid="card-layout-view-shot" className="w-full">
          <MobileScalableCard
            cardDesignWidth={CANONICAL_CARD_WIDTH}
            safePadding={CARD_SAFE_PADDING_PX}
          >
            <Flashcard card={FIXTURE_CARD} />
          </MobileScalableCard>
        </section>
        <section data-testid="card-layout-edit-shot" className="w-full">
          <MobileScalableCard
            cardDesignWidth={CANONICAL_CARD_WIDTH}
            safePadding={CARD_SAFE_PADDING_PX}
          >
            <DragDropContext onDragEnd={() => {}}>
              <CardFrame
                baseWidth={CANONICAL_CARD_WIDTH}
                className="premium-paper-depth card-shell--paper"
                resizable={false}
                showResizeHandle={false}
              >
                <SharedCardContent
                  mode="edit"
                  blocks={editBlocks}
                  onChange={setEditBlocks}
                  prefix="question"
                  label="問題"
                  hideToolbar
                />
              </CardFrame>
            </DragDropContext>
          </MobileScalableCard>
        </section>
      </div>
    </div>
  );
};



export default CardLayoutConsistencyTest;
