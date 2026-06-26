import { NavigationPanelTreeRoot } from '@affine/core/desktop/components/navigation-panel';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import { buildTagTree, TagService } from '@affine/core/modules/tag';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AddTagIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { useCallback, useMemo, useState } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelTagNode } from '../../nodes/tag';
import { TagRenameDialog } from '../../nodes/tag/dialog';

export const TagDesc = ({ input }: { input: string }) => {
  const t = useI18n();

  return input
    ? t['com.affine.m.explorer.tag.new-tip-not-empty']({ value: input })
    : t['com.affine.m.explorer.tag.new-tip-empty']();
};

export const NavigationPanelTags = () => {
  const { tagService, navigationPanelService } = useServices({
    TagService,
    NavigationPanelService,
  });
  const path = useMemo(() => ['tags'], []);
  const tagMetas = useLiveData(tagService.tagList.tagMetas$);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);
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

  const handleNewTag = useCallback(
    (name: string, color: string) => {
      setShowNewTagDialog(false);
      tagService.tagList.createTag(name, color);
      track.$.navigationPanel.organize.createOrganizeItem({ type: 'tag' });
      navigationPanelService.setCollapsed(path, false);
    },
    [navigationPanelService, path, tagService]
  );

  return (
    <CollapsibleSection
      path={path}
      title={t['com.affine.rootAppSidebar.tags']()}
    >
      <NavigationPanelTreeRoot>
        {tagTree.map(tag => (
          <NavigationPanelTagNode
            key={tag.id}
            tagId={tag.id}
            parentPath={path}
            childTagIds={tag.children.map(child => child.id)}
            childTagIdsByParent={childTagIdsByParent}
          />
        ))}
        <AddItemPlaceholder
          icon={<AddTagIcon />}
          data-testid="navigation-panel-add-tag-button"
          onClick={() => setShowNewTagDialog(true)}
          label={t[
            'com.affine.rootAppSidebar.explorer.tag-section-add-tooltip'
          ]()}
        />
        <TagRenameDialog
          open={showNewTagDialog}
          onOpenChange={setShowNewTagDialog}
          onConfirm={handleNewTag}
          enableAnimation
          descRenderer={TagDesc}
        />
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};
