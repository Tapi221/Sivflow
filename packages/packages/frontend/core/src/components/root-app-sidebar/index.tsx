import { IconButton } from '@affine/component';
import {
  AddPageButton,
  AppDownloadButton,
  AppSidebar,
  QuickSearchInput,
  SidebarContainer,
  SidebarScrollableContainer,
  MenuItem,
} from '@affine/core/modules/app-sidebar/views';

import { AuthService, ServerService } from '@affine/core/modules/cloud';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { JournalService } from '@affine/core/modules/journal';
import { CMDKQuickSearchService } from '@affine/core/modules/quicksearch/services/cmdk';
import type { Workspace } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import type { Store } from '@blocksuite/affine/store';
import {
  AiOutlineIcon,
  FavoriteIcon,
  FolderIcon,
  ImportIcon,
  SettingsIcon,
  TagIcon,
  ViewLayersIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';

import {
  CollapsibleSection,
  NavigationPanelCollections,
  NavigationPanelFavorites,
  NavigationPanelMigrationFavorites,
  NavigationPanelOrganize,
  NavigationPanelTags,
  NavigationPanelJournals,
} from '../../desktop/components/navigation-panel';
import { WorkbenchLink, WorkbenchService } from '../../modules/workbench';
import { WorkspaceNavigator } from '../workspace-selector';
import {
  bottomContainer,
  primaryActionsGroup,
  primaryActionItem,
  primaryActionLink,
  primaryActionsRow,
  primaryActionsSpacer,
  primaryAddButton,
  quickSearchCompact,
  workspaceAndUserWrapper,
  workspaceWrapper,
  topSidebarContainer,
} from './index.css';
import { InviteMembersButton } from './invite-members-button';
import { AppSidebarJournalButton } from './journal-button';
import { NotificationButton } from './notification-button';
import { SidebarAudioPlayer } from './sidebar-audio-player';
import { TemplateDocEntrance } from './template-doc-entrance';
import { TrashButton } from './trash-button';
import { UpdaterButton } from './updater-button';
import UserInfo from './user-info';

export type RootAppSidebarProps = {
  isPublicWorkspace: boolean;
  onOpenQuickSearchModal: () => void;
  onOpenSettingModal: () => void;
  currentWorkspace: Workspace;
  openPage: (pageId: string) => void;
  createPage: () => Store;
  paths: {
    all: (workspaceId: string) => string;
    trash: (workspaceId: string) => string;
    shared: (workspaceId: string) => string;
  };
};

const AIChatButton = ({ className }: { className?: string }) => {
  const t = useI18n();
  const label = t['com.affine.workspaceSubPath.chat']();
  const featureFlagService = useService(FeatureFlagService);
  const serverService = useService(ServerService);
  const serverFeatures = useLiveData(serverService.server.features$);
  const enableAI = useLiveData(featureFlagService.flags.enable_ai.$);

  const { workbenchService } = useServices({
    WorkbenchService,
  });
  const workbench = workbenchService.workbench;
  const aiChatActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/chat')
  );

  if (!enableAI || !serverFeatures?.copilot) {
    return null;
  }

  return (
    <div className={className}>
      <WorkbenchLink to={'/chat'} className={primaryActionLink}>
        <IconButton
          icon={<AiOutlineIcon />}
          variant="plain"
          size="20"
          data-active={aiChatActive ? 'true' : undefined}
          aria-label={label}
          title={label}
        />
      </WorkbenchLink>
    </div>
  );
};

/**
 * This is for the whole affine app sidebar.
 * This component wraps the app sidebar in `@affine/component` with logic and data.
 *
 */
