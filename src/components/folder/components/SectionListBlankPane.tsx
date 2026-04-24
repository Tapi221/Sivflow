import { cn } from "@/lib/utils";

interface SectionListBlankPaneProps {
  className?: string;
}

/**
 * セクション一覧モードで、左サイドバー右側の空白領域に表示する
 * ただの白いコンテンツパネル。
 */
export const SectionListBlankPane = ({
  className,
}: SectionListBlankPaneProps) => {
  return (
    <div
      className={cn(
        "hidden min-h-0 min-w-0 flex-1 bg-transparent pl-4 pr-3 md:flex",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "h-full min-h-0 w-full overflow-hidden rounded-[14px]",
          "border border-[#dddcd5]",
          "bg-[rgba(255,255,255,0.92)]",
          "shadow-[0_16px_36px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]",
          "backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)]",
        )}
      />
    </div>
  );
};
