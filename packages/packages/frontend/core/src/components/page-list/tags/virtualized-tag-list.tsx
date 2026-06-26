import { type DropTargetDropEvent, useDropTarget } from '@affine/component';
import {
  applyTagRootDrop,
  buildTagTree,
  flattenTagTree,
  type Tag,
  tagRootCanDrop,
  tagRootDropEffect,
  TagService,
} from '@affine/core/modules/tag';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { track } from '@affine/track';
import { Trans } from '@affine/i18n';
import { useServices } from '@toeverything/infra';
import * as React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { ListFloatingToolbar } from '../components/list-floating-toolbar';
import { tagHeaderColsDef } from '../header-col-def';
import { TagOperationCell } from '../operation-cell';
import { TagListItemRenderer } from '../page-group';
import { ListTableHeader } from '../page-header';
import type { ItemListHandle, ListItem, TagMeta } from '../types';
import { VirtualizedList } from '../virtualized-list';
import { CreateOrEditTag } from './create-tag';
import { TagListHeader } from './tag-list-header';
import * as styles from './virtualized-tag-list.css';

export const VirtualizedTagList = ({
  tags,
  tagMetas,
  onTagDelete,
}: {
  tags: Tag[];
  tagMetas: TagMeta[];
  onTagDelete: (tagIds: string[]) => void;
}) => {
  const listRef = useRef<ItemListHandle>(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [showCreateTagInput, setShowCreateTagInput] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [collapsedTagIds, setCollapsedTagIds] = useState<Set<string>>(
    () => new Set()
  );
  const { tagService, workspaceService } = useServices({
    TagService,
    WorkspaceService,
  });
  const currentWorkspace = workspaceService.workspace;

  const tagOperations = useCallback(
    (tag: TagMeta) => {
      return <TagOperationCell tag={tag} onTagDelete={onTagDelete} />;
    },
    [onTagDelete]
  );

  const filteredSelectedTagIds = useMemo(() => {
    const ids = new Set(tags.map(tag => tag.id));
    return selectedTagIds.filter(id => ids.has(id));
  }, [selectedTagIds, tags]);

  const flattenedTagMetas = useMemo(
    () =>
      flattenTagTree(buildTagTree(tagMetas), 0, collapsedTagIds).map(tag => ({
        ...tag,
        onToggleCollapse: tag.hasChildren
          ? () => {
              setCollapsedTagIds(prev => {
                const next = new Set(prev);
                if (next.has(tag.id)) {
                  next.delete(tag.id);
                } else {
                  next.add(tag.id);
                }
                return next;
              });
            }
          : undefined,
      })),
    [collapsedTagIds, tagMetas]
  );

  const hideFloatingToolbar = useCallback(() => {
    listRef.current?.toggleSelectable();
  }, []);

  const tagOperationRenderer = useCallback(
    (item: ListItem) => {
      const tag = item as TagMeta;
      return tagOperations(tag);
    },
    [tagOperations]
  );

  const tagHeaderRenderer = useCallback(() => {
    return (
      <>
        <ListTableHeader headerCols={tagHeaderColsDef} />
        <CreateOrEditTag
          open={showCreateTagInput}
          onOpenChange={setShowCreateTagInput}
        />
      </>
    );
  }, [showCreateTagInput]);

  const tagItemRenderer = useCallback((item: ListItem) => {
    return <TagListItemRenderer {...item} />;
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedTagIds.length === 0) {
      return;
    }
    onTagDelete(selectedTagIds);
    hideFloatingToolbar();
    return;
  }, [hideFloatingToolbar, onTagDelete, selectedTagIds]);

  const onOpenCreate = useCallback(() => {
    setShowCreateTagInput(true);
  }, [setShowCreateTagInput]);
  const handleDropOnRoot = useCallback(
    (data: DropTargetDropEvent<AffineDNDData>) => {
      if (applyTagRootDrop(tagService, data)) {
        track.$.navigationPanel.tags.drop({
          type: 'tag',
        });
      }
    },
    [tagService]
  );
  const { dropTargetRef, draggedOver } = useDropTarget<AffineDNDData>(
    () => ({
      data: {
        at: 'all-tags:root',
      },
      onDrop: handleDropOnRoot,
      canDrop: tagRootCanDrop(tagService, {
        ignoreTargetSelector: '[data-testid="tag-list-item"]',
      }),
      dropEffect: tagRootDropEffect,
      allowExternal: true,
    }),
    [handleDropOnRoot, tagService]
  );

  return (
    <div
      ref={dropTargetRef}
      className={styles.rootDropTarget}
      data-dragged-over={draggedOver}
    >
      <VirtualizedList
        ref={listRef}
        selectable="toggle"
        draggable={true}
        atTopThreshold={80}
        onSelectionActiveChange={setShowFloatingToolbar}
        heading={<TagListHeader onOpen={onOpenCreate} />}
        selectedIds={filteredSelectedTagIds}
        onSelectedIdsChange={setSelectedTagIds}
        items={flattenedTagMetas}
        itemRenderer={tagItemRenderer}
        rowAsLink
        docCollection={currentWorkspace.docCollection}
        operationsRenderer={tagOperationRenderer}
        headerRenderer={tagHeaderRenderer}
      />
      <ListFloatingToolbar
        open={showFloatingToolbar}
        content={
          <Trans
            i18nKey="com.affine.tag.toolbar.selected"
            count={selectedTagIds.length}
          >
            <div style={{ color: 'var(--affine-text-secondary-color)' }}>
              {{ count: selectedTagIds.length } as any}
            </div>
            selected
          </Trans>
        }
        onClose={hideFloatingToolbar}
        onDelete={handleDelete}
      />
    </div>
  );
};
