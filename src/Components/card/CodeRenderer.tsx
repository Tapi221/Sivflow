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
        className
      )}
    >
      {/* Top-right label */}
      <div className="absolute top-[10px] right-[10px] z-20 flex items-center opacity-85 group-hover:opacity-100 transition-opacity pointer-events-auto">
        <span className="codeBlockLang">
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
                // 横スクロールはコードでは許可するのが普通
                "overflow-x-auto"
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
