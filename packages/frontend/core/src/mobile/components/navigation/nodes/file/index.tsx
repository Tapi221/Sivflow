import { notify } from '@affine/component';
import type { NodeOperation } from '@affine/core/desktop/components/navigation-panel';
import {
  getFileNodeIcon,
  parseFileNodeMetadata,
} from '@affine/core/modules/organize/file';
import { PeekViewService } from '@affine/core/modules/peek-view';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { useServices } from '@toeverything/infra';
import { html } from 'lit';
import { useCallback, useMemo } from 'react';

import { NavigationPanelTreeNode } from '../../tree/node';

export const NavigationPanelFileNode = ({
  data,
  operations,
}: {
  data: string;
  operations?: NodeOperation[];
}) => {
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
      onClick={handleOpen}
      collapsed
      setCollapsed={() => {}}
      operations={operations}
    />
  );
};
