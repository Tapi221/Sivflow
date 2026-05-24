import { useEffect, useRef, useState, type FormEvent } from "react";

import { TagChip } from "@/components/tag/TagChip";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { TagColorRightClickPanel } from "@/chip/rightclickpanel/TagColorRightClickPanel";
import { getTagColorKey, type TagColorKey } from "@/features/tag/tagColor";
import { useTags } from "@/hooks/settings/useTags";
import { Plus, X } from "@/ui/icons";

export const TaskTagStrip = () => {
  const { addTag, availableColors, tags, updateTagColor } = useTags();
  const [isCreating, setIsCreating] = useState(false);
  const [tagName, setTagName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [openTagId, setOpenTagId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isCreating) return;
    inputRef.current?.focus();
  }, [isCreating]);

  const handleCancelCreate = () => {
    setIsCreating(false);
    setTagName("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTagName = tagName.trim();
    if (!trimmedTagName || isSaving) return;

    setIsSaving(true);
    try {
      await addTag(trimmedTagName);
      setTagName("");
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTagColor = async (
    tagId: string,
    colorKey: TagColorKey,
  ) => {
    await updateTagColor(tagId, colorKey);
    setOpenTagId(null);
  };

  return (
    <div className="flex h-8 min-w-0 flex-1 items-center rounded-xl bg-[#f7f7f7] p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-2 px-1">
          {tags.map((tag) => {
            const tagColorKey = getTagColorKey(tag.color);

            return (
              <Popover
                key={tag.id}
                open={openTagId === tag.id}
                onOpenChange={(open) => setOpenTagId(open ? tag.id : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 max-w-[180px] rounded-full text-left transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                    aria-label={`${tag.name}の色を変更`}
                  >
                    <TagChip
                      label={tag.name}
                      colorKey={tagColorKey}
                      className="pointer-events-none max-w-full text-[11px] font-semibold leading-[1.3] tabular-nums"
                    />
                  </button>
                </PopoverTrigger>

                <TagColorRightClickPanel
                  availableColors={availableColors}
                  currentColorKey={tagColorKey}
                  tagName={tag.name}
                  onSelectColor={(colorKey) => {
                    void handleUpdateTagColor(tag.id, colorKey);
                  }}
                />
              </Popover>
            );
          })}

          {isCreating ? (
            <form
              className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-[#eeeeee] bg-white px-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              <input
                ref={inputRef}
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    handleCancelCreate();
                  }
                }}
                disabled={isSaving}
                placeholder="タグ名"
                className="h-full w-24 min-w-0 bg-transparent text-[12px] font-medium text-[#3f4652] outline-none placeholder:text-[#a6adba]"
              />

              <button
                type="submit"
                disabled={!tagName.trim() || isSaving}
                className="grid h-5 w-5 place-items-center rounded-full text-[#8c8c8c] transition-colors hover:bg-[#f2f2f2] disabled:cursor-default disabled:opacity-40"
                aria-label="タグを追加"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCancelCreate}
                disabled={isSaving}
                className="grid h-5 w-5 place-items-center rounded-full text-[#a0a0a0] transition-colors hover:bg-[#f2f2f2] disabled:cursor-default disabled:opacity-40"
                aria-label="タグ追加をキャンセル"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#eeeeee] bg-white text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:text-[#5f656d]"
              aria-label="タグを追加"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};