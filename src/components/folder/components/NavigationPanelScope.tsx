import { cn } from "@/lib/utils";

type NavigationPanelScopeProps = {
  scopeName: string | null;
  folderCount: number;
  cardSetCount: number;
  itemCount: number;
  className?: string;
};

export const NavigationPanelScope = ({
  scopeName,
  folderCount,
  cardSetCount,
  itemCount,
  className,
}: NavigationPanelScopeProps) => {
  const hasEntries = folderCount + cardSetCount + itemCount > 0;

  return (
    <div
      className={cn(
        "ds-filter-section ds-floating-panel__section ds-floating-panel__section--spacious border-t border-border/60",
        className,
      )}
    >
      <div className="space-y-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          表示範囲
        </div>
        <div className="text-sm font-semibold text-foreground">
          {scopeName ?? "ルート"}
        </div>
        <div className="text-xs text-muted-foreground">
          {hasEntries
            ? `${folderCount} フォルダ ・ ${cardSetCount} セット ・ ${itemCount} アイテム`
            : "表示できる項目はありません"}
        </div>
      </div>
    </div>
  );
};
