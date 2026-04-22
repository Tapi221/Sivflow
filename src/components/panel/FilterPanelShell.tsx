import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { PanelSearchField } from "./PanelSearchField";

interface FilterPanelShellProps {
  title: string;
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

export const FilterPanelShell = ({
  title,
  searchValue,
  searchPlaceholder = "検索...",
  onSearchChange,
  searchInputRef,
  headerAction,
  sections,
  children,
  className,
  bodyClassName,
  bodyRef,
}: FilterPanelShellProps) => {
  const shouldRenderSearch = typeof onSearchChange === "function";

  return (
    <div className={cn("ds-filter-panel flex h-full min-h-0 flex-col", className)}>
      <div className="ds-filter-section bg-transparent p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="ds-filter-section__title text-xs font-semibold">
            {title}
          </span>
          {headerAction}
        </div>

        {shouldRenderSearch ? (
          <PanelSearchField
            value={searchValue ?? ""}
            placeholder={searchPlaceholder}
            onChange={onSearchChange}
            inputRef={searchInputRef}
          />
        ) : null}
      </div>

      {sections ? sections : null}

      <div
        ref={bodyRef}
        className={cn("min-h-0 flex-1 overflow-y-auto bg-transparent p-1", bodyClassName)}
      >
        {children}
      </div>
    </div>
  );
};
