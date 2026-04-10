import { useCallback, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CodeBlockData } from "@/types/core/code-block";
import { CodeBlockContent } from "./CodeBlockContent";
import { normalizeEditorLanguage } from "./codeBlockLanguage";

const STORAGE_KEY = "codeblock_recent_langs";
const MAX_RECENT = 3;

const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "markup", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "markdown", label: "Markdown" },
];
const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES.map((l) => l.value));

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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string")
      .map(normalizeEditorLanguage)
      .filter((v) => SUPPORTED_LANGUAGE_SET.has(v));
  } catch {
    return [];
  }
};

const pushRecentLang = (lang: string) => {
  if (!canUseLocalStorage()) return;
  try {
    const normalized = normalizeEditorLanguage(lang);
    const prev = getRecentLangs().filter((l) => l !== normalized);
    const next = [normalized, ...prev].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
};

interface CodeBlockEditorProps {
  value?: CodeBlockData;
  onChange: (value: CodeBlockData) => void;
  className?: string;
}

export const CodeBlockEditor = ({
  value,
  onChange,
  className,
}: CodeBlockEditorProps) => {
  const [recentLangs, setRecentLangs] = useState<string[]>(() =>
    getRecentLangs(),
  );

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
      .map((val) => SUPPORTED_LANGUAGES.find((l) => l.value === val))
      .filter((l): l is { value: string; label: string } => l !== undefined);
  }, [recentLangs]);

  const remainingLangItems = useMemo(() => {
    const recentSet = new Set(recentLangs);
    return SUPPORTED_LANGUAGES.filter((l) => !recentSet.has(l.value));
  }, [recentLangs]);

  const languageSelector = (
    <Select
      value={normalizedLanguage}
      onValueChange={handleLanguageChange}
      onOpenChange={(open) => {
        if (open) setRecentLangs(getRecentLangs());
      }}
    >
      <SelectTrigger
        className="
          h-5 w-auto min-w-0 min-h-0
          rounded-md px-1.5 py-0
          bg-zinc-900/5 border-none shadow-none
          text-[10px] font-bold text-zinc-500
          tracking-wider uppercase
          hover:text-zinc-700 hover:bg-zinc-900/10
          focus:ring-0
          gap-1
        "
      >
        <SelectValue placeholder="Language" />
      </SelectTrigger>

      <SelectContent className="bg-white">
        {recentLangItems.length > 0 && (
          <>
            <SelectGroup>
              <SelectLabel className="text-[10px] text-slate-400 uppercase tracking-widest px-2 py-1">
                最近使った言語
              </SelectLabel>
              {recentLangItems.map((lang) => (
                <SelectItem
                  key={`recent-${lang.value}`}
                  value={lang.value}
                  className="text-xs"
                >
                  {lang.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
          </>
        )}

        <SelectGroup>
          {recentLangItems.length > 0 && (
            <SelectLabel className="text-[10px] text-slate-400 uppercase tracking-widest px-2 py-1">
              すべての言語
            </SelectLabel>
          )}
          {remainingLangItems.map((lang) => (
            <SelectItem key={lang.value} value={lang.value} className="text-xs">
              {lang.label}
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
      onCodeChange={(nextCode) =>
        onChange({ language: normalizedLanguage, code: nextCode })
      }
      headerLeft={languageSelector}
      className={className}
    />
  );
};
