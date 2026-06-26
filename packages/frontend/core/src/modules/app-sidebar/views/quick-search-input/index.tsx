import { useI18n } from '@affine/i18n';
import { SearchIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

import * as styles from './index.css';

interface QuickSearchInputProps extends HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
}

// Although it is called an input, it is actually a button.
export function QuickSearchInput({ onClick, ...props }: QuickSearchInputProps) {
  const t = useI18n();
  const label = t['Quick search']();

  return (
    <div
      {...props}
      className={clsx([props.className, styles.root])}
      onClick={onClick}
      tabIndex={0}
      aria-label={label}
      title={label}
    >
      <SearchIcon className={styles.icon} />
    </div>
  );
}
