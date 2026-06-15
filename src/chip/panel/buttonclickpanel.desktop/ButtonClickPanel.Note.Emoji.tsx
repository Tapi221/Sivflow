"use client";

import * as React from "react";
import type { Emoji } from "@emoji-mart/data";
import type { EmojiCategoryList, GridRow } from "@platejs/emoji";
import { EmojiSettings } from "@platejs/emoji";
import type { EmojiDropdownMenuOptions, UseEmojiPickerType } from "@platejs/emoji/react";
import { useEmojiDropdownMenuState } from "@platejs/emoji/react";
import * as Popover from "@radix-ui/react-popover";
import { SearchIcon, SmileIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

type EmojiPopoverProps = {
  children: React.ReactNode;
  control: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};
type EmojiPickerSearchBarProps = Pick<UseEmojiPickerType, "clearSearch" | "i18n" | "searchValue" | "setSearch">;
type EmojiPickerContentProps = Pick<
  UseEmojiPickerType,
  | "emojiLibrary"
  | "i18n"
  | "isSearching"
  | "onMouseOver"
  | "onSelectEmoji"
  | "refs"
  | "searchResult"
  | "settings"
  | "visibleCategories"
>;
type EmojiButtonProps = {
  emoji: Emoji;
  index: number;
  onMouseOver: (emoji?: Emoji) => void;
  onSelect: (emoji: Emoji) => void;
};
type RowOfButtonsProps = {
  row: GridRow;
} & Pick<UseEmojiPickerType, "emojiLibrary" | "onMouseOver" | "onSelectEmoji">;
type ButtonClickPanelNoteEmojiProps = {
  options?: EmojiDropdownMenuOptions;
} & React.ComponentPropsWithoutRef<typeof ToolbarButton>;

const EMOJI_FONT_FAMILY = "var(--emoji-font-family)";
const PLANE_EMOJI_SETTINGS = {
  ...EmojiSettings,
  buttonSize: {
    ...EmojiSettings.buttonSize,
    value: 32,
  },
  perLine: {
    ...EmojiSettings.perLine,
    value: 9,
  },
};
const EMOJI_PICKER_SCROLLBAR_CLASS_NAMES = [
  "[&::-webkit-scrollbar]:w-4",
  "[&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:size-0",
  "[&::-webkit-scrollbar-thumb]:min-h-11 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/25",
  "[&::-webkit-scrollbar-thumb]:border-4 [&::-webkit-scrollbar-thumb]:border-popover [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:bg-clip-padding",
];

const getEmojiNative = (emoji: Emoji) => emoji.skins[0].native;

const EmojiPopover = ({ children, control, isOpen, setIsOpen }: EmojiPopoverProps) => {
  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>{control}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-100"
          side="bottom"
          sideOffset={8}
          onClick={(event) => event.stopPropagation()}
          onFocus={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              return;
            }
            if (event.key === "Escape") {
              setIsOpen(false);
              return;
            }
            event.stopPropagation();
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
const EmojiPickerSearchBar = ({ clearSearch, i18n, searchValue, setSearch }: EmojiPickerSearchBarProps) => {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-popover px-3 py-3">
      <div className="relative flex grow items-center">
        <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <input
          className="block h-9 w-full appearance-none rounded-md border-[0.5px] border-border bg-transparent px-9 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          value={searchValue}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={i18n.search}
          aria-label="Search"
          autoComplete="off"
          type="text"
          autoFocus
        />
        {searchValue && (
          <button
            className="-translate-y-1/2 absolute top-1/2 right-1 flex size-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={clearSearch}
            title={i18n.clear}
            aria-label="Clear"
            type="button"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
};
const EmojiPicker = ({ clearSearch, emojiLibrary, i18n, isOpen, isSearching = false, refs, searchResult, searchValue, setSearch, settings = PLANE_EMOJI_SETTINGS, visibleCategories, onMouseOver, onSelectEmoji }: Omit<UseEmojiPickerType, "icons">) => {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    refs.current.contentRoot.current?.scrollTo({ top: 0 });
  }, [isOpen, refs]);
  return (
    <div
      data-slot="emoji-picker"
      className="isolate flex w-80 flex-col overflow-hidden rounded-md border-[0.5px] border-border bg-popover text-popover-foreground shadow-md"
    >
      <EmojiPickerSearchBar
        clearSearch={clearSearch}
        i18n={i18n}
        searchValue={searchValue}
        setSearch={setSearch}
      />
      <EmojiPickerContent
        onMouseOver={onMouseOver}
        onSelectEmoji={onSelectEmoji}
        emojiLibrary={emojiLibrary}
        i18n={i18n}
        isSearching={isSearching}
        refs={refs}
        searchResult={searchResult}
        settings={settings}
        visibleCategories={visibleCategories}
      />
    </div>
  );
};
const ButtonClickPanelNoteEmoji = ({ options, ...props }: ButtonClickPanelNoteEmojiProps) => {
  const { emojiPickerState, isOpen, setIsOpen } = useEmojiDropdownMenuState(options);
  return (
    <EmojiPopover
      control={
        <ToolbarButton pressed={isOpen} tooltip="Emoji" isDropdown {...props}>
          <SmileIcon />
        </ToolbarButton>
      }
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <EmojiPicker
        {...emojiPickerState}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        settings={options?.settings ?? PLANE_EMOJI_SETTINGS}
      />
    </EmojiPopover>
  );
};
const EmojiPickerContent = ({ emojiLibrary, i18n, isSearching = false, refs, searchResult, settings = PLANE_EMOJI_SETTINGS, visibleCategories, onMouseOver, onSelectEmoji }: EmojiPickerContentProps) => {
  const getRowWidth = settings.perLine.value * settings.buttonSize.value;
  const isCategoryVisible = React.useCallback(
    (categoryId: EmojiCategoryList) =>
      visibleCategories.has(categoryId)
        ? visibleCategories.get(categoryId)
        : false,
    [visibleCategories],
  );
  const EmojiList = React.useCallback(
    () =>
      emojiLibrary
        .getGrid()
        .sections()
        .map(({ id: categoryId }) => {
          const section = emojiLibrary.getGrid().section(categoryId);
          const { buttonSize } = settings;
          return (
            <div
              key={categoryId}
              ref={section.root}
              style={{ width: getRowWidth }}
              data-id={categoryId}
            >
              <div
                data-slot="emoji-picker-list-category-header"
                className="sticky top-0 z-1 bg-popover px-3 pt-1.5 pb-1.5 font-medium text-muted-foreground text-xs"
              >
                {i18n.categories[categoryId]}
              </div>
              <div
                className="relative flex flex-wrap"
                style={{ height: section.getRows().length * buttonSize.value }}
              >
                {isCategoryVisible(categoryId) &&
                  section
                    .getRows()
                    .map((row: GridRow) => (
                      <RowOfButtons
                        key={row.id}
                        onMouseOver={onMouseOver}
                        onSelectEmoji={onSelectEmoji}
                        emojiLibrary={emojiLibrary}
                        row={row}
                      />
                    ))}
              </div>
            </div>
          );
        }),
    [
      emojiLibrary,
      getRowWidth,
      i18n.categories,
      isCategoryVisible,
      onSelectEmoji,
      onMouseOver,
      settings,
    ],
  );
  const SearchList = React.useCallback(
    () => (
      <div style={{ width: getRowWidth }} data-id="search">
        <div
          data-slot="emoji-picker-list-category-header"
          className="sticky top-0 z-1 bg-popover px-3 pt-1.5 pb-1.5 font-medium text-muted-foreground text-xs"
        >
          {i18n.searchResult}
        </div>
        <div className="relative flex flex-wrap px-1.5">
          {searchResult.map((emoji: Emoji, index: number) => (
            <EmojiButton
              key={emoji.id}
              onMouseOver={onMouseOver}
              onSelect={onSelectEmoji}
              emoji={emojiLibrary.getEmoji(emoji.id)}
              index={index}
            />
          ))}
        </div>
      </div>
    ),
    [
      emojiLibrary,
      getRowWidth,
      i18n.searchResult,
      searchResult,
      onSelectEmoji,
      onMouseOver,
    ],
  );
  return (
    <div
      ref={refs.current.contentRoot}
      data-slot="emoji-picker-content"
      className={cn(
        "h-80 overflow-y-auto overflow-x-hidden outline-none",
        ...EMOJI_PICKER_SCROLLBAR_CLASS_NAMES,
      )}
      data-id="scroll"
    >
      <div ref={refs.current.content} className="pb-2 select-none">
        {isSearching ? SearchList() : EmojiList()}
      </div>
    </div>
  );
};
const EmojiButton = ({ emoji, index, onMouseOver, onSelect }: EmojiButtonProps) => {
  const nativeEmoji = getEmojiNative(emoji);
  return (
    <button
      data-slot="emoji-picker-list-emoji"
      className="flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-base leading-none hover:bg-accent"
      onClick={() => onSelect(emoji)}
      onMouseEnter={() => onMouseOver(emoji)}
      onMouseLeave={() => onMouseOver()}
      aria-label={nativeEmoji}
      data-index={index}
      tabIndex={-1}
      type="button"
    >
      <span
        className="relative"
        style={{ fontFamily: EMOJI_FONT_FAMILY }}
        data-emoji-set="native"
      >
        {nativeEmoji}
      </span>
    </button>
  );
};
const RowOfButtons = ({ emojiLibrary, row, onMouseOver, onSelectEmoji }: RowOfButtonsProps) => {
  return (
    <div key={row.id} className="flex scroll-my-1.5 px-1.5" data-index={row.id}>
      {row.elements.map((emojiId, index) => (
        <EmojiButton
          key={emojiId}
          onMouseOver={onMouseOver}
          onSelect={onSelectEmoji}
          emoji={emojiLibrary.getEmoji(emojiId)}
          index={index}
        />
      ))}
    </div>
  );
};

export { ButtonClickPanelNoteEmoji, EmojiPopover, EmojiPicker };
