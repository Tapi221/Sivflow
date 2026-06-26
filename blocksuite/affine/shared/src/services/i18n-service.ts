import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';

export interface I18nStringProvider {
  t(key: string, options?: Record<string, unknown>): string;
}

export const I18nStringProvider =
  createIdentifier<I18nStringProvider>('AffineI18nProvider');

export const I18nExtension = (
  service: I18nStringProvider
): ExtensionType => {
  return {
    setup: di => {
      di.override(I18nStringProvider, () => service);
    },
  };
};
