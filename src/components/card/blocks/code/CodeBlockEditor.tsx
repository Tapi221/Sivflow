import { useCallback, useMemo, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@web-renderer/chip/ui/select";
import { cn } from "@web-renderer/lib/utils";
import { CODE_BLOCK_MAX_RECENT_LANGUAGES, CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY, CODE_BLOCK_SUPPORTED_LANGUAGE_VALUES, CODE_BLOCK_SUPPORTED_LANGUAGES } from "./codeBlock.constants";
import { CodeBlockContent } from "./CodeBlockContent";
import { normalizeEditorLanguage } from "./codeBlockLanguage";
import type { CodeBlockData } from "@/types/core/code-block";



interface CodeBlockEditorProps {
  value?: CodeBlockData;
  onChange: (value: CodeBlockData) => void;
  className?: string;
  zoom?: number;
}



const canUseLocalStorage = () => {
  try {
    return (
      typeof window !== "undefined" &&
      "localStorage" in window &&
      !!window.localStorage
    );
  } catch {
    return false;
  }
};
const getRecentLangs = () => {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(
      CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY,
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map(normalizeEditorLanguage)
      .filter((value) => CODE_BLOCK_SUPPORTED_LANGUAGE_VALUES.has(value));
  } catch {
    return [];
  }
};
const pushRecentLang = (lang: string) => {
  if (!canUseLocalStorage()) return;

  try {
    const normalized = normalizeEditorLanguage(lang);
    const prev = getRecentLangs().filter((value) => value !== normalized);
    const next = [normalized, ...prev].slice(
      0,
      CODE_BLOCK_MAX_RECENT_LANGUAGES,
    );

    window.localStorage.setItem(
      CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // noop
  }
};



const CodeBlockEditor = ({ value, onChange, className, zoom }: CodeBlockEditorProps) => {
  const [recentLangs, setRecentLangs] = useState<string[]>(() => getRecentLangs());

  const code = value?.code ?? "";
  const normalizedLanguage = normalizeEditorLanguage(
    value?.language ?? "javascript",
  );

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      const nextLanguage = normalizeEditorLanguage(newLang);
      onChange({ language: nextLanguage, code });
      pushRecentLang(nextLanguage);
      setRecentLangs(getRecentLangs());
    },
    [onChange, code],
  );

  const recentLangItems = useMemo(() => {
    return recentLangs
      .map((value) =>
        CODE_BLOCK_SUPPORTED_LANGUAGES.find(
          (language) => language.value === value,
        ),
      )
      .filter(
        (
          language,
        ): language is (typeof CODE_BLOCK_SUPPORTED_LANGUAGES)[number] =>
          language !== undefined,
      );
  }, [recentLangs]);

  const remainingLangItems = useMemo(() => {
    const recentSet = new Set(recentLangs);
    return CODE_BLOCK_SUPPORTED_LANGUAGES.filter(
      (language) => !recentSet.has(language.value),
    );
  }, [recentLangs]);

  const languageSelector = (
    <Select
      value={normalizedLanguage}
      onValueChange={handleLanguageChange}
      onOpenChange={(open) => {
        if (open) {
          setRecentLangs(getRecentLangs());
        }
      }}
    >
      <SelectTrigger
        className={cn(
          "codeBlockLang",
          "h-auto w-auto min-w-0 min-h-0 gap-1 shadow-none",
          "focus:ring-0 focus:ring-offset-0",
          "[&_svg]:h-3 [&_svg]:w-3",
        )}
      >
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="bg-white">
        {recentLangItems.length > 0 && (
          <>
            <SelectGroup>
              <SelectLabel className="text-xs text-slate-400 uppercase tracking-widest px-2 py-1">
                最近使った言語
              </SelectLabel>
              {recentLangItems.map((language) => (
                <SelectItem
                  key={`recent-${language.value}`}
                  value={language.value}
                  className="text-xs"
                >
                  {language.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
          </>
        )}

        <SelectGroup>
          {recentLangItems.length > 0 && (
            <SelectLabel className="text-xs text-slate-400 uppercase tracking-widest px-2 py-1">
              すべての言語
            </SelectLabel>
          )}
          {remainingLangItems.map((language) => (
            <SelectItem
              key={language.value}
              value={language.value}
              className="text-xs"
            >
              {language.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  return (
    <CodeBlockContent
      mode="editor"
      code={code}
      language={normalizedLanguage}
      onCodeChange={(nextCode: string) => {
        onChange({ language: normalizedLanguage, code: nextCode });
      }}
      className={className}
      zoom={zoom}
      headerLeft={languageSelector}
    />
  );
};



export { CodeBlockEditor };
