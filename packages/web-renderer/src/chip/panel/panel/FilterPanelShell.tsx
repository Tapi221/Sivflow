import { PanelSearchField } from "@web-renderer/chip/panel/panel/PanelSearchField";
import { cn } from "@web-renderer/lib/utils";
import type { ReactNode, Ref } from "react";

interface FilterPanelShellProps {
  title?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchInputRef?: Ref<HTMLInputElement>;
  headerAction?: ReactNode;
  sections?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyRef?: Ref<HTMLDivElement>;
}

const FilterPanelShell = ({ title, searchValue, searchPlaceholder = "検索...", onSearchChange, searchInputRef, headerAction, sections, children, className, bodyClassName, bodyRef }: FilterPanelShellProps) => {
  const shouldRenderSearch = typeof onSearchChange === "function";
  const shouldRenderTitle = Boolean(title);
  const shouldRenderHeader = shouldRenderTitle || Boolean(headerAction);
  const hasSections = sections !== null && sections !== undefined;
  return (
    <div
      className={cn("ds-filter-panel flex h-full min-h-0 flex-col", className)}
    >
      <div className="ds-filter-section ds-floating-panel__section ds-floating-panel__section--spacious">
        {shouldRenderHeader && (
          <div className="ds-floating-panel__header mb-2">
            {shouldRenderTitle && (
              <span className="ds-filter-section__title ds-floating-panel__title text-xs font-semibold">
                {title}
              </span>
            )}
            {headerAction}
          </div>
        )}
        {shouldRenderSearch && (
          <PanelSearchField
            value={searchValue ?? ""}
            placeholder={searchPlaceholder}
            onChange={onSearchChange}
            inputRef={searchInputRef}
          />
        )}
      </div>
      {hasSections && sections}
      <div
        ref={bodyRef}
        className={cn(
          "ds-floating-panel__body min-h-0 flex-1 overflow-y-auto bg-transparent",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export { FilterPanelShell };
export type { FilterPanelShellProps };
