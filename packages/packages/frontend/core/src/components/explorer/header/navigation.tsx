import { RadioGroup } from '@affine/component';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import * as styles from './navigation.css';

const items = [
  {
    value: 'docs',
    label: 'com.affine.docs.header',
    testId: 'workspace-docs-button',
  },
] as const;

type NavigationKey = (typeof items)[number]['value'];

export const ExplorerNavigation = ({ active }: { active: NavigationKey }) => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;

  const handleValueChange = useCallback(
    (value: string) => {
      track.allDocs.header.navigation.navigateAllDocsRouter({
        control: value as NavigationKey,
      });
      switch (value) {
        case 'docs':
          workbench.openAll();
          break;
        case 'collections':
          workbench.openCollections();
          break;
        case 'tags':
          workbench.openTags();
          break;
      }
    },
    [workbench]
  );

  return (
    <div className={styles.container}>
      <RadioGroup
        value={active}
        onChange={handleValueChange}
        items={useMemo(
          () =>
            items.map(item => ({
              value: item.value,
              label: t[item.label](),
              testId: item.testId,
              className: styles.item,
            })),
          [t]
        )}
      />
    </div>
  );
};
