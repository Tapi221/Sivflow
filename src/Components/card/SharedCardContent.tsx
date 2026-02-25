import React from 'react';
import type { CardBlock } from '@/types';
import { cn } from '@/lib/utils';
import { BlockRenderer } from './BlockRenderer';
import { BlockEditor } from './BlockEditor';
import { CARD_ROW_PX, CARD_TOP_PADDING_PX } from './constants';
import { normalizeExtraRows } from '@/domain/card/extraRows';

type SharedCardContentBaseProps = {
  blocks: CardBlock[];
  extraRows?: number;
  className?: string;
};

type SharedCardContentViewProps = SharedCardContentBaseProps & {
  mode: 'view';
  onGalleryFullscreenChange?: (isFullscreen: boolean) => void;
};

type SharedCardContentEditProps = SharedCardContentBaseProps & {
  mode: 'edit';
  onChange: (blocks: CardBlock[]) => void;
  prefix: 'question' | 'answer';
  label: string;
  color: string;
  droppableId: string;
  accentColor?: string;
  duplicateToOpposite?: boolean;
  onCrossDuplicate?: (block: CardBlock) => void;
  autoFocus?: boolean;
  customPlaceholders?: Record<number, string>;
  hideToolbar?: boolean;
  onDelete?: (index: number) => void;
  minDeletableIndex?: number;
  hiddenBlockTypes?: CardBlock['type'][];
  toolbarMountRef?: React.RefObject<HTMLDivElement | null>;
};

export type SharedCardContentProps = SharedCardContentViewProps | SharedCardContentEditProps;

export function SharedCardContent(props: SharedCardContentProps) {
  const safeExtraRows = normalizeExtraRows(props.extraRows);
  const extraSpaceHeightPx = safeExtraRows * CARD_ROW_PX;

  return (
    <div
      className={cn(
        'card-content-root flex min-h-0 flex-1 flex-col w-full max-w-full overflow-x-hidden overflow-y-visible',
        props.className
      )}
      style={{ paddingTop: `var(--card-content-padding-top, ${CARD_TOP_PADDING_PX}px)` }}
    >
      {props.mode === 'edit' ? (
        <BlockEditor
          blocks={props.blocks}
          onChange={props.onChange}
          prefix={props.prefix}
          label={props.label}
          color={props.color}
          droppableId={props.droppableId}
          accentColor={props.accentColor}
          duplicateToOpposite={props.duplicateToOpposite}
          onCrossDuplicate={props.onCrossDuplicate}
          autoFocus={props.autoFocus}
          customPlaceholders={props.customPlaceholders}
          hideToolbar={props.hideToolbar}
          onDelete={props.onDelete}
          minDeletableIndex={props.minDeletableIndex}
          hiddenBlockTypes={props.hiddenBlockTypes}
          toolbarMountRef={props.toolbarMountRef}
          topPaddingPx={0}
        />
      ) : (
        <BlockRenderer
          blocks={props.blocks}
          onGalleryFullscreenChange={props.onGalleryFullscreenChange}
        />
      )}

      <div
        className="w-full shrink-0"
        aria-hidden="true"
        data-card-extra-space="true"
        style={extraSpaceHeightPx > 0 ? { height: `${extraSpaceHeightPx}px` } : undefined}
      />
    </div>
  );
}
