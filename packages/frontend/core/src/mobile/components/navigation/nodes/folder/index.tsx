import {
  AnimatedFolderIcon,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  notify,
} from '@affine/component';
import { usePageHelper } from '@affine/core/blocksuite/block-suite-page-list/utils';
import type {
  NavigationPanelTreeNodeIcon,
  NodeOperation,
} from '@affine/core/desktop/components/navigation-panel';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { CompatibleFavoriteItemsAdapter } from '@affine/core/modules/favorite';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import {
  type FolderNode,
  type FileNodeMetadata,
  OrganizeService,
} from '@affine/core/modules/organize';
import {
  getFileNodeIcon,
  ORGANIZE_MAX_FILE_SIZE,
} from '@affine/core/modules/organize/file';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { formatSize } from '@blocksuite/affine-shared/utils';
import {
  DeleteIcon,
  FolderIcon,
  LayerIcon,
  PageIcon,
  PlusIcon,
  RemoveFolderIcon,
  TagsIcon,
} from '@blocksuite/icons/rc';
import {
  generateFractionalIndexingKeyBetween,
  useLiveData,
  useService,
  useServices,
} from '@toeverything/infra';
import { difference } from 'lodash-es';
import { useCallback, useMemo, useRef, type ChangeEvent } from 'react';

import { NavigationPanelTreeNode } from '../../tree/node';
import { NavigationPanelCollectionNode } from '../collection';
import { NavigationPanelDocNode } from '../doc';
import { NavigationPanelFileNode } from '../file';
import { NavigationPanelTagNode } from '../tag';
import { FolderCreateTip, FolderRenameSubMenu } from './dialog';
import { FavoriteFolderOperation } from './operations';

type FolderLinkType = 'doc' | 'tag' | 'collection' | 'file';

const isFolderLinkType = (type?: string): type is FolderLinkType =>
  type === 'doc' || type === 'tag' || type === 'collection' || type === 'file';

const isPDFFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export const NavigationPanelFolderNode = ({
  nodeId,
  operations,
  parentPath,
}: {
  nodeId: string;
  operations?:
    | NodeOperation[]
    | ((type: string, node: FolderNode) => NodeOperation[]);
  parentPath: string[];
}) => {
  const { organizeService } = useServices({
    OrganizeService,
  });
  const node = useLiveData(organizeService.folderTree.folderNode$(nodeId));
  const type = useLiveData(node?.type$);
  const data = useLiveData(node?.data$);

  const additionalOperations = useMemo(() => {
    if (!type || !node) {
      return;
    }
    if (typeof operations === 'function') {
      return operations(type, node);
    }
    return operations;
  }, [node, operations, type]);

  if (!node) {
    return;
  }

  if (type === 'folder') {
    return (
      <NavigationPanelFolderNodeFolder
        node={node}
        operations={additionalOperations}
        parentPath={parentPath}
      />
    );
  }
  if (!data) return null;
  if (type === 'doc') {
    return (
      <NavigationPanelDocNode
        docId={data}
        operations={additionalOperations}
        parentPath={parentPath}
      />
    );
  } else if (type === 'collection') {
    return (
      <NavigationPanelCollectionNode
        collectionId={data}
        operations={additionalOperations}
        parentPath={parentPath}
      />
    );
  } else if (type === 'tag') {
    return (
      <NavigationPanelTagNode
        tagId={data}
        operations={additionalOperations}
        parentPath={parentPath}
      />
    );
  } else if (type === 'file') {
    return (
      <NavigationPanelFileNode data={data} operations={additionalOperations} />
    );
  }

  return;
};

const NavigationPanelFolderIcon: NavigationPanelTreeNodeIcon = ({
  collapsed,
  className,
  draggedOver,
  treeInstruction,
}) => (
  <AnimatedFolderIcon
    className={className}
    open={
      !collapsed || (!!draggedOver && treeInstruction?.type === 'make-child')
    }
  />
);

