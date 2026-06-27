import { DebugLogger } from '@affine/debug';
import type { BackendModule, i18n } from 'i18next';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { useAFFiNEI18N } from './i18n.gen';
import type { Language } from './resources';
import { SUPPORTED_LANGUAGES } from './resources';

const logger = new DebugLogger('i18n');

const defaultLng: Language = 'en';

let _instance: i18n | null = null;
export const getOrCreateI18n = (): i18n => {
  if (!_instance) {
    _instance = i18next.createInstance();
    _instance
      .use(initReactI18next)
      .use({
        type: 'backend',
        init: () => {},
        read: (lng: Language, _ns: string, callback) => {
          const resource = SUPPORTED_LANGUAGES[lng].resource;
          if (typeof resource === 'function') {
            resource()
              .then(data => {
                logger.info(`${lng} の翻訳リソースを読み込みました`);
                callback(null, data.default);
              })
              .catch(err => {
                logger.error(
                  `${lng} の翻訳リソースの読み込みに失敗しました`,
                  err
                );
                callback(null, null);
              });
          } else {
            callback(null, resource);
          }
        },
      } as BackendModule)
      .init({
        lng: defaultLng,
        fallbackLng: code => {
          // 常に英語へフォールバックする
          const fallbacks: string[] = [defaultLng];
          if (!code) {
            return fallbacks;
          }

          const langPart = code.split('-')[0];
          if (!langPart) {
            return fallbacks;
          }

          // es-AR は es、zh-Hant は zh-Hans へフォールバックする
          if (langPart === 'cn') {
            fallbacks.push('zh-Hans');
          } else if (
            langPart !== code &&
            SUPPORTED_LANGUAGES[langPart as Language]
          ) {
            fallbacks.unshift(langPart);
          }

          return fallbacks;
        },
        supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
        ...({ showSponsor: false } as { showSponsor: boolean }),
        debug: false,
        partialBundledLanguages: true,
        resources: {
          [defaultLng]: {
            translation: SUPPORTED_LANGUAGES[defaultLng].resource,
          },
        },
        interpolation: {
          escapeValue: false, // React は既定でエスケープするため不要
        },
      })
      .then(() => {
        logger.info('i18n を初期化しました');
      })
      .catch(() => {});
  }

  return _instance;
};

declare module 'i18next' {
  interface CustomTypeOptions {
    // メモ(@forehalo):
    //   これは有効化しないこと
    //   <Trans /> コンポーネントの型チェックが可能になるが、
    //   コードベース全体の型チェックが非常に重くなる
    //   [./react.ts] を確認
    // resources: {
    //   translation: LanguageResource;
    // };
  }
}

export type I18nFuncs = ReturnType<typeof useAFFiNEI18N>;
type KnownI18nKey = keyof I18nFuncs;

export type I18nString =
  | KnownI18nKey
  | string
  | { i18nKey: string; options?: Record<string, any> };

export function isI18nString(value: unknown): value is I18nString {
  if (typeof value === 'string') {
    return true;
  }

  if (typeof value === 'object' && value !== null) {
    return 'i18nKey' in value;
  }

  return false;
}

export function createI18nWrapper(getI18nFn: () => i18n) {
  const I18nMethod = {
    t(key: I18nString, options?: Record<string, any>) {
      if (typeof key === 'object' && 'i18nKey' in key) {
        options = key.options;
        key = key.i18nKey as string;
      }

      const i18n = getI18nFn();
      if (i18n.exists(key)) {
        return i18n.t(key, options);
      } else {
        // 未知の翻訳キー 'xxx.xxx' はそのまま返す
        return key;
      }
    },
    get language() {
      const i18n = getI18nFn();
      return i18n.language;
    },
    changeLanguage(lng?: string | undefined) {
      const i18n = getI18nFn();
      return i18n.changeLanguage(lng);
    },
    get on() {
      const i18n = getI18nFn();
      return i18n.on.bind(i18n);
    },
  };

  return new Proxy(I18nMethod, {
    get(self, key: string) {
      if (key in self) {
        // @ts-expect-error 許容する
        return self[key];
      }

      return I18nMethod.t.bind(null, key);
    },
    has(self, key: string) {
      if (key in self) {
        return true;
      }
      const i18n = getI18nFn();
      if (i18n.exists(key)) {
        return true;
      }
      return false;
    },
  }) as typeof I18nMethod &
    ReturnType<typeof useAFFiNEI18N> & { [unknownKey: string]: () => string };
}

/**
 * I18n['com.affine.xxx']({ arg1: 'こんにちは' }) -> '中文 こんにちは'
 */
export const I18n = createI18nWrapper(getOrCreateI18n);

export type I18nInstance = typeof I18n;
