import { Wrapper } from '@affine/component';
import { EmptyDocs } from '@affine/core/components/affine/empty';
import {
  createDocExplorerContext,
  DocExplorerContext,
} from '@affine/core/components/explorer/context';
import { DocsExplorer } from '@affine/core/components/explorer/docs-view/docs-list';
import { Page } from '@affine/core/mobile/components/page';
import { CollectionRulesService } from '@affine/core/modules/collection-rules';
import { getDescendantTagIds } from '@affine/core/modules/tag';
import { TagService, type Tag } from '@affine/core/modules/tag';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo, useState } from 'react';

import { TagDetailHeader } from './detail-header';

const TagDocs = ({ tag }: { tag: Tag }) => {
  const [explorerContextValue] = useState(() =>
    createDocExplorerContext({
      quickFavorite: true,
      displayProperties: [
        'system:createdAt',
        'system:updatedAt',
        'system:tags',
      ],
      view: 'masonry',
      showDragHandle: false,
      groupBy: undefined,
      orderBy: undefined,
    })
  );
  const collectionRulesService = useService(CollectionRulesService);
  const tagList = useService(TagService).tagList;
  const groups = useLiveData(explorerContextValue.groups$);
  const isEmpty =
    groups.length === 0 ||
    (groups.length && groups.every(group => !group.items.length));
  const tagMetas = useLiveData(tagList.tagMetas$);
  const tagFilterValue = useMemo(() => {
    if (!tag.id) return '';
    return [tag.id, ...getDescendantTagIds(tagMetas, tag.id)].join(',');
  }, [tag.id, tagMetas]);

  useEffect(() => {
    const subscription = collectionRulesService
      .watch({
        filters: [
          { type: 'system', key: 'trash', method: 'is', value: 'false' },
          {
            type: 'system',
            key: 'tags',
            method: 'include-any-of',
            value: tagFilterValue,
          },
        ],
        extraFilters: [
          { type: 'system', key: 'trash', method: 'is', value: 'false' },
          {
            type: 'system',
            key: 'empty-journal',
            method: 'is',
            value: 'false',
          },
        ],
        orderBy: {
          type: 'system',
          key: 'updatedAt',
          desc: true,
        },
      })
      .subscribe({
        next: result => {
          explorerContextValue.groups$.next(result.groups);
        },
        error: console.error,
      });
    return () => subscription.unsubscribe();
  }, [collectionRulesService, explorerContextValue.groups$, tagFilterValue]);

  if (isEmpty) {
    return (
      <>
        <EmptyDocs absoluteCenter tagId={tag.id} />
        <Wrapper height={0} flexGrow={1} />
      </>
    );
  }

  return (
    <DocExplorerContext.Provider value={explorerContextValue}>
      <DocsExplorer masonryItemWidthMin={150} />
    </DocExplorerContext.Provider>
  );
};

export const TagDetail = ({ tag }: { tag: Tag }) => {
  return (
    <Page header={<TagDetailHeader tag={tag} />} tab>
      <TagDocs tag={tag} />
    </Page>
  );
};
