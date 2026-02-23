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

  return (
    <div
      className={cn(
        "relative group flex flex-col max-w-full overflow-hidden",
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {/* ── ヘッダーバー ── */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 bg-slate-50/80">
        {/* 言語ラベル */}
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest select-none font-sans">
          {languageLabel}
        </span>

        {/* コピーボタン */}
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all duration-150",
            "text-slate-400 hover:text-slate-600 hover:bg-slate-200/60",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
            copied && "text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50"
          )}
          aria-label="コードをコピー"
        >
          {copied ? (
            <>
              <CheckIcon size={12} strokeWidth={2.5} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} strokeWidth={2} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* ── コード本体 ── */}
      <Highlight theme={codeTheme} code={normalizedCode} language={validLanguage}>
        {({ className: preClassName, style, tokens, getLineProps, getTokenProps }: any) => (
          <pre
            className={cn(
              preClassName,
              "m-0 overflow-x-auto",
              "px-4 py-3.5",
              "text-[13px] leading-[1.65] font-mono",
              "bg-white"
            )}
            style={style}
          >
            <code className="font-[inherit]">
              {tokens.map((line: any[], i: number) => (
                <div key={i} {...getLineProps({ line })} className="min-h-[1em]">
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
  );
}


