import type { DocsPropertiesMeta } from '@blocksuite/affine/store';
import {
  LiveData,
  Store,
  yjsGetPath,
  yjsObserveDeep,
  yjsObservePath,
} from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { map, switchMap } from 'rxjs';
import { Array as YArray } from 'yjs';

import type { WorkspaceService } from '../../workspace';

export type Tag = {
  value: string;
  id: string;
  color: string;
  createDate?: number | Date | undefined;
  updateDate?: number | Date | undefined;
  parentId?: string | undefined;
};

export class TagStore extends Store {
  get properties() {
    return this.workspaceService.workspace.docCollection.meta.properties;
  }

  tagOptions$ = LiveData.from(
    yjsGetPath(
      this.workspaceService.workspace.rootYDoc.getMap('meta'),
      'properties.tags.options'
    ).pipe(
      switchMap(yjsObserveDeep),
      map(tagOptions => {
        if (tagOptions instanceof YArray) {
          return tagOptions.toJSON();
        } else {
          return [];
        }
      })
    ),
    []
  );

  subscribe(cb: () => void) {
    const disposable =
      this.workspaceService.workspace.docCollection.slots.docListUpdated.subscribe(
        cb
      );
    return disposable.unsubscribe.bind(disposable);
  }

  constructor(private readonly workspaceService: WorkspaceService) {
    super();
  }

  private get currentTagOptions() {
    return this.tagOptions$.value as Tag[];
  }

  watchTagIds() {
    return this.tagOptions$.map(tags => tags.map(tag => tag.id)).asObservable();
  }

  private isDescendant(tagId: string, maybeDescendantId: string) {
    const tagMap = new Map(this.currentTagOptions.map(tag => [tag.id, tag]));
    let current = tagMap.get(maybeDescendantId);
    const visited = new Set<string>();

    while (current?.parentId) {
      if (current.parentId === tagId) {
        return true;
      }
      if (visited.has(current.parentId)) {
        return false;
      }
      visited.add(current.parentId);
      current = tagMap.get(current.parentId);
    }

    return false;
  }

  private normalizeParentId(id: string, parentId?: string) {
    if (!parentId) {
      return undefined;
    }
    if (parentId === id || this.isDescendant(id, parentId)) {
      return undefined;
    }
    return this.currentTagOptions.some(tag => tag.id === parentId)
      ? parentId
      : undefined;
  }

  createNewTag(value: string, color: string, parentId?: string) {
    const newId = nanoid();
    const normalizedParentId = this.normalizeParentId(newId, parentId);
    this.updateTagOptions([
      ...this.currentTagOptions,
      {
        id: newId,
        value,
        color,
        createDate: Date.now(),
        updateDate: Date.now(),
        parentId: normalizedParentId,
      },
    ]);
    return newId;
  }

  updateProperties = (properties: DocsPropertiesMeta) => {
    this.workspaceService.workspace.docCollection.meta.setProperties(
      properties
    );
  };

  updateTagOptions = (options: Tag[]) => {
    this.updateProperties({
      ...this.properties,
      tags: {
        options,
      },
    });
  };

  updateTagOption = (id: string, option: Tag) => {
    this.updateTagOptions(
      this.tagOptions$.value.map(o => (o.id === id ? option : o))
    );
  };

  removeTagOption = (id: string) => {
    this.workspaceService.workspace.docCollection.doc.transact(() => {
      const tag = this.currentTagOptions.find(o => o.id === id);
      this.updateTagOptions(
        this.currentTagOptions
          .filter(o => o.id !== id)
          .map(o =>
            o.parentId === id
              ? {
                  ...o,
                  parentId: tag?.parentId,
                  updateDate: Date.now(),
                }
              : o
          )
      );
      // need to remove tag from all pages
      this.workspaceService.workspace.docCollection.docs.forEach(doc => {
        const tags = doc.meta?.tags ?? [];
        if (tags.includes(id)) {
          this.updatePageTags(
            doc.id,
            tags.filter(t => t !== id)
          );
        }
      });
    });
  };

  updatePageTags = (pageId: string, tags: string[]) => {
    this.workspaceService.workspace.docCollection.meta.setDocMeta(pageId, {
      tags,
    });
  };

  deleteTag(id: string) {
    this.removeTagOption(id);
  }

  watchTagInfo(id: string) {
    return this.tagOptions$.map(
      tags => tags.find(tag => tag.id === id) as Tag | undefined
    );
  }

  updateTagInfo(id: string, tagInfo: Partial<Tag>) {
    const tag = this.currentTagOptions.find(tag => tag.id === id);
    if (!tag) {
      return;
    }
    const nextParentId =
      'parentId' in tagInfo
        ? this.normalizeParentId(id, tagInfo.parentId)
        : tag.parentId;

    this.updateTagOption(id, {
      id: id,
      value: tag.value,
      color: tag.color,
      createDate: tag.createDate,
      updateDate: Date.now(),
      ...tagInfo,
      parentId: nextParentId,
    });
  }

  updateTagParent(id: string, parentId?: string) {
    if (
      parentId &&
      (parentId === id ||
        this.isDescendant(id, parentId) ||
        !this.currentTagOptions.some(tag => tag.id === parentId))
    ) {
      return false;
    }
    this.updateTagInfo(id, { parentId });
    return true;
  }

  watchTagPageIds(id: string) {
    return yjsGetPath(
      this.workspaceService.workspace.rootYDoc.getMap('meta'),
      'pages'
    ).pipe(
      switchMap(pages => {
        return yjsObservePath(pages, '*.tags');
      }),
      map(meta => {
        if (meta instanceof YArray) {
          return meta
            .map(v => {
              const tags = v.get('tags') as YArray<string> | undefined;
              if (tags instanceof YArray) {
                for (const tagId of tags.toArray()) {
                  if (tagId === id) {
                    return v.get('id') as string;
                  }
                }
              }
              return null;
            })
            .filter(Boolean) as string[];
        } else {
          return [];
        }
      })
    );
  }
}
