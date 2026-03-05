import { Check, Copy } from "@/ui/icons";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Highlight } from "prism-react-renderer";
import type { RenderProps } from "prism-react-renderer";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import { cn } from "@/lib/utils";
import { codeTheme } from "@/theme/codeTheme";
import { CodeBlockFrame } from "./CodeBlockFrame";
import {
  getViewerLanguageLabels,
  normalizeEditorLanguage,
  normalizeViewerLanguage,
} from "./codeBlockLanguage";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markdown";

type CodeBlockContentProps =
  | {
      mode: "viewer";
      code: string;
      language?: string;
      className?: string;
    }
  | {
      mode: "editor";
      code: string;
      language?: string;
      className?: string;
      headerLeft?: React.ReactNode;
      onCodeChange: (nextCode: string) => void;
    };

export function CodeBlockContent(props: CodeBlockContentProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);

  const normalizedCode = useMemo(
    () => (props.code ?? "").replace(/\s+$/, ""),
    [props.code],
  );

  const viewerLanguage = useMemo(
    () => normalizeViewerLanguage(props.language),
    [props.language],
  );
  const editorLanguage = useMemo(
    () => normalizeEditorLanguage(props.language),
    [props.language],
  );
  const editorGrammar = useMemo(
    () => Prism.languages[editorLanguage] ?? Prism.languages.javascript,
    [editorLanguage],
  );
  const labels = useMemo(
    () => getViewerLanguageLabels(viewerLanguage),
    [viewerLanguage],
  );

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (props.mode !== "editor") return;
    const textarea = editorHostRef.current?.querySelector("textarea");
    if (!textarea) return;
    textarea.setAttribute("wrap", "off");
  }, [props.mode, editorLanguage]);

  const showCopiedForAWhile = useCallback(() => {
    setCopied(true);
    if (copiedTimerRef.current !== null) {
      window.clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimerRef.current = null;
    }, 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      showCopiedForAWhile();
    } catch {
      const el = document.createElement("textarea");
      el.value = normalizedCode;
      document.body.appendChild(el);
      el.select();
      const copiedByFallback = document.execCommand("copy");
      document.body.removeChild(el);
      if (copiedByFallback) showCopiedForAWhile();
    }
  }, [normalizedCode, showCopiedForAWhile]);

  const copyButton = (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void handleCopy();
      }}
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        props.mode === "viewer"
          ? "opacity-100 supports-[hover:hover]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
          : "opacity-100",
        "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-900/5",
        "focus:outline-none",
        copied && "opacity-100 text-emerald-600 hover:text-emerald-600",
      )}
      aria-label="コードをコピー"
      type="button"
    >
      {copied ? (
        <Check size={11} strokeWidth={2.5} />
      ) : (
        <Copy size={11} strokeWidth={2} />
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );

  if (props.mode === "viewer") {
    return (
      <div className={props.className}>
        <CodeBlockFrame
          languageLabel={labels.short}
          languageTitle={labels.full}
          headerRight={copyButton}
        >
          <Highlight
            theme={codeTheme}
            code={normalizedCode}
            language={viewerLanguage}
          >
            {({
              className: preClassName,
              style,
              tokens,
              getLineProps,
              getTokenProps,
            }: RenderProps) => {
              const lastLine = tokens[tokens.length - 1];
              const lastLineIsTrailingEmpty =
                Array.isArray(lastLine) &&
                lastLine.every((token) => token.content.trim() === "");
              const visibleTokens = lastLineIsTrailingEmpty
                ? tokens.slice(0, -1)
                : tokens;

              return (
                <pre
                  className={cn(preClassName, "codeBlockPre code-no-wrap")}
                  style={{
                    color: style.color,
                    backgroundColor: style.backgroundColor,
                  }}
                >
                  <code className="code-no-wrap">
                    {visibleTokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </code>
                </pre>
              );
            }}
          </Highlight>
        </CodeBlockFrame>
      </div>
    );
  }

  const highlightCode = (src: string) =>
    Prism.highlight(src, editorGrammar, editorLanguage);

  return (
    <div ref={editorHostRef} className={props.className}>
      <CodeBlockFrame
        variant="editor"
        headerLeft={props.headerLeft}
        headerRight={copyButton}
      >
        <Editor
          value={props.code}
          onValueChange={props.onCodeChange}
          highlight={highlightCode}
          padding={0}
          style={{ minHeight: 56 }}
          className="code-editor-no-scroll code-no-wrap"
          textareaClassName="code-no-wrap focus:outline-none"
        />
      </CodeBlockFrame>
    </div>
  );
}
