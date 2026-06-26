import { useLiveData, useService } from '@toeverything/infra';
import type { ReactNode } from 'react';

import { AppSidebarService } from '../../services/app-sidebar';
import { navHeaderStyle } from '../index.css';
import { SidebarSwitch } from './sidebar-switch';

export const SidebarHeader = ({ children }: { children?: ReactNode }) => {
  const appSidebarService = useService(AppSidebarService).sidebar;
  const open = useLiveData(appSidebarService.open$);

  return (
    <div className={navHeaderStyle} data-open={open}>
      <SidebarSwitch show={open} />
      {children}
    </div>
  );
};

export * from './sidebar-switch';
