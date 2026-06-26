import { type DropTargetGetFeedback } from '@affine/component';
import { ResizePanel } from '@affine/component/resize-panel';
import { useAppSettingHelper } from '@affine/core/components/hooks/affine/use-app-setting-helper';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import type { PropsWithChildren, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

import { WorkbenchService } from '../../workbench';
import { allowedSplitViewEntityTypes } from '../../workbench/view/split-view/types';
import { AppSidebarService } from '../services/app-sidebar';
import {
  navBodyStyle,
  navStyle,
  navWrapperStyle,
  resizeHandleShortcutStyle,
  sidebarFloatMaskStyle,
} from './index.css';
import { SidebarHeader } from './sidebar-header';

export type History = {
  stack: string[];
  current: number;
};

const MAX_WIDTH = 480;
const MIN_WIDTH = 248;
const isMacosDesktop = BUILD_CONFIG.isElectron && environment.isMacOs;

export function AppSidebar({
  children,
  headerContent,
}: PropsWithChildren<{ headerContent?: ReactNode }>) {
  const { appSettings } = useAppSettingHelper();

  const clientBorder = appSettings.clientBorder;

  const appSidebarService = useService(AppSidebarService).sidebar;
  const workbenchService = useService(WorkbenchService).workbench;

  const open = useLiveData(appSidebarService.open$);
  const width = useLiveData(appSidebarService.width$);
  const smallScreenMode = useLiveData(appSidebarService.smallScreenMode$);
  const resizing = useLiveData(appSidebarService.resizing$);

  const sidebarState = smallScreenMode
    ? open
      ? 'floating-with-mask'
      : 'close'
    : open
      ? 'open'
      : 'close';

  const hasRightBorder = !BUILD_CONFIG.isElectron && !clientBorder;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      appSidebarService.setOpen(open);
    },
    [appSidebarService]
  );

  const handleResizing = useCallback(
    (resizing: boolean) => {
      appSidebarService.setResizing(resizing);
    },
    [appSidebarService]
  );

  const handleWidthChange = useCallback(
    (width: number) => {
      appSidebarService.setWidth(width);
    },
    [appSidebarService]
  );

  const handleClose = useCallback(() => {
    appSidebarService.setOpen(false);
  }, [appSidebarService]);

  const resizeHandleDropTargetOptions = useMemo(() => {
    return () => ({
      data: () => {
        const firstView = workbenchService.views$.value.at(0);

        if (!firstView) {
          return {};
        }

        return {
          at: 'workbench:resize-handle',
          edge: 'left', // left of the first view
          viewId: firstView.id,
        };
      },
      canDrop: (data: DropTargetGetFeedback<AffineDNDData>) => {
        return (
          (!!data.source.data.entity?.type &&
            allowedSplitViewEntityTypes.has(data.source.data.entity?.type)) ||
          data.source.data.from?.at === 'workbench:link'
        );
      },
    });
  }, [workbenchService.views$.value]);

  return (
    <>
      <ResizePanel
        resizeHandleDropTargetOptions={resizeHandleDropTargetOptions}
        floating={sidebarState === 'floating-with-mask'}
        open={sidebarState !== 'close'}
        resizing={resizing}
        maxWidth={MAX_WIDTH}
        minWidth={MIN_WIDTH}
        width={width}
        resizeHandlePos="right"
        onOpen={handleOpenChange}
        onResizing={handleResizing}
        onWidthChange={handleWidthChange}
        unmountOnExit={false}
        className={navWrapperStyle}
        resizeHandleOffset={0}
        resizeHandleVerticalPadding={clientBorder ? 16 : 0}
        resizeHandleTooltip={<ResizeHandleTooltipContent />}
        resizeHandleTooltipOptions={{
          side: 'right',
          align: 'center',
        }}
        resizeHandleTooltipShortcut={['$mod', '/']}
        resizeHandleTooltipShortcutClassName={resizeHandleShortcutStyle}
        data-transparent
        data-open={sidebarState !== 'close'}
        data-has-border={hasRightBorder}
        data-testid="app-sidebar-wrapper"
        data-is-macos-electron={isMacosDesktop}
        data-client-border={clientBorder}
        data-is-electron={BUILD_CONFIG.isElectron}
      >
        <nav className={navStyle} data-testid="app-sidebar">
          {!BUILD_CONFIG.isElectron && (
            <SidebarHeader>{headerContent}</SidebarHeader>
          )}
          <div className={navBodyStyle} data-testid="sliderBar-inner">
            {children}
          </div>
        </nav>
      </ResizePanel>
      <div
        data-testid="app-sidebar-float-mask"
        data-open={open}
        data-is-floating={sidebarState === 'floating-with-mask'}
        className={sidebarFloatMaskStyle}
        onClick={handleClose}
      />
    </>
  );
}

const ResizeHandleTooltipContent = () => {
  const t = useI18n();
  return (
    <div>
      <div>{t['com.affine.rootAppSidebar.resize-handle.tooltip.drag']()}</div>
      <div>{t['com.affine.rootAppSidebar.resize-handle.tooltip.click']()}</div>
    </div>
  );
};

export * from './add-page-button';
export * from './app-download-button';
export * from './app-updater-button';
export * from './category-divider';
export * from './fallback-view';
export * from './index.css';
export * from './menu-item';
export * from './open-in-app-card';
export * from './quick-search-input';
export * from './sidebar-containers';
export * from './sidebar-header';