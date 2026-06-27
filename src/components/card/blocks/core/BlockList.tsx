import { Fragment } from "react";
import { cn } from "@web-renderer/lib/utils";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { shouldRenderInterBlockSeparator } from "./blockDisplayPolicy";
import { BlockSeparator } from "./BlockSeparator";
import { getNormalizedGridOffsetRows, getNormalizedRowOffset, getRowOffsetStyle, isGridOffsetType, isRowPositionableType } from "@/components/card/frame/rowOffset";
import { CARD_ROW_PX } from "@/domain/card/cardGeometry.constants";
import type { CardBlock } from "@/types/domain/card";



type BlockListRowMeta = {
  index: number;
  rowOffsetRows: number;
  rowOffsetPx: number;
  gridOffsetPx: number;
  isGridOffsetBlock: boolean;
  isLinePositionable: boolean;
  showSeparator: boolean;
};
interface BlockListProps {
  blocks: CardBlock[];
  className?: string;
  rowClassName?: string;
  getRowRef?: (
    block: CardBlock,
    meta: BlockListRowMeta,
  ) => Ref<HTMLDivElement> | undefined;
  getRowContainerProps?: (
    block: CardBlock,
    meta: BlockListRowMeta,
  ) => HTMLAttributes<HTMLDivElement> | undefined;
  renderBlock: (block: CardBlock, meta: BlockListRowMeta) => ReactNode;
}



const BlockList = ({ blocks, className, rowClassName, getRowRef, getRowContainerProps, renderBlock }: BlockListProps) => {
  return (<div className={cn("w-full max-w-full", className)}> {blocks.map((block, index) => {
    const isGridOffsetBlock = isGridOffsetType(block.type);
    const isLinePositionable = isRowPositionableType(block.type);
    const rowOffsetRows = !isLinePositionable
      ? 0
      : isGridOffsetBlock
        ? getNormalizedGridOffsetRows(block)
        : getNormalizedRowOffset(block);

    const rowOffsetPx =
      isLinePositionable && !isGridOffsetBlock
        ? rowOffsetRows * CARD_ROW_PX
        : 0;
    const gridOffsetPx = isGridOffsetBlock
      ? rowOffsetRows * CARD_ROW_PX
      : 0;
    const showSeparator =
      index > 0 &&
      shouldRenderInterBlockSeparator(blocks[index - 1].type, block.type);

    const meta: BlockListRowMeta = {
      index,
      rowOffsetRows,
      rowOffsetPx,
      gridOffsetPx,
      isGridOffsetBlock,
      isLinePositionable,
      showSeparator,
    };

    const content = renderBlock(block, meta);
    if (!content) return null;

    const rowProps = getRowContainerProps?.(block, meta);
    const rowRef = getRowRef?.(block, meta);
    const customClassName = rowProps?.className;
    const customStyle = rowProps?.style;
    const rowStyle =
      isLinePositionable && !isGridOffsetBlock
        ? getRowOffsetStyle(block)
        : undefined;

    return (
      <Fragment key={block.id}>
        {showSeparator && <BlockSeparator />}

        <div
          ref={rowRef}
          {...rowProps}
          className={cn(
            "w-full min-w-0 max-w-full flow-root",
            rowClassName,
            customClassName,
          )}
          data-block-row="true"
          data-row-offset-applied={rowOffsetPx ? "true" : undefined}
          style={{
            ...(rowStyle ?? {}),
            ...(customStyle ?? {}),
          }}
        >
          {content}
        </div>
      </Fragment>
    );
  })}
  </div>
  );
};



export { BlockList };


export type { BlockListRowMeta };
