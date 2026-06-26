import type {
  DropTargetDropEvent,
  DropTargetOptions,
  DropTargetTreeInstruction,
} from '@affine/component';
import type { AffineDNDData } from '@affine/core/types/dnd';

import type { Tag } from './entities/tag';
import type { TagService } from './service/tag';

type TagDropEntity = NonNullable<AffineDNDData['draggable']['entity']>;
type TagDropData = {
  source: { data: AffineDNDData['draggable'] };
  treeInstruction?: DropTargetTreeInstruction | null;
};

export type TagDropEffectData = TagDropData;

export const isTagDropEntity = (
  entity: TagDropEntity | undefined
): entity is Extract<TagDropEntity, { type: 'tag' }> => {
  return entity?.type === 'tag';
};

export const isDocDropEntity = (
  entity: TagDropEntity | undefined
): entity is Extract<TagDropEntity, { type: 'doc' }> => {
  return entity?.type === 'doc';
};

const canDropDocOnTag = (
  tagService: TagService,
  docId: string,
  targetTagId: string
) => {
  return !tagService.tagList.tagIdsByPageId$(docId).value.includes(targetTagId);
};

const isMakeChildDrop = (
  data: DropTargetDropEvent<AffineDNDData> | TagDropData
) => {
  return data.treeInstruction?.type === 'make-child';
};

export const canDropTagAsChild = (
  tagService: TagService,
  sourceTagId: string,
  targetTagId: string
) => {
  return (
    sourceTagId !== targetTagId &&
    !tagService.tagList.getDescendantTagIds(sourceTagId).includes(targetTagId)
  );
};

export const tagNodeCanDrop = (
  tagService: TagService,
  targetTagId: string,
  fallbackCanDrop?: DropTargetOptions<AffineDNDData>['canDrop']
): DropTargetOptions<AffineDNDData>['canDrop'] => {
  return args => {
    if (!isMakeChildDrop(args)) {
      return (
        (typeof fallbackCanDrop === 'function'
          ? fallbackCanDrop(args)
          : fallbackCanDrop) ?? true
      );
    }

    const entity = args.source.data.entity;
    if (isDocDropEntity(entity)) {
      return canDropDocOnTag(tagService, entity.id, targetTagId);
    }
    if (isTagDropEntity(entity)) {
      return canDropTagAsChild(tagService, entity.id, targetTagId);
    }
    return false;
  };
};

export const tagChildAreaCanDrop = (
  tagService: TagService,
  targetTagId: string
): DropTargetOptions<AffineDNDData>['canDrop'] => {
  return args => {
    const entity = args.source.data.entity;
    if (isDocDropEntity(entity)) {
      return canDropDocOnTag(tagService, entity.id, targetTagId);
    }
    if (isTagDropEntity(entity)) {
      return canDropTagAsChild(tagService, entity.id, targetTagId);
    }
    return false;
  };
};

export const tagItemCanDrop = (
  tagService: TagService,
  targetTagId: string
): DropTargetOptions<AffineDNDData>['canDrop'] => {
  return args => {
    const entity = args.source.data.entity;
    return isTagDropEntity(entity)
      ? canDropTagAsChild(tagService, entity.id, targetTagId)
      : false;
  };
};

export const tagRootCanDrop = (
  tagService: TagService,
  options?: {
    ignoreTargetSelector?: string;
  }
): DropTargetOptions<AffineDNDData>['canDrop'] => {
  return args => {
    if (options?.ignoreTargetSelector) {
      const element = document.elementFromPoint(
        args.input.clientX,
        args.input.clientY
      );
      if (element?.closest(options.ignoreTargetSelector)) {
        return false;
      }
    }

    const entity = args.source.data.entity;
    if (!isTagDropEntity(entity)) {
      return false;
    }

    return tagService.tagList.tagMetas$.value.some(
      tag => tag.id === entity.id && !!tag.parentId
    );
  };
};

export const tagNodeDropEffect = (data: TagDropEffectData) => {
  if (!isMakeChildDrop(data)) {
    return;
  }

  const entity = data.source.data.entity;
  if (isDocDropEntity(entity)) {
    return 'link';
  }
  if (isTagDropEntity(entity)) {
    return 'move';
  }
  return;
};

export const tagItemDropEffect: DropTargetOptions<AffineDNDData>['dropEffect'] =
  () => 'move';

export const tagRootDropEffect = tagItemDropEffect;

export const applyTagChildDrop = (
  targetTag: Tag,
  tagService: TagService,
  data: DropTargetDropEvent<AffineDNDData>
) => {
  const entity = data.source.data.entity;
  if (isDocDropEntity(entity)) {
    if (!canDropDocOnTag(tagService, entity.id, targetTag.id)) {
      return;
    }
    targetTag.tag(entity.id);
    return 'doc';
  }
  if (isTagDropEntity(entity)) {
    const sourceTag = tagService.tagList.tagByTagId$(entity.id).value;
    return sourceTag?.moveToParent(targetTag.id) ? 'tag' : undefined;
  }
  return;
};

export const applyTagRootDrop = (
  tagService: TagService,
  data: DropTargetDropEvent<AffineDNDData>
) => {
  const entity = data.source.data.entity;
  if (!isTagDropEntity(entity)) {
    return false;
  }

  return tagService.tagList.tagByTagId$(entity.id).value?.moveToParent();
};

export const applyTagParentDrop = (
  tagService: TagService,
  targetTagId: string,
  data: DropTargetDropEvent<AffineDNDData>
) => {
  const entity = data.source.data.entity;
  if (!isTagDropEntity(entity)) {
    return false;
  }

  return tagService.tagList
    .tagByTagId$(entity.id)
    .value?.moveToParent(targetTagId);
};
