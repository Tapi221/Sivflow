import { EmptyTags } from '@affine/core/components/affine/empty';
import {
  buildTagTree,
  flattenTagTree,
  TagService,
} from '@affine/core/modules/tag';
import { useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import { TagItem } from './item';
import { list } from './styles.css';

export const TagList = () => {
  const tagList = useService(TagService).tagList;
  const tags = useLiveData(tagList.tags$);
  const tagMetas = useLiveData(tagList.tagMetas$);
  const flattenedTagMetas = useMemo(
    () => flattenTagTree(buildTagTree(tagMetas)),
    [tagMetas]
  );
  const tagsById = useMemo(
    () => new Map(tags.map(tag => [tag.id, tag])),
    [tags]
  );

  if (!tags.length) {
    return <EmptyTags absoluteCenter />;
  }

  return (
    <ul className={list}>
      {flattenedTagMetas.map(tagMeta => {
        const tag = tagsById.get(tagMeta.id);
        if (!tag) {
          return null;
        }
        return <TagItem key={tag.id} tag={tag} depth={tagMeta.depth} />;
      })}
    </ul>
  );
};
