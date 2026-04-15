import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockList } from "@/components/card/blocks/core/BlockList";
import {
  CardBlockLayoutRenderer,
  type EditorProps,
  type ViewerProps,
} from "@/components/card/blocks/shared/CardBlockLayoutRenderer";
import type { CardBlock } from "@/types/domain/card";
import React from "react";

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

type ViewCardBlocksSceneProps = SharedSceneProps &
  Readonly<{
    mode: "view";
    viewerProps: ViewerProps;
  }>;

type EditCardBlocksSceneProps = SharedSceneProps &
  Readonly<{
    mode: "edit";
    resolveEditorProps: (
      block: CardBlock,
      meta: BlockListRowMeta,
    ) => EditorProps;
  }>;

export type CardBlocksSceneProps =
  | ViewCardBlocksSceneProps
  | EditCardBlocksSceneProps;

const CardBlocksSceneInner = (props: CardBlocksSceneProps) => {
  const renderBlock = React.useCallback(
    (block: CardBlock, meta: BlockListRowMeta) => {
      return props.mode === "view" ? (
        <CardBlockLayoutRenderer
          mode="view"
          block={block}
          meta={meta}
          viewerProps={props.viewerProps}
        />
      ) : (
        <CardBlockLayoutRenderer
          mode="edit"
          block={block}
          meta={meta}
          editorProps={props.resolveEditorProps(block, meta)}
        />
      );
    },
    [props],
  );

  return (
    <BlockList
      blocks={props.blocks}
      getRowRef={props.getRowRef}
      getRowContainerProps={props.getRowContainerProps}
      renderBlock={renderBlock}
    />
  );
};

export const CardBlocksScene = React.memo(CardBlocksSceneInner);
CardBlocksScene.displayName = "CardBlocksScene";
