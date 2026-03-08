import React, { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  latex: string;
  displayMode?: "block" | "inline";
  className?: string;
}

/**
 * KaTeXレンダラーコンポーネント（最適化版）
 * 唯一のレンダリング窓口となり、renderToString + useMemo で高速化を実現
 */
export const MathRenderer: React.FC<MathRendererProps> = React.memo(
  ({ latex, displayMode = "block", className = "" }) => {
    // レンダリング結果のキャッシュ
    const { html, error } = useMemo(() => {
      if (!latex || !latex.trim()) {
        return { html: null, error: null };
      }
      try {
        // 非常に長い文字列の制限（パフォーマンス・セキュリティの安全弁）
        if (latex.length > 5000) {
          throw new Error("LaTeX string is too long");
        }

        const renderedHtml = katex.renderToString(latex, {
          displayMode: displayMode === "block",
          throwOnError: false, // エラーを投げずに内部で処理
          errorColor: "#dc2626",
          strict: "warn",
          trust: false, // セキュリティ: 危険なマクロを無効化
        });

        return { html: renderedHtml, error: null };
      } catch (err) {
        console.warn("KaTeX rendering error:", err);
        return {
          html: null,
          error: err instanceof Error ? err.message : "Invalid LaTeX syntax",
        };
      }
    }, [latex, displayMode]);

    // 数式が空の場合は何も表示しない
    if (!latex || !latex.trim()) {
      return null;
    }

    // 解析エラー時のフォールバックUI
    if (error || html === null) {
      return (
        <div
          className={cn(
            "px-3 py-2 rounded border border-red-200 bg-red-50 text-red-600 font-serif text-sm break-all",
            displayMode === "block" ? "w-full my-2" : "inline-block mx-1",
            className,
          )}
          title={error || "Rendering Error"}
        >
          <span className="opacity-70 mr-2 text-[10px] uppercase font-bold">
            LaTeX Error:
          </span>
          {latex}
        </div>
      );
    }

    // 正常時のレンダリング
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
  },
);

MathRenderer.displayName = "MathRenderer";