export const RootAppSidebar = memo((): ReactElement => {
  const {
    workbenchService,
    cMDKQuickSearchService,
    authService,
    journalService,
  } = useServices({
    WorkbenchService,
    CMDKQuickSearchService,
    AuthService,
    JournalService,
  });

  const [activeSection, setActiveSection] = useState<
    'favorite' | 'folder' | 'tag' | 'collection' | 'journal' | null
  >(null);

  const toggleSection = useCallback(
    (section: 'favorite' | 'folder' | 'tag' | 'collection' | 'journal') => {
      setActiveSection(prev => (prev === section ? null : section));
    },
    []
  );

  const sessionStatus = useLiveData(authService.session.status$);
  const t = useI18n();
  const workspaceDialogService = useService(WorkspaceDialogService);
  const workbench = workbenchService.workbench;
  const location = useLiveData(workbench.location$);
  const maybeDocId = location.pathname.split('/')[1];
  const isJournal = !!useLiveData(journalService.journalDate$(maybeDocId));
  const isJournalActive = isJournal || location.pathname.startsWith('/journals');
  const workspaceSelectorOpen = useLiveData(workbench.workspaceSelectorOpen$);
  const onOpenQuickSearchModal = useCallback(() => {
    cMDKQuickSearchService.toggle();
  }, [cMDKQuickSearchService]);

  const onWorkspaceSelectorOpenChange = useCallback(
    (open: boolean) => {
      workbench.setWorkspaceSelectorOpen(open);
    },
    [workbench]
  );

  const onOpenSettingModal = useCallback(() => {
    workspaceDialogService.open('setting', {
      activeTab: 'appearance',
    });
    track.$.navigationPanel.$.openSettings();
  }, [workspaceDialogService]);

  const handleOpenDocs = useCallback(
    (result: {
      docIds: string[];
      entryId?: string;
      isWorkspaceFile?: boolean;
    }) => {
      const { docIds, entryId, isWorkspaceFile } = result;
      // If the imported file is a workspace file, open the entry page.
      if (isWorkspaceFile && entryId) {
        workbench.openDoc(entryId);
      } else if (!docIds.length) {
        return;
      }
      // Open all the docs when there are multiple docs imported.
      if (docIds.length > 1) {
        workbench.openAll();
      } else {
        // Otherwise, open the only doc.
        workbench.openDoc(docIds[0]);
      }
    },
    [workbench]
  );

  const onOpenImportModal = useCallback(() => {
    track.$.navigationPanel.importModal.open();
    workspaceDialogService.open('import', undefined, payload => {
      if (!payload) {
        return;
      }
      handleOpenDocs(payload);
    });
  }, [workspaceDialogService, handleOpenDocs]);

  return (
    <AppSidebar
      headerContent={
        <div className={workspaceAndUserWrapper}>
          <div className={workspaceWrapper}>
            <WorkspaceNavigator
              showEnableCloudButton
              showSyncStatus
              open={workspaceSelectorOpen}
              onOpenChange={onWorkspaceSelectorOpenChange}
              dense
            />
          </div>
          <UserInfo />
        </div>
      }
    >
      <SidebarContainer className={topSidebarContainer}>
        <div className={primaryActionsRow}>
          <div className={primaryActionsGroup}>
            <QuickSearchInput
              className={quickSearchCompact}
              data-testid="slider-bar-quick-search-button"
              data-event-props="$.navigationPanel.$.quickSearch"
              onClick={onOpenQuickSearchModal}
            />
            <AppSidebarJournalButton
              className={primaryActionItem}
              active={activeSection === 'journal'}
              onClick={() => toggleSection('journal')}
            />
            <div className={primaryActionItem}>
              <IconButton
                icon={<FavoriteIcon />}
                variant="plain"
                size="20"
                data-active={activeSection === 'favorite' ? 'true' : undefined}
                onClick={() => toggleSection('favorite')}
              />
            </div>
            <div className={primaryActionItem}>
              <WorkbenchLink to={'/all'} className={primaryActionLink}>
                <IconButton
                  icon={<FolderIcon />}
                  variant="plain"
                  size="20"
                  data-active={activeSection === 'folder' ? 'true' : undefined}
                  onClick={() => toggleSection('folder')}
                />
              </WorkbenchLink>
            </div>
            <div className={primaryActionItem}>
              <IconButton
                icon={<TagIcon />}
                variant="plain"
                size="20"
                data-active={activeSection === 'tag' ? 'true' : undefined}
                onClick={() => toggleSection('tag')}
              />
            </div>
            <div className={primaryActionItem}>
              <IconButton
                icon={<ViewLayersIcon />}
                variant="plain"
                size="20"
                data-active={
                  activeSection === 'collection' ? 'true' : undefined
                }
                onClick={() => toggleSection('collection')}
              />
            </div>
            {sessionStatus === 'authenticated' && (
              <NotificationButton className={primaryActionItem} />
            )}
            <AIChatButton className={primaryActionItem} />
            <div className={primaryActionItem}>
              <IconButton
                data-testid="slider-bar-workspace-setting-button"
                icon={<SettingsIcon />}
                variant="plain"
                size="20"
                onClick={onOpenSettingModal}
                aria-label={t['com.affine.settingSidebar.title']()}
                title={t['com.affine.settingSidebar.title']()}
              />
            </div>
          </div>
          <div className={primaryActionsSpacer} />
          <AddPageButton className={primaryAddButton} variant="plain" />
        </div>
      </SidebarContainer>
      <SidebarScrollableContainer>
        {activeSection === 'favorite' && (
          <>
            <NavigationPanelFavorites />
            <NavigationPanelMigrationFavorites />
          </>
        )}
        {activeSection === 'folder' && <NavigationPanelOrganize />}
        {activeSection === 'tag' && <NavigationPanelTags />}
        {activeSection === 'collection' && <NavigationPanelCollections />}
        {activeSection === 'journal' && <NavigationPanelJournals />}
        {!isJournalActive && (
          <CollapsibleSection
            path={['others']}
            title={t['com.affine.rootAppSidebar.others']()}
            contentStyle={{ padding: '6px 8px 0 8px' }}
          >
            <TrashButton />
            <MenuItem
              data-testid="slider-bar-import-button"
              icon={<ImportIcon />}
              onClick={onOpenImportModal}
            >
              <span data-testid="import-modal-trigger">{t['Import']()}</span>
            </MenuItem>
            <InviteMembersButton />
            <TemplateDocEntrance />
          </CollapsibleSection>
        )}
      </SidebarScrollableContainer>
      <SidebarContainer className={bottomContainer}>
        <SidebarAudioPlayer />
        {BUILD_CONFIG.isElectron ? <UpdaterButton /> : <AppDownloadButton />}
      </SidebarContainer>
    </AppSidebar>
  );
});

RootAppSidebar.displayName = 'memo(RootAppSidebar)';
