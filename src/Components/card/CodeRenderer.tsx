import { useMemo, useState, useCallback } from "react";
import { Highlight } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { codeTheme } from "@/theme/codeTheme";
import CheckIcon from "lucide-react/dist/esm/icons/check";
import CopyIcon from "lucide-react/dist/esm/icons/copy";
import { CodeBlockFrame } from "./blocks/CodeBlockFrame";

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
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  bash: "Shell",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
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
      // clipboard API が使えない環境のフォールバック
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

  // コピーボタン（右上アクション）
  const copyButton = (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className={cn(
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
  );

  return (
    <div className={className}>
      <CodeBlockFrame
        languageLabel={languageLabel}
        right={copyButton}
      >
        <Highlight theme={codeTheme} code={normalizedCode} language={validLanguage}>
          {({ className: preClassName, style, tokens, getLineProps, getTokenProps }: any) => (
            <pre
              className={cn(
                preClassName,
                "codeBlockPre overflow-x-auto"
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
      </CodeBlockFrame>
    </div>
  );
}
