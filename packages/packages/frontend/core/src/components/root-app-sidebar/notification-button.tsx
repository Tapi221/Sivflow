import { IconButton, Menu } from '@affine/component';
import { NotificationCountService } from '@affine/core/modules/notification';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { NotificationIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { NotificationList } from '../notification/list';
import * as styles from './notification-button.style.css';

const Badge = ({ count, onClick }: { count: number; onClick?: () => void }) => {
  if (count === 0) {
    return null;
  }
  return (
    <div className={styles.badge} onClick={onClick}>
      {count > 99 ? '99+' : count}
    </div>
  );
};

export const NotificationButton = ({ className }: { className?: string }) => {
  const notificationCountService = useService(NotificationCountService);
  const notificationCount = useLiveData(notificationCountService.count$);

  const t = useI18n();
  const label = t['com.affine.rootAppSidebar.notifications']();

  const [notificationListOpen, setNotificationListOpen] = useState(false);

  const handleNotificationListOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        track.$.sidebar.notifications.openInbox({
          unreadCount: notificationCountService.count$.value,
        });
      }
      setNotificationListOpen(open);
    },
    [notificationCountService.count$.value]
  );

  return (
    <Menu
      rootOptions={{
        open: notificationListOpen,
        onOpenChange: handleNotificationListOpenChange,
      }}
      contentOptions={{
        side: 'right',
        sideOffset: -50,
      }}
      items={<NotificationList />}
    >
      <div className={className} style={{ position: 'relative' }}>
        <IconButton
          icon={<NotificationIcon />}
          variant="plain"
          size="20"
          data-active={notificationListOpen ? 'true' : undefined}
          aria-label={label}
          title={label}
        />
        <div style={{ position: 'absolute', top: -2, right: -2 }}>
          <Badge count={notificationCount} />
        </div>
      </div>
    </Menu>
  );
};
