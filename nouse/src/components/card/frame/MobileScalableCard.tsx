import React, { useEffect, useRef, useState } from "react";
import { cn } from "@web-renderer/lib/utils";
import { CARD_BASE_WIDTH, CARD_DISPLAY_SCALE } from "@/domain/card/cardGeometry.constants";



interface MobileScalableCardProps {
  children: React.ReactNode;
  cardDesignWidth?: number;
  safePadding?: number;
  enableEditMode?: boolean;
  className?: string;
}



const CARD_DISPLAY_WIDTH = Math.round(CARD_BASE_WIDTH * CARD_DISPLAY_SCALE);



/**
 * モバイル縮小表示ラッパー
 *
 * 紙型カード（固定幅480px）をモバイル画面でも横スクロールなしで表示するため、
 * 画面幅に応じてカード全体を縮小する。
 *
 * @param cardDesignWidth - カードの設計幅（px）。デフォルト480px
 * @param safePadding - 左右の安全マージン（合計px）。デフォルト24px
 * @param enableEditMode - 編集モードを有効化するか（将来の拡張用）
 */
const MobileScalableCard = ({
  children,
  cardDesignWidth = CARD_DISPLAY_WIDTH,
  safePadding = 24,
  enableEditMode = false,
  className,
}: MobileScalableCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === "undefined") return;

      const host = containerRef.current;
      const parentWidth =
        host?.parentElement?.getBoundingClientRect?.().width ??
        host?.getBoundingClientRect?.().width ??
        window.innerWidth;
      const availableWidth = Math.max(0, parentWidth - safePadding);
      const calculatedScale = Math.min(1, availableWidth / cardDesignWidth);

      setScale(calculatedScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(document.body);
    }

    return () => {
      window.removeEventListener("resize", updateScale);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [cardDesignWidth, safePadding]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => {
      const nextHeight = Math.max(0, Math.ceil(content.offsetHeight));
      setContentHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enableEditMode) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setIsEditMode(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (
            activeElement?.tagName !== "INPUT" &&
            activeElement?.tagName !== "TEXTAREA"
          ) {
            setIsEditMode(false);
          }
        }, 100);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [enableEditMode]);

  useEffect(() => {
    if (!isEditMode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditMode(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isEditMode]);

  return (
    <>
      {isEditMode && enableEditMode && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setIsEditMode(false)}
          style={{ touchAction: "none" }}
        />
      )}

      <div
        ref={containerRef}
        className={cn(
          "w-full mx-auto transition-[height] duration-300 ease-out",
          isEditMode &&
          enableEditMode &&
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          className,
        )}
        style={{
          height:
            !isEditMode && (contentHeight !== null && contentHeight !== undefined)
              ? `${Math.ceil(contentHeight * scale)}px`
              : undefined,
        }}
      >
        <div
          style={{
            width: `${Math.max(1, cardDesignWidth)}px`,
            margin: "0 auto",
            transform:
              isEditMode && enableEditMode ? "scale(1)" : `scale(${scale})`,
            transformOrigin: "top center",
            willChange: "transform",
          }}
        >
          <div ref={contentRef}>{children}</div>
        </div>
      </div>
    </>
  );
};



export { MobileScalableCard };