const NavigationPanelFolderNodeFolder = ({
  node,
  operations: additionalOperations,
  parentPath,
}: {
  node: FolderNode;
  operations?: NodeOperation[];
  parentPath: string[];
}) => {
  const t = useI18n();
  const { workspaceService, featureFlagService, workspaceDialogService } =
    useServices({
      WorkspaceService,
      CompatibleFavoriteItemsAdapter,
      FeatureFlagService,
      WorkspaceDialogService,
    });
  const name = useLiveData(node.name$);
  const enableEmojiIcon = useLiveData(
    featureFlagService.flags.enable_emoji_folder_icon.$
  );
  const navigationPanelService = useService(NavigationPanelService);
  const path = useMemo(
    () => [...parentPath, `folder-${node.id}`],
    [parentPath, node.id]
  );
  const collapsed = useLiveData(navigationPanelService.collapsed$(path));
  const setCollapsed = useCallback(
    (value: boolean) => {
      navigationPanelService.setCollapsed(path, value);
    },
    [navigationPanelService, path]
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createPage } = usePageHelper(
    workspaceService.workspace.docCollection
  );
  const handleDelete = useCallback(() => {
    node.delete();
    track.$.navigationPanel.organize.deleteOrganizeItem({
      type: 'folder',
    });
    notify.success({
      title: t['com.affine.rootAppSidebar.organize.delete.notify-title']({
        name,
      }),
      message: t['com.affine.rootAppSidebar.organize.delete.notify-message'](),
    });
  }, [name, node, t]);

  const children = useLiveData(node.sortedChildren$);

  const handleRename = useCallback(
    (newName: string) => {
      node.rename(newName);
    },
    [node]
  );

  const handleNewDoc = useCallback(() => {
    const newDoc = createPage('page');
    node.createLink('doc', newDoc.id, node.indexAt('before'));
    track.$.navigationPanel.folders.createDoc();
    track.$.navigationPanel.organize.createOrganizeItem({
      type: 'link',
      target: 'doc',
    });
    setCollapsed(false);
  }, [createPage, node, setCollapsed]);

  const handleCreateSubfolder = useCallback(
    (name: string) => {
      node.createFolder(name, node.indexAt('before'));
      track.$.navigationPanel.organize.createOrganizeItem({ type: 'folder' });
      setCollapsed(false);
    },
    [node, setCollapsed]
  );

  const handleAddToFolder = useCallback(
    (type: 'doc' | 'collection' | 'tag') => {
      const initialIds = children
        .filter(node => node.type$.value === type)
        .map(node => node.data$.value)
        .filter(Boolean) as string[];
      const selector =
        type === 'doc'
          ? 'doc-selector'
          : type === 'collection'
            ? 'collection-selector'
            : 'tag-selector';
      workspaceDialogService.open(
        selector,
        {
          init: initialIds,
        },
        selectedIds => {
          if (selectedIds === undefined) {
            return;
          }
          const newItemIds = difference(selectedIds, initialIds);
          const removedItemIds = difference(initialIds, selectedIds);
          const removedItems = children.filter(
            node =>
              !!node.data$.value && removedItemIds.includes(node.data$.value)
          );

          newItemIds.forEach(id => {
            node.createLink(type, id, node.indexAt('after'));
          });
          removedItems.forEach(node => node.delete());
          const updated = newItemIds.length + removedItems.length;
          updated && setCollapsed(false);
        }
      );
      track.$.navigationPanel.organize.createOrganizeItem({
        type: 'link',
        target: type,
      });
    },
    [children, node, setCollapsed, workspaceDialogService]
  );

  const handleAddPDFs = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOverFileSize = useCallback(() => {
    notify.error({
      title: t['com.affine.rootAppSidebar.organize.folder.file-too-large']({
        size: formatSize(ORGANIZE_MAX_FILE_SIZE) ?? '0 B',
      }),
    });
    workspaceDialogService.open('setting', {
      activeTab: 'plans',
      scrollAnchor: 'cloudPricingPlan',
    });
    track.$.paywall.storage.viewPlans();
  }, [t, workspaceDialogService]);

  const handlePDFInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []).filter(isPDFFile);
      event.target.value = '';

      if (files.some(file => file.size > ORGANIZE_MAX_FILE_SIZE)) {
        handleOverFileSize();
        return;
      }

      let nextIndex = node.indexAt('after');
      for (const file of files) {
        const sourceId =
          await workspaceService.workspace.docCollection.blobSync.set(file);
        const metadata: FileNodeMetadata = {
          sourceId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
        };
        node.createLink('file', JSON.stringify(metadata), nextIndex);
        nextIndex = generateFractionalIndexingKeyBetween(nextIndex, null);
      }

      if (files.length > 0) {
        track.$.navigationPanel.organize.createOrganizeItem({
          type: 'link',
          target: 'file',
        });
        setCollapsed(false);
      }
    },
    [handleOverFileSize, node, setCollapsed, workspaceService]
  );

  const createSubTipRenderer = useCallback(
    ({ input }: { input: string }) => {
      return <FolderCreateTip input={input} parentName={name} />;
    },
    [name]
  );

  const PDFIcon = useMemo(() => getFileNodeIcon('application/pdf'), []);

  const folderOperations = useMemo(() => {
    return [
      {
        index: 0,
        inline: true,
        view: (
          <Menu
            items={
              <>
                <MenuItem prefixIcon={<PageIcon />} onClick={handleNewDoc}>
                  {t['com.affine.cmdk.affine.new-page']()}
                </MenuItem>
                <MenuItem
                  prefixIcon={<PageIcon />}
                  onClick={() => handleAddToFolder('doc')}
                >
                  {t[
                    'com.affine.rootAppSidebar.organize.folder.add-existing-pages'
                  ]()}
                </MenuItem>
                <MenuItem prefixIcon={<PDFIcon />} onClick={handleAddPDFs}>
                  {t['com.affine.rootAppSidebar.organize.folder.add-pdfs']()}
                </MenuItem>
                <MenuItem
                  onClick={() => handleAddToFolder('tag')}
                  prefixIcon={<TagsIcon />}
                >
                  {t['com.affine.rootAppSidebar.organize.folder.add-tags']()}
                </MenuItem>
                <MenuItem
                  onClick={() => handleAddToFolder('collection')}
                  prefixIcon={<LayerIcon />}
                >
                  {t[
                    'com.affine.rootAppSidebar.organize.folder.add-collections'
                  ]()}
                </MenuItem>
                <FolderRenameSubMenu
                  text={t[
                    'com.affine.rootAppSidebar.organize.folder.create-subfolder'
                  ]()}
                  title={t[
                    'com.affine.rootAppSidebar.organize.folder.create-subfolder'
                  ]()}
                  onConfirm={handleCreateSubfolder}
                  descRenderer={createSubTipRenderer}
                  icon={<FolderIcon />}
                  menuProps={{
                    triggerOptions: { 'data-testid': 'create-subfolder' },
                  }}
                />
              </>
            }
          >
            <IconButton
              size="16"
            >
              <PlusIcon />
            </IconButton>
          </Menu>
        ),
      },
      {
        index: 98,
        view: (
          <FolderRenameSubMenu
            initialName={name}
            onConfirm={handleRename}
            menuProps={{
              triggerOptions: { 'data-testid': 'rename-folder' },
            }}
          />
        ),
      },
      {
        index: 99,
        view: <MenuSeparator />,
      },
      {
        index: 200,
        view: node.id ? <FavoriteFolderOperation id={node.id} /> : null,
      },

      {
        index: 9999,
        view: <MenuSeparator key="menu-separator" />,
      },
      {
        index: 10000,
        view: (
          <MenuItem
            type={'danger'}
            prefixIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            {t['com.affine.rootAppSidebar.organize.delete']()}
          </MenuItem>
        ),
      },
    ];
  }, [
    PDFIcon,
    createSubTipRenderer,
    handleAddToFolder,
    handleAddPDFs,
    handleCreateSubfolder,
    handleDelete,
    handleNewDoc,
    handleRename,
    name,
    node.id,
    t,
  ]);

  const finalOperations = useMemo(() => {
    if (additionalOperations) {
      return [...additionalOperations, ...folderOperations];
    }
    return folderOperations;
  }, [additionalOperations, folderOperations]);

  const childrenOperations = useCallback(
    (type: string, node: FolderNode) => {
      if (isFolderLinkType(type)) {
        return [
          {
            index: 999,
            view: (
              <MenuItem
                type={'danger'}
                prefixIcon={<RemoveFolderIcon />}
                data-event-props="$.navigationPanel.organize.deleteOrganizeItem"
                data-event-args-type={node.type$.value}
                onClick={() => node.delete()}
              >
                {t['com.affine.rootAppSidebar.organize.delete-from-folder']()}
              </MenuItem>
            ),
          },
        ] satisfies NodeOperation[];
      }
      return [];
    },
    [t]
  );

  const handleCollapsedChange = useCallback(
    (collapsed: boolean) => {
      if (collapsed) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    },
    [setCollapsed]
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        style={{ display: 'none' }}
        aria-hidden
        tabIndex={-1}
        onChange={handlePDFInputChange}
      />
      <NavigationPanelTreeNode
        icon={NavigationPanelFolderIcon}
        name={name}
        extractEmojiAsIcon={enableEmojiIcon}
        collapsed={collapsed}
        setCollapsed={handleCollapsedChange}
        operations={finalOperations}
        data-testid={`navigation-panel-folder-${node.id}`}
        aria-label={name}
        data-role="navigation-panel-folder"
      >
        {children.map(child => (
          <NavigationPanelFolderNode
            key={child.id}
            nodeId={child.id as string}
            operations={childrenOperations}
            parentPath={path}
          />
        ))}
      </NavigationPanelTreeNode>
    </>
  );
};
