import type { BlockListRowMeta } from "@/components/card/blocks/core/BlockList";
import { BlockList } from "@/components/card/blocks/core/BlockList";
import {
  CardBlockLayoutRenderer,
  type EditorProps,
  type ViewerProps,
} from "@/components/card/blocks/shared/CardBlockLayoutRenderer";
import type { CardBlock } from "@/types/domain/card";
import React from "react";

type GetRowRef = (
  block: CardBlock,
) => ((element: HTMLElement | null) => void) | undefined;
type GetRowContainerProps = (
  block: CardBlock,
  meta: BlockListRowMeta,
) => Record<string, unknown> | undefined;

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

export const CardBlocksScene = (props: CardBlocksSceneProps) => {
  return (
    <BlockList
      blocks={props.blocks}
      getRowRef={props.getRowRef}
      getRowContainerProps={props.getRowContainerProps}
      renderBlock={(block, meta) => {
        if (props.mode === "view") {
          return (
            <CardBlockLayoutRenderer
              mode="view"
              block={block}
              meta={meta}
              viewerProps={props.viewerProps}
            />
          );
        }

        return (
          <CardBlockLayoutRenderer
            mode="edit"
            block={block}
            meta={meta}
            editorProps={props.resolveEditorProps(block, meta)}
          />
        );
      }}
    />
  );
};
