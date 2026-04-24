import { useMemo, useRef } from "react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Calendar,
  FileText,
  Folder,
  Image,
  Layers,
  List,
  MessageSquare,
  Search,
  SearchX,
  Settings2,
  Tag,
  Trash2,
  X,
} from "@/ui/icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import type {
  GlobalSearchIconKind,
  GlobalSearchItem,
} from "@/features/global-search/model/globalSearchTypes";
import { rankGlobalSearchResults } from "@/features/global-search/lib/rankGlobalSearchResults";
import { useGlobalSearchHotkey } from "@/features/global-search/hooks/useGlobalSearchHotkey";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { toMillis } from "@/utils/toMillis";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const resolveTimestampLabel = (value: unknown) => {
  const timestampMillis = toMillis(value, 0);

  if (timestampMillis <= 0) {
    return null;
  }

  const timestamp = new Date(timestampMillis);
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const targetStart = new Date(
    timestamp.getFullYear(),
    timestamp.getMonth(),
    timestamp.getDate(),
  ).getTime();
  const diffDays = Math.floor((todayStart - targetStart) / DAY_IN_MS);

  if (diffDays <= 0) {
    return "今日";
  }

  if (diffDays === 1) {
    return "昨日";
  }

  if (diffDays < 7) {
    return `${diffDays}日前`;
  }

  if (timestamp.getFullYear() === now.getFullYear()) {
    return `${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
  }

  return `${timestamp.getFullYear()}/${timestamp.getMonth() + 1}/${timestamp.getDate()}`;
};

const resolveItemIcon = (item: GlobalSearchItem) => {
  const iconKind: GlobalSearchIconKind =
    item.iconKind ?? (item.kind === "action" ? "directory" : item.kind);

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

export const GlobalSearchDialog = () => {
  useGlobalSearchHotkey();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const isOpen = useGlobalSearchStore((state) => state.isOpen);
  const open = useGlobalSearchStore((state) => state.open);
  const close = useGlobalSearchStore((state) => state.close);
  const query = useGlobalSearchStore((state) => state.query);
  const setQuery = useGlobalSearchStore((state) => state.setQuery);
  const sources = useGlobalSearchStore((state) => state.sources);

  const allItems = useMemo(() => {
    return Object.values(sources).flatMap((source) => source.items);
  }, [sources]);

  const rankedItems = useMemo(() => {
    return rankGlobalSearchResults({
      items: allItems,
      query,
      limit: 24,
    });
  }, [allItems, query]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      open();
      return;
    }

    close();
  };

  const handleItemSelect = (item: GlobalSearchItem) => {
    close();
    window.requestAnimationFrame(() => {
      item.onSelect();
    });
  };

  const emptyTitle =
    query.trim().length > 0
      ? "一致する項目がありません"
      : "検索できる項目がありません";
  const emptyDescription =
    query.trim().length > 0
      ? "別のキーワードで試してください。"
      : "フォルダ画面でデータが読み込まれると、ここに候補が表示されます。";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        surface="plain"
        aria-label="グローバル検索"
        className="gs-dialog !w-[min(600px,calc(100vw-32px))] !max-w-none !p-0"
        overlayClassName="gs-dialog__overlay"
        contentWrapperClassName="gs-dialog__positioner"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <Command loop shouldFilter={false} className="gs-command">
          <div className="gs-searchbar">
            <Search className="gs-searchbar__icon" />
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="検索、または質問..."
              aria-label="検索、または質問"
              className="gs-searchbar__input"
            />
            {query.trim().length > 0 ? (
              <button
                type="button"
                className="gs-searchbar__clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="検索語をクリア"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            ) : null}
          </div>

          {rankedItems.length > 0 ? (
            <CommandList className="gs-results">
              {rankedItems.map((item) => {
                const Icon = resolveItemIcon(item);
                const timestampLabel = resolveTimestampLabel(
                  item.timestampValue,
                );
                const titleAttribute = item.subtitle
                  ? `${item.title} - ${item.subtitle}`
                  : item.title;

                return (
                  <CommandItem
                    key={item.id}
                    value={item.value}
                    className="gs-row"
                    onSelect={() => {
                      handleItemSelect(item);
                    }}
                    title={titleAttribute}
                  >
                    <span className="gs-row__icon">
                      <Icon className="h-[16px] w-[16px]" />
                    </span>
                    <span className="gs-row__title">{item.title}</span>
                    {timestampLabel ? (
                      <span className="gs-row__timestamp">
                        {timestampLabel}
                      </span>
                    ) : null}
                    <span className="gs-row__enter-badge">Enter</span>
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
