import {
  type DropTargetDropEvent,
  Checkbox,
  useDraggable,
  useDropTarget,
} from '@affine/component';
import {
  applyTagParentDrop,
  tagItemCanDrop,
  tagItemDropEffect,
  TagService,
} from '@affine/core/modules/tag';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { stopPropagation } from '@affine/core/utils';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { ToggleRightIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import type {
  ChangeEvent,
  ForwardedRef,
  MouseEvent,
  PropsWithChildren,
} from 'react';
import { forwardRef, useCallback, useMemo } from 'react';

import { selectionStateAtom, useAtom } from '../scoped-atoms';
import type { TagListItemProps } from '../types';
import { ColWrapper } from '../utils';
import * as styles from './tag-list-item.css';

const TagListTitleCell = ({ title }: Pick<TagListItemProps, 'title'>) => {
  const t = useI18n();
  return (
    <div data-testid="tag-list-item-title" className={styles.titleCell}>
      <div
        data-testid="tag-list-item-title-text"
        className={styles.titleCellMain}
      >
        {title || t['Untitled']()}
      </div>
      {/* // TODO(@EYHN): when indexer is ready, add this back
      <div
        data-testid="page-list-item-preview-text"
        className={styles.titleCellPreview}
      >
        {` · ${t['com.affine.tags.count']({ count: pageCount || 0 })}`}
      </div> */}
    </div>
  );
};

const ListIconCell = ({ color }: Pick<TagListItemProps, 'color'>) => {
  return (
    <div className={styles.tagIndicatorWrapper}>
      <div
        className={styles.tagIndicator}
        style={{
          backgroundColor: color,
        }}
      />
    </div>
  );
};

const TagCollapseCell = ({
  hasChildren,
  collapsed,
  onToggleCollapse,
}: Pick<
  TagListItemProps,
  'hasChildren' | 'collapsed' | 'onToggleCollapse'
>) => {
  if (!hasChildren) {
    return <div className={styles.collapseSpacer} />;
  }

  return (
    <button
      type="button"
      className={styles.collapseButton}
      onClick={e => {
        e.preventDefault();
        stopPropagation(e);
        onToggleCollapse?.();
      }}
    >
      <ToggleRightIcon
        className={styles.collapseIcon}
        data-collapsed={collapsed}
      />
    </button>
  );
};

const TagSelectionCell = ({
  selectable,
  onSelectedChange,
  selected,
}: Pick<TagListItemProps, 'selectable' | 'onSelectedChange' | 'selected'>) => {
  const onSelectionChange = useCallback(
    (_event: ChangeEvent<HTMLInputElement>) => {
      return onSelectedChange?.();
    },
    [onSelectedChange]
  );
  if (!selectable) {
    return null;
  }
  return (
    <div className={styles.selectionCell}>
      <Checkbox
        onClick={stopPropagation}
        checked={!!selected}
        onChange={onSelectionChange}
      />
    </div>
  );
};

const TagListOperationsCell = ({
  operations,
}: Pick<TagListItemProps, 'operations'>) => {
  return operations ? (
    <div onClick={stopPropagation} className={styles.operationsCell}>
      {operations}
    </div>
  ) : null;
};

export const TagListItem = (props: TagListItemProps) => {
  const tagService = useService(TagService);
  const { dragRef, CustomDragPreview, dragging } = useDraggable<AffineDNDData>(
    () => ({
      canDrag: props.draggable,
      data: {
        entity: {
          type: 'tag',
          id: props.tagId,
        },
        from: {
          at: 'all-tags:list',
        },
      },
    }),
    [props.draggable, props.tagId]
  );
  const handleDrop = useCallback(
    (data: DropTargetDropEvent<AffineDNDData>) => {
      if (applyTagParentDrop(tagService, props.tagId, data)) {
        track.$.navigationPanel.tags.drop({
          type: 'tag',
        });
      }
    },
    [props.tagId, tagService]
  );
  const { dropTargetRef, draggedOver } = useDropTarget<AffineDNDData>(
    () => ({
      data: {
        at: 'all-tags:tag',
      },
      onDrop: handleDrop,
      canDrop: tagItemCanDrop(tagService, props.tagId),
      dropEffect: tagItemDropEffect,
      allowExternal: true,
    }),
    [handleDrop, props.tagId, tagService]
  );
  const setRootRef = useCallback(
    (node: (HTMLAnchorElement & HTMLDivElement) | null) => {
      dragRef.current = node;
      dropTargetRef.current = node;
    },
    [dragRef, dropTargetRef]
  );

  return (
    <>
      <TagListItemWrapper
        onClick={props.onClick}
        to={props.to}
        tagId={props.tagId}
        draggable={props.draggable}
        isDragging={dragging}
        isDraggedOver={draggedOver}
        ref={setRootRef}
      >
        <ColWrapper flex={9}>
          <ColWrapper className={styles.dndCell} flex={8}>
            <div
              className={styles.titleIconsWrapper}
              style={{ paddingLeft: `${(props.depth ?? 0) * 20 + 5}px` }}
            >
              <TagCollapseCell
                hasChildren={props.hasChildren}
                collapsed={props.collapsed}
                onToggleCollapse={props.onToggleCollapse}
              />
              <TagSelectionCell
                onSelectedChange={props.onSelectedChange}
                selectable={props.selectable}
                selected={props.selected}
              />
              <ListIconCell color={props.color} />
            </div>
            <TagListTitleCell title={props.title} />
          </ColWrapper>
          <ColWrapper
            flex={4}
            alignment="end"
            style={{ overflow: 'visible' }}
          ></ColWrapper>
        </ColWrapper>
        {props.operations ? (
          <ColWrapper
            className={styles.actionsCellWrapper}
            flex={2}
            alignment="end"
          >
            <TagListOperationsCell operations={props.operations} />
          </ColWrapper>
        ) : null}
      </TagListItemWrapper>
      <CustomDragPreview position="pointer-outside">
        <div className={styles.dragPageItemOverlay}>
          <div className={styles.titleIconsWrapper}>
            <TagCollapseCell
              hasChildren={props.hasChildren}
              collapsed={props.collapsed}
              onToggleCollapse={props.onToggleCollapse}
            />
            <TagSelectionCell
              onSelectedChange={props.onSelectedChange}
              selectable={props.selectable}
              selected={props.selected}
            />
            <ListIconCell color={props.color} />
          </div>
          <TagListTitleCell title={props.title} />
        </div>
      </CustomDragPreview>
    </>
  );
};

type TagListWrapperProps = PropsWithChildren<
  Pick<TagListItemProps, 'to' | 'tagId' | 'onClick' | 'draggable'> & {
    isDragging: boolean;
    isDraggedOver: boolean;
  }
>;

const TagListItemWrapper = forwardRef(
  (
    {
      to,
      isDragging,
      isDraggedOver,
      tagId,
      onClick,
      children,
      draggable,
    }: TagListWrapperProps,
    ref: ForwardedRef<HTMLAnchorElement & HTMLDivElement>
  ) => {
    const [selectionState, setSelectionActive] = useAtom(selectionStateAtom);
    const handleClick = useCallback(
      (e: MouseEvent) => {
        if (!selectionState.selectable) {
          return;
        }
        if (e.shiftKey) {
          stopPropagation(e);
          setSelectionActive(true);
          onClick?.();
          return;
        }
        if (selectionState.selectionActive) {
          return onClick?.();
        }
      },
      [
        onClick,
        selectionState.selectable,
        selectionState.selectionActive,
        setSelectionActive,
      ]
    );

    const commonProps = useMemo(
      () => ({
        role: 'list-item',
        'data-testid': 'tag-list-item',
        'data-tag-id': tagId,
        'data-draggable': draggable,
        className: styles.root,
        'data-clickable': !!onClick || !!to,
        'data-dragging': isDragging,
        'data-dragged-over': isDraggedOver,
        onClick: handleClick,
      }),
      [tagId, draggable, isDragging, isDraggedOver, onClick, to, handleClick]
    );

    if (to) {
      return (
        <WorkbenchLink {...commonProps} to={to} ref={ref}>
          {children}
        </WorkbenchLink>
      );
    } else {
      return (
        <div {...commonProps} ref={ref}>
          {children}
        </div>
      );
    }
  }
);
TagListItemWrapper.displayName = 'TagListItemWrapper';
