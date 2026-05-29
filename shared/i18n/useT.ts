/**
 * useT() — 現在のロケールに応じた翻訳辞書を返すフック。
 *
 * @example
 * const t = useT();
 * <span>{t.todayButton}</span>
 */

import { useMemo } from "react";
import type { Locale as DateFnsLocale } from "date-fns";
import { enUS, ja } from "date-fns/locale";
import { useLocaleStore } from "./locale.store";
import { TRANSLATIONS } from "./translations";

export const useT = () => {
  const locale = useLocaleStore((s) => s.locale);
  return TRANSLATIONS[locale];
};

/** date-fns の Locale オブジェクトを返すフック。format() の locale 引数に渡す。 */
export const useDateFnsLocale = (): DateFnsLocale => {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => (locale === "ja" ? ja : enUS), [locale]);
};

/**
 * ロケールに応じた月ラベルフォーマット文字列を返す。
 * 日本語: "yyyy年 M月"  英語: "MMMM yyyy"
 */
export const useMonthLabelFormat = (): string => {
  const locale = useLocaleStore((s) => s.locale);
  return locale === "ja" ? "yyyy年 M月" : "MMMM yyyy";
};
