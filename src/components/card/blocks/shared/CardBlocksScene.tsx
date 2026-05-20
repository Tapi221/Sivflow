import React from "react";

import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockList } from "@/components/card/blocks/core/BlockList";
import {
  CardBlockLayoutRenderer,
  type EditorProps,
  type ViewerProps,
} from "@/components/card/blocks/shared/CardBlockLayoutRenderer";

import type { CardBlock } from "@/types/domain/card";

type RowContainerProps = Readonly<Record<string, unknown>>;

type GetRowRef = (
  block: CardBlock,
) => ((element: HTMLElement | null) => void) | undefined;

type GetRowContainerProps = (
  block: CardBlock,
  meta: BlockListRowMeta,
) => RowContainerProps | undefined;

type SharedSceneProps = Readonly<{
  blocks: CardBlock[];
  getRowRef?: GetRowRef;
  getRowContainerProps?: GetRowContainerProps;
}>;

export type CardBlocksSceneResolvedProps =
  | Readonly<{
    mode: "view";
    viewerProps: ViewerProps;
  }>
  | Readonly<{
    mode: "edit";
    editorProps: EditorProps;
  }>;

export type CardBlocksSceneProps = SharedSceneProps &
  Readonly<{
    resolveSceneProps: (
      block: CardBlock,
      meta: BlockListRowMeta,
    ) => CardBlocksSceneResolvedProps;
  }>;

const CardBlocksSceneInner = ({
  blocks,
  getRowRef,
  getRowContainerProps,
  resolveSceneProps,
}: CardBlocksSceneProps) => {
  const renderBlock = React.useCallback(
    (block: CardBlock, meta: BlockListRowMeta) => {
      const sceneProps = resolveSceneProps(block, meta);

      return (
        <CardBlockLayoutRenderer block={block} meta={meta} {...sceneProps} />
      );
    },
    [resolveSceneProps],
  );

  return (
    <BlockList
      blocks={blocks}
      getRowRef={getRowRef}
      getRowContainerProps={getRowContainerProps}
      renderBlock={renderBlock}
    />
  );
};

export const CardBlocksScene = React.memo(CardBlocksSceneInner);
CardBlocksScene.displayName = "CardBlocksScene";
