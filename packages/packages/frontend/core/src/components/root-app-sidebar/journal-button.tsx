import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { JournalService } from '@affine/core/modules/journal';
import {
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { IconButton } from '@affine/component';
import { TodayIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

import { primaryActionLink } from './index.css';

export const AppSidebarJournalButton = ({
  className,
  active,
  onClick,
}: {
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) => {
  const t = useI18n();
  const label = t['com.affine.journal.app-sidebar-title']();
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const maybeDocId = location.pathname.split('/')[1];
  const isJournal = !!useLiveData(journalService.journalDate$(maybeDocId));

  const JournalIcon = useLiveData(docDisplayMetaService.icon$(maybeDocId));
  const Icon = isJournal ? JournalIcon : TodayIcon;

  return (
    <WorkbenchLink to={'/journals'} className={primaryActionLink}>
      <IconButton
        className={className}
        data-testid="slider-bar-journals-button"
        icon={<Icon />}
        variant="plain"
        size="20"
        onClick={onClick}
        data-active={
          active || isJournal || location.pathname.startsWith('/journals')
            ? 'true'
            : undefined
        }
        aria-label={label}
        title={label}
      />
    </WorkbenchLink>
  );
};
