import * as React from "react";
import { Check, Plus, Tag as TagIcon, Palette } from "@/ui/icons";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlaceholderText } from "@/components/ui/placeholder-text";
import { useTags } from "@/hooks/settings/useTags";
import { TagBadge } from "@/components/tag/TagBadge";
import { TagChip } from "@/components/tag/TagChip";
import { getTagColorSwatchStyle, type TagColorKey } from "@/lib/tags/tagColor";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  quietHover?: boolean;
}

export const TagInput = ({
  tags = [],
  onChange,
  placeholder = "タグを選択...",
  className,
  quietHover = false,
}: TagInputProps) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState<TagColorKey | null>(
    null,
  );

  const { tags: allTags, availableColors, addTag, getTagColor } = useTags();

  const handleUnselect = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSelect = (tag: string) => {
    if (tags.includes(tag)) {
      handleUnselect(tag);
    } else {
      onChange([...tags, tag]);
    }
  };

  const handleCreateTag = async () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      await addTag(trimmed, selectedColor || availableColors[0]);
      onChange([...tags, trimmed]);
      setInputValue("");
      setSelectedColor(null);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(tags);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onChange(items);
  };

  const uniqueTags = React.useMemo(() => {
    return allTags ? allTags.map((t) => t.name).sort() : [];
  }, [allTags]);

  const filteredTags = uniqueTags.filter((tag) =>
    tag.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "ds-tag-input w-full flex flex-col py-0 px-0 bg-transparent border-none rounded-none",
          !quietHover && "transition-all",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-1.5 w-full items-center">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="tags-list" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-wrap gap-1.5"
                >
                  {tags.map((tag, index) => {
                    const colorClass = getTagColor(tag);
                    return (
                      <Draggable key={tag} draggableId={tag} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <TagChip
                              label={tag}
                              colorClass={colorClass}
                              badgeClassName={cn(
                                "select-none",
                                quietHover &&
                                  "transition-none shadow-none [&_button]:hover:bg-transparent [&_button]:hover:text-slate-500",
                                snapshot.isDragging &&
                                  "scale-105 shadow-md z-50",
                              )}
                              onRemove={() => handleUnselect(tag)}
                              removeAriaLabel={`${tag}を削除`}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <PopoverTrigger asChild>
            <button
              className={cn(
                "ds-tag-input__trigger flex items-center gap-1 h-7 px-0",
                quietHover ? "hover:text-inherit" : "transition-colors",
              )}
              onClick={() => setOpen(true)}
            >
              {tags.length === 0 && (
                <PlaceholderText className="text-[length:var(--surface-placeholder-font-size)] font-normal normal-case tracking-normal">
                  {placeholder}
                </PlaceholderText>
              )}
              {tags.length > 0 && <Plus className="w-3.5 h-3.5" />}
            </button>
          </PopoverTrigger>
        </div>
      </div>
      <PopoverContent
        surface="floating"
        className="ds-tag-input__panel"
        align="start"
      >
        <Command
          className="border-none bg-transparent shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim()) {
              // もし既存のタグに一致するものがない新規タグなら作成・追加する
              const exists = uniqueTags.some(
                (t) => t.toLowerCase() === inputValue.trim().toLowerCase(),
              );
              if (!exists) {
                e.preventDefault();
                handleCreateTag();
              }
            }
          }}
        >
          <div className="p-3">
            <CommandInput
              placeholder="タグを検索・作成..."
              value={inputValue}
              onValueChange={setInputValue}
              className="ds-input h-6 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[350px]">
            {inputValue &&
              !uniqueTags.some(
                (t) => t.toLowerCase() === inputValue.toLowerCase(),
              ) && (
                <div className="p-3 space-y-3">
                  <div
                    className="ds-tag-input__create flex items-center gap-2 p-2 cursor-pointer text-xs font-bold"
                    onClick={handleCreateTag}
                  >
                    <Plus className="w-4 h-4" />「{inputValue}」を新しく作成
                  </div>

                  <div className="px-1">
                    <div className="ds-command__group-title mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                      <Palette className="w-3.5 h-3.5" /> カラーを選択
                    </div>
                    <div className="ds-tag-input__swatches flex flex-wrap gap-2.5 p-2">
                      {availableColors.map((colorKey) => (
                        <button
                          type="button"
                          key={colorKey}
                          aria-label={`${colorKey}を選択`}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 ring-1 ring-slate-300/70 shadow-sm transition-all",
                            selectedColor === colorKey ||
                              (!selectedColor &&
                                colorKey === availableColors[0])
                              ? "ring-2 ring-offset-2 ring-primary-600 scale-110 shadow-md"
                              : "hover:scale-105 hover:ring-slate-400",
                          )}
                          style={getTagColorSwatchStyle(colorKey)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColor(colorKey);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            <CommandGroup
              heading={
                <span className="ds-command__group-title px-2 text-[10px] font-bold uppercase tracking-widest">
                  既存のタグ
                </span>
              }
            >
              {filteredTags.length === 0 && !inputValue && (
                <div className="py-6 text-center">
                  <TagIcon className="w-8 h-8 text-[var(--surface-placeholder-text)] opacity-35 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-[var(--surface-placeholder-text)] uppercase tracking-widest">
                    タグがありません
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-1 p-1">
                {filteredTags.map((tag) => {
                  const colorClass = getTagColor(tag);
                  const isSelected = tags.includes(tag);
                  return (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => handleSelect(tag)}
                      className={cn(
                        "flex items-center justify-between",
                        isSelected ? "ds-command__item--selected" : "",
                      )}
                    >
                      <TagBadge
                        label={tag}
                        size="xs"
                        colorClass={colorClass}
                        className="max-w-[220px]"
                      />
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--ds-semantic-color-action-primary)]" />
                      )}
                    </CommandItem>
                  );
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
