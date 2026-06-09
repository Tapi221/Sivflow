import { describe, expect, it } from "vitest";
import { resolveBlockNoteLocale } from "./blockNoteLocale";

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
});
