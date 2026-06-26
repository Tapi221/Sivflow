import { IconButton } from '@affine/component';
import { NotificationCountService } from '@affine/core/modules/notification';
import { track } from '@affine/track';
import { SidebarIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback } from 'react';

import { AppSidebarService } from '../../services/app-sidebar';
import * as styles from './sidebar-switch.css';

export const SidebarSwitch = ({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) => {
  const notificationCountService = useServiceOptional(NotificationCountService);
  const hasNotification = useLiveData(
    notificationCountService?.count$.selector(count => count > 0) ?? false
  );

  const appSidebarService = useService(AppSidebarService).sidebar;
  const open = useLiveData(appSidebarService.open$);

  const handleClickSwitch = useCallback(() => {
    track.$.navigationPanel.$.toggle({
      type: open ? 'collapse' : 'expand',
    });
    appSidebarService.toggleSidebar();
  }, [appSidebarService, open]);

  const showNotificationDot = hasNotification && !open;

  return (
    <div
      data-show={show}
      className={styles.sidebarSwitchClip}
      data-testid={`app-sidebar-arrow-button-${open ? 'collapse' : 'expand'}`}
      data-notification={showNotificationDot}
    >
      <IconButton
        className={className}
        size="24"
        style={{
          zIndex: 1,
        }}
        onClick={handleClickSwitch}
      >
        <SidebarIcon
          className={clsx(styles.switchIcon)}
          data-notification={showNotificationDot}
        />
      </IconButton>
    </div>
  );
};