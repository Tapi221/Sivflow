// /src/Components/card/CodeRenderer.tsx

import { useMemo } from "react";
import { Highlight } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { codeTheme } from "@/theme/codeTheme";

interface CodeRendererProps {
  code: string;
  language?: string;
  className?: string;
}

const SUPPORTED_LANGS = new Set([
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "bash",
  "css",
  "html",
  "markdown",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "sql",
  "yaml",
  "clike",
]);

const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "cplusplus": "cpp",
  "cc": "cpp",
  "c#": "csharp",
  "cs": "csharp",
  "shell": "bash",
  "sh": "bash",
};

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JS",
  typescript: "TS",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  bash: "SH",
  css: "CSS",
  html: "HTML",
  markdown: "MD",
  python: "PY",
  java: "JAVA",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "GO",
  rust: "RS",
  sql: "SQL",
  yaml: "YAML",
  clike: "Text",
};

export function CodeRenderer({ code, language, className }: CodeRendererProps) {
  const normalizedCode = useMemo(() => {
    // 末尾改行で空行が増えるのを抑える（好み）
    return (code ?? "").replace(/\s+$/, "");
  }, [code]);

  const validLanguage = useMemo(() => {
    const input = (language || "").toLowerCase().trim();
    const normalized = LANGUAGE_ALIASES[input] ?? input;
    return SUPPORTED_LANGS.has(normalized) ? normalized : "clike";
  }, [language]);

  const languageLabel = useMemo(() => {
    return LANGUAGE_LABELS[validLanguage] ?? validLanguage;
  }, [validLanguage]);

  const theme = useMemo(() => codeTheme, []);

  return (
    <div
      className={cn(
        "code-block codeBlock codeBlockRoot relative group overflow-hidden flex flex-col max-w-full",
        "rounded-xl border border-zinc-200/50 bg-zinc-50/70 shadow-sm",
        className
      )}
    >
      {/* 言語ラベル: 左上に控えめに配置 (Claude風チップ) */}
      <div className="absolute top-2.5 left-3 z-20 pointer-events-none transition-opacity opacity-40 group-hover:opacity-100 flex items-center">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-sans bg-zinc-900/5 px-1.5 py-0.5 rounded-md leading-none">
          {languageLabel}
        </span>
      </div>

      <div
        className={cn(
          "relative flex-1 transition-all duration-500",
          "max-h-none"
        )}
      >
        <Highlight theme={theme} code={normalizedCode} language={validLanguage}>
          {({ className: preClassName, style, tokens, getLineProps, getTokenProps }: any) => (
            <pre
              className={cn(
                preClassName,
                "codeBlockPre code-block-pre code-block-pre--flat code-block-pre--tools codeBlock",
                "overflow-x-auto text-[13.5px] leading-5 px-4 pt-6 pb-2.5"
              )}
              style={{ ...style }}
            >
              <code>
                {tokens.map((line: any[], i: number) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token: any, key: number) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
