import { describe, expect, it } from "vitest";
import { resolveBlockNoteDictionary, resolveBlockNoteLocale } from "./blockNoteLocale";

describe("blockNoteLocale", () => {
  it("html lang の日本語指定から BlockNote の日本語辞書を選ぶ", () => {
    expect(resolveBlockNoteLocale({ documentLanguage: "ja", navigatorLanguages: [], navigatorLanguage: undefined })).toBe("ja");
  });

  it("navigator の地域付き言語を BlockNote locale に正規化する", () => {
    expect(resolveBlockNoteLocale({ documentLanguage: undefined, navigatorLanguages: ["ja-JP"], navigatorLanguage: undefined })).toBe("ja");
  });

  it("navigator.languages を document lang より優先し、利用可能な locale を選ぶ", () => {
    expect(resolveBlockNoteLocale({ documentLanguage: "ja", navigatorLanguages: ["fr-FR"], navigatorLanguage: "ja-JP" })).toBe("fr");
  });

  it("対応する locale がない場合は英語にフォールバックする", () => {
    expect(resolveBlockNoteLocale({ documentLanguage: "zz-ZZ", navigatorLanguages: ["qq-QQ"], navigatorLanguage: undefined })).toBe("en");
  });

  it("日本語の slash menu 文言をアプリのメニュー幅に収まる短い文言へ補正する", () => {
    const dictionary = resolveBlockNoteDictionary({ documentLanguage: "ja", navigatorLanguages: [], navigatorLanguage: undefined }) as { slash_menu: { heading: { subtext: string }; check_list: { title: string; subtext: string } } };

    expect(dictionary.slash_menu.heading.subtext).toBe("大見出し");
    expect(dictionary.slash_menu.check_list.title).toBe("チェック");
    expect(dictionary.slash_menu.check_list.subtext).toBe("チェックリスト");
  });

  it("英語指定では日本語 slash menu 補正を適用しない", () => {
    const dictionary = resolveBlockNoteDictionary({ documentLanguage: "en", navigatorLanguages: [], navigatorLanguage: undefined }) as { slash_menu: { heading: { subtext: string }; check_list: { title: string } } };

    expect(dictionary.slash_menu.heading.subtext).not.toBe("大見出し");
    expect(dictionary.slash_menu.check_list.title).not.toBe("チェック");
  });
});
