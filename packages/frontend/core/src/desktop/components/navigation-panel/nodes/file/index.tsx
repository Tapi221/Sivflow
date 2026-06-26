import { notify } from '@affine/component';
import {
  getFileNodeIcon,
  parseFileNodeMetadata,
} from '@affine/core/modules/organize/file';
import { PeekViewService } from '@affine/core/modules/peek-view';
import { WorkspaceService } from '@affine/core/modules/workspace';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { useI18n } from '@affine/i18n';
import { useServices } from '@toeverything/infra';
import { html } from 'lit';
import { useCallback, useMemo } from 'react';

import { NavigationPanelTreeNode } from '../../tree';
import type { GenericNavigationPanelNode } from '../types';

export const NavigationPanelFileNode = ({
  nodeId,
  data,
  location,
  reorderable,
  operations,
  onDrop,
  canDrop,
  dropEffect,
}: {
  nodeId: string;
  data: string;
} & GenericNavigationPanelNode) => {
  const { workspaceService, peekViewService } = useServices({
    WorkspaceService,
    PeekViewService,
  });
  const t = useI18n();
  const metadata = useMemo(() => parseFileNodeMetadata(data), [data]);
  const Icon = useMemo(
    () => getFileNodeIcon(metadata?.type ?? 'application/octet-stream'),
    [metadata?.type]
  );

  const dndData = useMemo(() => {
    return {
      draggable: {
        entity: {
          type: 'file',
          id: nodeId,
        },
        from: location,
      },
      dropTarget: {
        at: 'navigation-panel:organize:file',
      },
    } satisfies AffineDNDData;
  }, [location, nodeId]);

  const handleOpen = useCallback(async () => {
    if (!metadata) {
      return;
    }

    const blob = await workspaceService.workspace.docCollection.blobSync.get(
      metadata.sourceId
    );
    if (!blob) {
      notify.error({
        title: t['com.affine.rootAppSidebar.organize.folder.file-not-found'](),
      });
      return;
    }

    const url = URL.createObjectURL(
      blob.type ? blob : new Blob([blob], { type: metadata.type })
    );
    void peekViewService.peekView.open(
      {},
      html`<iframe
        src=${url}
        title=${metadata.name}
        style="width: 100%; height: 100%; border: 0;"
      ></iframe>`
    );
    window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
  }, [metadata, peekViewService, workspaceService]);

  if (!metadata) {
    return null;
  }

  return (
    <NavigationPanelTreeNode
      icon={Icon}
      name={metadata.name}
      dndData={dndData}
      onClick={handleOpen}
      collapsed
      setCollapsed={() => {}}
      collapsible={false}
      reorderable={reorderable}
      operations={operations}
      onDrop={onDrop}
      canDrop={canDrop}
      dropEffect={dropEffect}
      data-testid={`navigation-panel-file-${nodeId}`}
    />
  );
};
