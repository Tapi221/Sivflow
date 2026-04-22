import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { floatingPanelPresets } from "@/components/ui/menu-styles";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { Filter } from "@/ui/icons";
import { useState } from "react";
import { TagFilterPanel } from "./TagFilterPanel";

interface TagFilterPopoverProps {
  allTags: string[];
  className?: string;
}

export const TagFilterPopover = ({
  allTags,
  className,
}: TagFilterPopoverProps) => {
  const {
    tagFilter,
    uncertaintyFilter,
    bookmarkedFilter,
    draftFilter,
    contentTypeFilter,
  } = useExplorerStore();
  const [isOpen, setIsOpen] = useState(false);
  const panelPreset = floatingPanelPresets.filter;

  const isFilterActive =
    tagFilter.length > 0 ||
    uncertaintyFilter !== "any" ||
    bookmarkedFilter !== "any" ||
    draftFilter !== "any" ||
    contentTypeFilter.length < 2;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="タグフィルターを開く"
          className={cn(
            "ds-filter-toggle flex items-center justify-center px-2 py-1 text-xs font-medium whitespace-nowrap",
            isFilterActive && "ds-filter-toggle--active",
            className,
          )}
        >
          <Filter className="h-4 w-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        className={cn(panelPreset.className, "w-64")}
        surface={panelPreset.surface}
      >
        <TagFilterPanel allTags={allTags} isOpen={isOpen} />
      </PopoverContent>
    </Popover>
  );
};
