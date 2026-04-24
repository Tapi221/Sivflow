import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface SectionListBlankPaneProps {
  className?: string;
  sidebarWidth: number;
  topOffsetPx: number;
  leftInsetPx?: number;
  rightInsetPx?: number;
}

/**
 * セクション一覧モードで、左サイドバー右側の空白領域に表示する
 * ただの白いコンテンツパネル。
 */
export const SectionListBlankPane = ({
  className,
  sidebarWidth,
  topOffsetPx,
  leftInsetPx = 12,
  rightInsetPx = 12,
}: SectionListBlankPaneProps) => {
  const panelGapPx = 16;
  const bottomInsetPx = 12;

  const style = {
    left: `${leftInsetPx + sidebarWidth + panelGapPx}px`,
    right: `${rightInsetPx}px`,
    top: `${topOffsetPx}px`,
    bottom: `${bottomInsetPx}px`,
  } satisfies CSSProperties;

  return (
    <div
      style={style}
      className={cn(
        "fixed z-0 hidden min-h-0 min-w-0 bg-transparent md:block",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[14px]",
          "border border-[#dddcd5]",
          "bg-[rgba(255,255,255,0.92)]",
          "shadow-[0_16px_36px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]",
          "backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]",
        )}
      />
    </div>
  );
};
