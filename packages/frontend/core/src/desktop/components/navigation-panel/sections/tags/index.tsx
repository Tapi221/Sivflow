import { type DropTargetDropEvent, IconButton } from '@affine/component';
import { RenameModal } from '@affine/component/rename-modal';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import {
  applyTagRootDrop,
  buildTagTree,
  tagRootCanDrop,
  TagService,
} from '@affine/core/modules/tag';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AddTagIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelTagNode } from '../../nodes/tag';
import { NavigationPanelTreeRoot } from '../../tree';
import { RootEmpty } from './empty';
import * as styles from './styles.css';

export const NavigationPanelTags = () => {
  const { tagService, navigationPanelService } = useServices({
    TagService,
    NavigationPanelService,
  });
  const path = useMemo(() => ['tags'], []);
  const collapsed = useLiveData(navigationPanelService.collapsed$(path));
  const [creating, setCreating] = useState(false);
  const tagMetas = useLiveData(tagService.tagList.tagMetas$);
  const tagTree = useMemo(() => buildTagTree(tagMetas), [tagMetas]);
  const childTagIdsByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tag of tagMetas) {
      if (!tag.parentId) continue;
      map.set(tag.parentId, [...(map.get(tag.parentId) ?? []), tag.id]);
    }
    return map;
  }, [tagMetas]);

  const t = useI18n();

  const handleCreateNewTag = useCallback(
    (name: string) => {
      tagService.tagList.createTag(name, tagService.randomTagColor());
      track.$.navigationPanel.organize.createOrganizeItem({ type: 'tag' });
      navigationPanelService.setCollapsed(path, false);
    },
    [navigationPanelService, path, tagService]
  );

  useEffect(() => {
    if (collapsed) setCreating(false);
  }, [collapsed]);

  const handleOpenCreateModal = useCallback(() => {
    setCreating(true);
  }, []);
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
  const rootDropTarget = useMemo(
    () => ({
      data: {
        at: 'navigation-panel:tags:root' as const,
      },
      onDrop: handleDropOnRoot,
      canDrop: tagRootCanDrop(tagService),
      dropEffect: () => 'move' as const,
    }),
    [handleDropOnRoot, tagService]
  );

  return (
    <CollapsibleSection
      path={path}
      testId="navigation-panel-tags"
      headerClassName={styles.draggedOverHighlight}
      title={t['com.affine.rootAppSidebar.tags']()}
      collapsible={false}
      actions={
        <div className={styles.iconContainer}>
          <IconButton
            data-testid="navigation-panel-bar-add-tag-button"
            onClick={handleOpenCreateModal}
            size="16"
            tooltip={t[
              'com.affine.rootAppSidebar.explorer.tag-section-add-tooltip'
            ]()}
          >
            <AddTagIcon />
          </IconButton>
          {creating && (
            <RenameModal
              open
              onOpenChange={setCreating}
              onRename={handleCreateNewTag}
              currentName={t['com.affine.rootAppSidebar.tags.new-tag']()}
            />
          )}
        </div>
      }
    >
      <NavigationPanelTreeRoot
        placeholder={<RootEmpty />}
        rootDropTarget={rootDropTarget}
      >
        {tagTree.map(tag => (
          <NavigationPanelTagNode
            key={tag.id}
            tagId={tag.id}
            childTagIds={tag.children.map(child => child.id)}
            childTagIdsByParent={childTagIdsByParent}
            reorderable={false}
            location={{
              at: 'navigation-panel:tags:list',
            }}
            parentPath={path}
          />
        ))}
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};
