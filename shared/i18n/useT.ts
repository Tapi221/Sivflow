/**
 * useT() — 現在のロケールに応じた翻訳辞書を返すフック。
 *
 * @example
 * const t = useT();
 * <span>{t.todayButton}</span>
 */

import { useMemo } from "react";
import type { Locale as DateFnsLocale } from "date-fns";
import { enUS, ja, zhCN } from "date-fns/locale";
import { useLocaleStore } from "@shared/i18n/locale.store";
import { TRANSLATIONS } from "@shared/i18n/translations";

const useT = () => {
  const locale = useLocaleStore((s) => s.locale);
  return TRANSLATIONS[locale];
};
/** date-fns の Locale オブジェクトを返すフック。format() の locale 引数に渡す。 */
const useDateFnsLocale = (): DateFnsLocale => {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(() => {
    if (locale === "ja") return ja;
    if (locale === "zh") return zhCN;
    return enUS;
  }, [locale]);
};
/**
 * ロケールに応じた月ラベルフォーマット文字列を返す。
 * 日本語/中国語: "yyyy年 M月"  英語: "MMMM yyyy"
 */
const useMonthLabelFormat = (): string => {
  const locale = useLocaleStore((s) => s.locale);
  return locale === "en" ? "MMMM yyyy" : "yyyy年 M月";
};

export { useT, useDateFnsLocale, useMonthLabelFormat };
