import { useCatchEventCallback } from '@affine/core/components/hooks/use-catch-event-hook';
import { track } from '@affine/track';
import { CloseIcon, DownloadIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import * as styles from './index.css';

export function AppDownloadButton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(true);

  const handleClose = useCatchEventCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
  }, []);

  // TODO(@JimmFly): unify this type of literal value.
  const handleClick = useCallback(() => {
    track.$.navigationPanel.bottomButtons.downloadApp();
    const url = `https://affine.pro/download?channel=stable`;
    open(url, '_blank');
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className={clsx([styles.root, className])} style={style}>
      <div className={styles.cloudsOverlay} aria-hidden="true" />
      <div className={styles.patternOverlay} aria-hidden="true" />
      
      <div className={styles.closeIcon} onClick={handleClose}>
        <CloseIcon width={12} height={12} />
      </div>

      <div className={styles.description}>
        デスクトップ版をダウンロードして、より快適に。
      </div>

      <button className={styles.button} onClick={handleClick}>
        <DownloadIcon width={14} height={14} />
        ダウンロード
      </button>
    </div>
  );
}
