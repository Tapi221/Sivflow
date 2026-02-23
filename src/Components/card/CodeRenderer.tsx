// src/Components/card/CodeRenderer.tsx

import { useMemo, useState, useCallback } from "react";
import { Highlight } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { codeTheme } from "@/theme/codeTheme";
import CheckIcon from "lucide-react/dist/esm/icons/check";
import CopyIcon from "lucide-react/dist/esm/icons/copy";

interface CodeRendererProps {
  code: string;
  language?: string;
  className?: string;
}

const SUPPORTED_LANGS = new Set([
  "javascript", "typescript", "jsx", "tsx", "json",
  "bash", "css", "html", "markdown", "python",
  "java", "c", "cpp", "csharp", "go", "rust",
  "sql", "yaml", "clike",
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
  const [copied, setCopied] = useState(false);

  const normalizedCode = useMemo(() => {
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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = normalizedCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [normalizedCode]);

  return (
    <div
      className={cn(
        "code-block codeBlock codeBlockRoot relative group overflow-hidden flex flex-col max-w-full",
        className
      )}
    >
      {/* 言語ラベル: 左上に控えめに配置 */}
      <div className="absolute top-2.5 left-[10px] z-20 pointer-events-none transition-opacity opacity-40 group-hover:opacity-100 flex items-center">
        <span className="codeBlockLang">
          {languageLabel}
        </span>
      </div>

      {/* コピーボタン: 右上 */}
      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 z-20",
          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-900/5",
          "focus:outline-none",
          copied && "opacity-100 text-emerald-600 hover:text-emerald-600"
        )}
        aria-label="コードをコピー"
      >
        {copied ? (
          <CheckIcon size={11} strokeWidth={2.5} />
        ) : (
          <CopyIcon size={11} strokeWidth={2} />
        )}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>

      <div className="relative flex-1">
        <Highlight theme={codeTheme} code={normalizedCode} language={validLanguage}>
          {({ className: preClassName, style, tokens, getLineProps, getTokenProps }: any) => (
            <pre
              className={cn(
                preClassName,
                "codeBlockPre code-block-pre code-block-pre--flat code-block-pre--tools codeBlock",
                "overflow-x-auto text-[13.5px] leading-5 px-[10px] pt-6 pb-2.5"
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
