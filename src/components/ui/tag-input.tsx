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
import { useTags } from "@/hooks/useTags";
import { TagBadge } from "@/components/tag/TagBadge";
import { TagChip } from "@/components/tag/TagChip";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  quietHover?: boolean;
}

export function TagInput({
  tags = [],
  onChange,
  placeholder = "タグを選択...",
  className,
  quietHover = false,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null);

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
          "w-full flex flex-col min-h-0 py-0 px-0 bg-transparent border-none rounded-none cursor-text",
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
                "flex items-center gap-1 h-7 px-0 text-[var(--surface-placeholder-text)]",
                quietHover ? "" : "hover:text-slate-400 transition-colors",
              )}
              onClick={() => setOpen(true)}
            >
              {tags.length === 0 && (
                <span className="text-[length:var(--surface-placeholder-font-size)] font-normal normal-case tracking-normal text-[var(--surface-placeholder-text)]">
                  {placeholder}
                </span>
              )}
              {tags.length > 0 && <Plus className="w-3.5 h-3.5" />}
            </button>
          </PopoverTrigger>
        </div>
      </div>
      <PopoverContent
        className="w-[320px] p-0 rounded-xl surface-dialog-convex overflow-hidden"
        align="start"
      >
        <Command
          className="bg-white"
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
          <div className="p-3 border-b border-slate-50">
            <CommandInput
              placeholder="タグを検索・作成..."
              value={inputValue}
              onValueChange={setInputValue}
              className="h-6 rounded-lg border border-[var(--surface-border)] bg-white text-[#202123] surface-concave placeholder:text-[var(--surface-placeholder-text)] focus:ring-0 focus:border-[#cfcfcf] focus:bg-white"
            />
          </div>
          <CommandList className="max-h-[350px]">
            {inputValue &&
              !uniqueTags.some(
                (t) => t.toLowerCase() === inputValue.toLowerCase(),
              ) && (
                <div className="p-3 space-y-3">
                  <div
                    className="flex items-center gap-2 p-2 rounded-xl bg-primary-50 text-primary-600 cursor-pointer text-xs font-bold transition-all hover:bg-primary-100"
                    onClick={handleCreateTag}
                  >
                    <Plus className="w-4 h-4" />「{inputValue}」を新しく作成
                  </div>

                  <div className="px-1">
                    <div className="text-xs text-slate-600 mb-2 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5" /> カラーを選択
                    </div>
                    <div className="flex flex-wrap gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                      {availableColors.map((color) => (
                        <button
                          key={color}
                          aria-label={`${color.split(" ")[0]}を選択`}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 ring-1 ring-slate-300/70 shadow-sm transition-all",
                            color.split(" ")[0],
                            color.split(" ")[2],
                            selectedColor === color ||
                              (!selectedColor && color === availableColors[0])
                              ? "ring-2 ring-offset-2 ring-primary-600 scale-110 shadow-md"
                              : "hover:scale-105 hover:ring-slate-400",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColor(color);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            <CommandGroup
              heading={
                <span className="text-[10px] font-bold text-[var(--surface-placeholder-text)] uppercase tracking-widest px-2">
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
                        "flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-all border border-transparent",
                        isSelected
                          ? "bg-primary-50/30 border-primary-100/50"
                          : "hover:bg-slate-50",
                      )}
                    >
                      <TagBadge
                        label={tag}
                        size="xs"
                        colorClass={colorClass}
                        className="max-w-[220px]"
                      />
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary-700" />
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
}
