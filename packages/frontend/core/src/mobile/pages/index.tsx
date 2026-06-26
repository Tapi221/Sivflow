import { Component as IndexComponent } from '@affine/core/desktop/pages/index';

import { AppFallback } from '../components/app-fallback';

// モバイル向けのデフォルトルートフォールバック

export const Component = () => {
  // TODO: モバイル版に置き換える
  return (
    <IndexComponent defaultIndexRoute={'home'} fallback={<AppFallback />} />
  );
};
