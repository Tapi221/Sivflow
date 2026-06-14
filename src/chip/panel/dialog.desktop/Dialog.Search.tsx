import { useMemo, useRef } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Command, CommandItem, CommandList } from "@/chip/ui/command";
import { Dialog, DialogContent } from "@/chip/ui/dialog/dialog";
import { ExplorerRowContent } from "@/components/folder/explorer/rows/ExplorerRowContent";
import { EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS, EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS, EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS, EXPLORER_ROW_BASE_CLASS_NAME, EXPLORER_ROW_CONTENT_CLASS, EXPLORER_ROW_ICON_SLOT_CLASS, FOLDER_ROW_ICON_SIZE_CLASS, FOLDER_ROW_TITLE_CLASS } from "@/components/folder/explorer/rows/shared";
import { useSearchHotkey } from "@/features/hotkey/useSearchHotkey";
import { rankSearchResults } from "@/features/search/lib/rankSearchResults";
import type { SearchIconKind, SearchItem } from "@/features/search/model/search.types";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { cn } from "@/lib/utils";
import { Calendar, FileText, Folder, Image, Layers, List, MessageSquare, Search, SearchX, Settings2, Tag, Trash2, X } from "@/chip/icons";
import { toMillis } from "@/utils/toMillis";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const resolveTimestampLabel = (value: unknown) => {
  const timestampMillis = toMillis(value, 0);

  if (timestampMillis <= 0) return null;

  const timestamp = new Date(timestampMillis);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()).getTime();
  const diffDays = Math.floor((todayStart - targetStart) / DAY_IN_MS);

  if (diffDays <= 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  if (timestamp.getFullYear() === now.getFullYear()) return `${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
  return `${timestamp.getFullYear()}/${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
};
const resolveItemIcon = (item: SearchItem) => {
  const iconKind: SearchIconKind = item.iconKind ?? (item.kind === "action" ? "directory" : item.kind);

  switch (iconKind) {
    case "folder":
    case "folders":
      return Folder;
    case "cardSet":
      return Layers;
    case "card":
      return MessageSquare;
    case "document":
      return FileText;
    case "calendar":
      return Calendar;
    case "gallery":
      return Image;
    case "trash":
      return Trash2;
    case "settings":
      return Settings2;
    case "tagMap":
      return Tag;
    case "directory":
    default:
      return List;
  }
};

const SearchDialog = () => {
  useSearchHotkey();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const isOpen = useSearchStore((state) => state.isOpen);
  const open = useSearchStore((state) => state.open);
  const close = useSearchStore((state) => state.close);
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const sources = useSearchStore((state) => state.sources);

  const allItems = useMemo(() => Object.values(sources).flatMap((source) => source.items), [sources]);
  const rankedItems = useMemo(() => rankSearchResults({ items: allItems, query, limit: 24 }), [allItems, query]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      open();
      return;
    }

    close();
  };

  const handleItemSelect = (item: SearchItem) => {
    close();
    window.requestAnimationFrame(() => {
      item.onSelect();
    });
  };

  const emptyTitle = query.trim().length > 0 ? "一致する項目がありません" : "検索できる項目がありません";
  const emptyDescription = query.trim().length > 0 ? "別のキーワードで試してください。" : "フォルダ画面でデータが読み込まれると、ここに候補が表示されます。";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        surface="plain"
        accessibleTitle="検索"
        accessibleDescription="フォルダ、カード、ドキュメント、各種画面を横断検索します。"
        className="gs-dialog !w-[min(600px,calc(100vw-32px))] !max-w-none !p-0"
        overlayClassName="gs-dialog__overlay"
        contentWrapperClassName="gs-dialog__positioner"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <Command loop shouldFilter={false} className="gs-command">
          <div className="gs-searchbar">
            <Search className="gs-searchbar__icon" />
            <CommandPrimitive.Input ref={inputRef} value={query} onValueChange={setQuery} placeholder="検索..." aria-label="検索" className="gs-searchbar__input" />
            {query.trim().length > 0 ? (
              <button type="button" className="gs-searchbar__clear" onClick={() => {
                setQuery(""); inputRef.current?.focus(); }} aria-label="検索語をクリア"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {rankedItems.length > 0 ? (
            <CommandList className="gs-results">
              {rankedItems.map((item) => {
                const Icon = resolveItemIcon(item);
                const timestampLabel = resolveTimestampLabel(item.timestampValue);

                return (
                  <CommandItem key={item.id} value={item.value} className={cn(EXPLORER_ROW_BASE_CLASS_NAME, EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS, EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS, EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS, "gs-row")} onSelect={() => {
                    handleItemSelect(item); }}
                  >
                    <ExplorerRowContent
                      left={<span className={cn(EXPLORER_ROW_ICON_SLOT_CLASS, "gs-row__icon-slot")}><Icon className={cn(FOLDER_ROW_ICON_SIZE_CLASS, "gs-row__icon")} /></span>}
                      title={item.title}
                      right={timestampLabel ? <span className="gs-row__timestamp">{timestampLabel}</span> : null}
                      contentClassName={cn(EXPLORER_ROW_CONTENT_CLASS, "gs-row__content")}
                      titleClassName={cn(FOLDER_ROW_TITLE_CLASS, "gs-row__title")}
                    />
                  </CommandItem>
                );
              })}
            </CommandList>
          ) : (
            <div className="gs-empty">
              <SearchX className="gs-empty__icon" />
              <p className="gs-empty__title">{emptyTitle}</p>
              <p className="gs-empty__description">{emptyDescription}</p>
            </div>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export { SearchDialog };
