import React, { useMemo } from "react";
import { cn } from "@web-renderer/lib/utils";
import katex from "katex";



interface MathRendererProps {
  latex: string;
  displayMode?: "block" | "inline";
  className?: string;
  showPlaceholder?: boolean;
  placeholder?: string;
}



const normalizeSingleLatex = (input: string): string => {
  if (!input) return "";

  return input
    .trim()
    .replace(/^\$\$\s*/u, "")
    .replace(/\s*\$\$$/u, "")
    .trim();
};



/**
 * KaTeXレンダラーコンポーネント
 * 単一数式のみを受け付ける
 */
const MathRendererComponent: React.FC<MathRendererProps> = ({
  latex,
  displayMode = "block",
  className = "",
  showPlaceholder = false,
  placeholder = "",
}) => {
  const normalizedLatex = useMemo(() => normalizeSingleLatex(latex), [latex]);

  const { html, error } = useMemo(() => {
    if (!normalizedLatex) {
      return { html: null, error: null };
    }

    try {
      if (normalizedLatex.length > 5000) {
        throw new Error("LaTeX string is too long");
      }

      const renderedHtml = katex.renderToString(normalizedLatex, {
        displayMode: displayMode === "block",
        throwOnError: false,
        errorColor: "#dc2626",
        strict: "warn",
        trust: false,
      });

      return { html: renderedHtml, error: null };
    } catch (err) {
      console.warn("KaTeX rendering error:", err);
      return {
        html: null,
        error: err instanceof Error ? err.message : "Invalid LaTeX syntax",
      };
    }
  }, [normalizedLatex, displayMode]);

  if (!normalizedLatex) {
    if (!showPlaceholder) return null;
    return (
      <div
        className={cn(
          "px-3 py-2 rounded border border-dashed border-slate-200 text-slate-400 text-sm",
          displayMode === "block" ? "w-full my-2" : "inline-block mx-1",
          className,
        )}
      >
        {placeholder}
      </div>
    );
  }

  if (error || html === null) {
    return (
      <div
        className={cn(
          "px-3 py-2 rounded border border-red-200 bg-red-50 text-red-600 font-serif text-sm break-all",
          displayMode === "block" ? "w-full my-2" : "inline-block mx-1",
          className,
        )}
        title={error ?? "Rendering Error"}
      >
        <span className="opacity-70 mr-2 text-xs uppercase font-bold">
          LaTeX Error:
        </span>
        {normalizedLatex}
      </div>
    );
  }

  const Container = displayMode === "inline" ? "span" : "div";

  return (
    <Container
      className={cn(
        "katex-display-wrapper break-words",
        displayMode === "inline" ? "inline" : "block",
        className,
      )}
      data-display-mode={displayMode}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};



const MathRenderer = React.memo(MathRendererComponent);
MathRenderer.displayName = "MathRenderer";

export { MathRenderer };
