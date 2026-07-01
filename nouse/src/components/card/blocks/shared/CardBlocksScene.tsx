import React from "react";
import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockList } from "@/components/card/blocks/core/BlockList";
import type { EditorProps, ViewerProps } from "./CardBlockLayoutRenderer";
import { CardBlockLayoutRenderer } from "./CardBlockLayoutRenderer";
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
type CardBlocksSceneResolvedProps =
  | Readonly<{
    mode: "view";
    viewerProps: ViewerProps;
  }>
  | Readonly<{
    mode: "edit";
    editorProps: EditorProps;
  }>;
type CardBlocksSceneProps = SharedSceneProps &
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



const CardBlocksScene = React.memo(CardBlocksSceneInner);
CardBlocksScene.displayName = "CardBlocksScene";

export { CardBlocksScene };


export type { CardBlocksSceneProps, CardBlocksSceneResolvedProps };
