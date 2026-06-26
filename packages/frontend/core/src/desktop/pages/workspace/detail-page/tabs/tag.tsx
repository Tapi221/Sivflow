import { Checkbox, useDraggable, useDropTarget } from '@affine/component';
import type { DropTargetDropEvent } from '@affine/component';
import { DocsService } from '@affine/core/modules/doc';
import { TagService, buildTagTree, type TagTreeNode, applyTagParentDrop, tagItemCanDrop, tagItemDropEffect } from '@affine/core/modules/tag';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { track } from '@affine/track';
import { ArrowDownSmallIcon } from '@blocksuite/icons/rc';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useLiveData, useService } from '@toeverything/infra';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import { useCallback, useMemo, useState } from 'react';

import * as styles from './tag.css';

type RealTagNode = TagTreeNode<{
  id: string;
  name: string;
  color: string;
  createDate: number;
  updatedDate: number;
  parentId?: string;
}>;

const getAllDescendantIds = (node: RealTagNode): string[] => {
  const ids: string[] = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...getAllDescendantIds(child));
    }
  }
  return ids;
};

const TagTreeItem = ({
  node,
  level,
  docId,
}: {
  node: RealTagNode;
  level: number;
  docId: string;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const tagService = useService(TagService);
  const docsService = useService(DocsService);
  const tagRecord = useLiveData(tagService.tagList.tagByTagId$(node.id));
  const tagDocIds = useLiveData(tagRecord?.pageIds$);

  const { dragRef, CustomDragPreview, dragging } = useDraggable<AffineDNDData>(
    () => ({
      canDrag: true,
      data: {
        entity: {
          type: 'tag',
          id: node.id,
        },
        from: {
          at: 'detail-page:tags',
        },
      },
    }),
    [node.id]
  );

  const handleDrop = useCallback(
    (data: DropTargetDropEvent<AffineDNDData>) => {
      if (applyTagParentDrop(tagService, node.id, data)) {
        track.$.navigationPanel.tags.drop({
          type: 'tag',
        });
      }
    },
    [node.id, tagService]
  );

  const { dropTargetRef, draggedOver } = useDropTarget<AffineDNDData>(
    () => ({
      data: {
        at: 'all-tags:tag',
      },
      onDrop: handleDrop,
      canDrop: tagItemCanDrop(tagService, node.id),
      dropEffect: tagItemDropEffect,
      allowExternal: true,
    }),
    [handleDrop, node.id, tagService]
  );

  const setRootRef = useCallback(
    (el: HTMLDivElement | null) => {
      dragRef.current = el;
      dropTargetRef.current = el;
    },
    [dragRef, dropTargetRef]
  );

  const checked = useMemo(
    () => tagDocIds?.includes(docId) ?? false,
    [tagDocIds, docId]
  );

  const handleCheckedChange = useCallback(
    (_: any, newChecked: boolean) => {
      if (!tagRecord) return;
      if (newChecked) {
        const pageRecord = docsService.list.doc$(docId).value;
        if (pageRecord) {
          const currentTags = pageRecord.meta$.value.tags ?? [];
          const newTags = new Set(currentTags);
          
          const tagMetas = tagService.tagList.tagMetas$.value;
          let currentId: string | undefined = node.id;
          
          while (currentId) {
            newTags.add(currentId);
            const meta = tagMetas.find(t => t.id === currentId);
            currentId = meta?.parentId;
          }
          
          pageRecord.setMeta({ tags: Array.from(newTags) });
        }
      } else {
        const pageRecord = docsService.list.doc$(docId).value;
        if (pageRecord) {
          const currentTags = pageRecord.meta$.value.tags ?? [];
          const idsToRemove = new Set(getAllDescendantIds(node));
          const newTags = currentTags.filter(id => !idsToRemove.has(id));
          pageRecord.setMeta({ tags: newTags });
        }
      }
    },
    [docId, tagRecord, docsService, node, tagService]
  );

  const hasChildren = node.children && node.children.length > 0;

  return (
    <Collapsible.Root
      open={!collapsed}
      onOpenChange={open => setCollapsed(!open)}
      style={assignInlineVars({
        [styles.levelIndent]: `${level * 20}px`,
      })}
    >
      <div ref={setRootRef} className={styles.itemContainer} data-dragging={dragging} data-dragged-over={draggedOver}>
        <div
          className={styles.toggleIcon}
          onClick={() => hasChildren && setCollapsed(!collapsed)}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          <ArrowDownSmallIcon
            className={styles.collapsedIcon}
            data-collapsed={collapsed}
          />
        </div>
        <Checkbox
          checked={checked}
          onChange={handleCheckedChange}
          className={styles.checkbox}
          style={{ '--affine-blue-600': node.color } as React.CSSProperties}
        />
        <div
          className={styles.itemContent}
          onClick={() => handleCheckedChange(null as any, !checked)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <div 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: node.color 
            }} 
          />
          {node.name || 'Untitled'}
        </div>
      </div>
      <Collapsible.Content className={styles.childrenContainer}>
        {node.children?.map(child => (
          <TagTreeItem key={child.id} node={child} level={level + 1} docId={docId} />
        ))}
      </Collapsible.Content>
      <CustomDragPreview>
        <div style={{ padding: '4px 8px', background: 'var(--affine-background-primary-color)', border: '1px solid var(--affine-border-color)', borderRadius: '4px', fontSize: '12px' }}>
          {node.name || 'Untitled'}
        </div>
      </CustomDragPreview>
    </Collapsible.Root>
  );
};

export const EditorTagPanel = ({ docId }: { docId: string }) => {
  const tagService = useService(TagService);
  const tagMetas = useLiveData(tagService.tagList.tagMetas$);
  const tagTree = useMemo(() => buildTagTree(tagMetas), [tagMetas]);

  return (
    <div className={styles.root}>
      {tagTree.map(node => (
        <TagTreeItem key={node.id} node={node} level={0} docId={docId} />
      ))}
    </div>
  );
};
