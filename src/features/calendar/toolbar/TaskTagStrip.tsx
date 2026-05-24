import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { TagChip } from "@/components/tag/TagChip";
import {
  TAG_COLOR_CONTEXT_MENU_HEIGHT,
  TAG_COLOR_CONTEXT_MENU_MARGIN,
  TAG_COLOR_CONTEXT_MENU_WIDTH,
  TagColorRightClickPanel,
} from "@/chip/rightclickpanel/TagColorRightClickPanel";
import { getTagColorKey, type TagColorKey } from "@/features/tag/tagColor";
import { useTags } from "@/hooks/settings/useTags";
import { Plus, X } from "@/ui/icons";

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

type TagContextMenuState = {
  tagId: string;
  x: number;
  y: number;
};

type TagContextMenuTriggerEvent =
  | ReactMouseEvent<HTMLElement>
  | ReactPointerEvent<HTMLElement>;

const TAG_CONTEXT_MENU_NO_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "no-drag",
};

const clampTagContextMenuPosition = (
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const maxX = Math.max(
    TAG_COLOR_CONTEXT_MENU_MARGIN,
    window.innerWidth -
      TAG_COLOR_CONTEXT_MENU_WIDTH -
      TAG_COLOR_CONTEXT_MENU_MARGIN,
  );
  const maxY = Math.max(
    TAG_COLOR_CONTEXT_MENU_MARGIN,
    window.innerHeight -
      TAG_COLOR_CONTEXT_MENU_HEIGHT -
      TAG_COLOR_CONTEXT_MENU_MARGIN,
  );

  return {
    x: Math.min(Math.max(clientX, TAG_COLOR_CONTEXT_MENU_MARGIN), maxX),
    y: Math.min(Math.max(clientY, TAG_COLOR_CONTEXT_MENU_MARGIN), maxY),
  };
};

export const TaskTagStrip = () => {
  const { addTag, availableColors, tags, updateTagColor } = useTags();
  const [isCreating, setIsCreating] = useState(false);
  const [tagName, setTagName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<TagContextMenuState | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCreating) return;
    inputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) return;
      setContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    const closeMenu = () => setContextMenu(null);

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu, { once: true });
    window.addEventListener("scroll", closeMenu, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, { capture: true });
    };
  }, [contextMenu]);

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
    setContextMenu(null);
  };

  const openTagContextMenu = (
    event: TagContextMenuTriggerEvent,
    tagId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const { x, y } = clampTagContextMenuPosition(event.clientX, event.clientY);
    setContextMenu({ tagId, x, y });
  };

  const contextMenuTag = contextMenu
    ? tags.find((tag) => tag.id === contextMenu.tagId)
    : undefined;
  const contextMenuTagColorKey = contextMenuTag
    ? getTagColorKey(contextMenuTag.color)
    : undefined;

  const contextMenuElement =
    contextMenu && contextMenuTag && contextMenuTagColorKey ? (
      <TagColorRightClickPanel
        x={contextMenu.x}
        y={contextMenu.y}
        availableColors={availableColors}
        currentColorKey={contextMenuTagColorKey}
        tagName={contextMenuTag.name}
        menuRef={contextMenuRef}
        noDragStyle={TAG_CONTEXT_MENU_NO_DRAG_STYLE}
        onSelectColor={(colorKey) => {
          void handleUpdateTagColor(contextMenuTag.id, colorKey);
        }}
      />
    ) : null;

  return (
    <>
      <div className="flex h-8 min-w-0 flex-1 items-center rounded-xl bg-[#f7f7f7] p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2 px-1">
            {tags.map((tag) => {
              const tagColorKey = getTagColorKey(tag.color);

              return (
                <button
                  key={tag.id}
                  type="button"
                  className="group shrink-0 max-w-[180px] cursor-context-menu rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                  aria-label={`${tag.name}の色を変更`}
                  onClick={() => setContextMenu(null)}
                  onPointerDownCapture={(event) => {
                    if (event.button !== 2) return;
                    openTagContextMenu(event, tag.id);
                  }}
                  onContextMenu={(event) => openTagContextMenu(event, tag.id)}
                >
                  <TagChip
                    label={tag.name}
                    colorKey={tagColorKey}
                    className="pointer-events-none max-w-full text-[11px] font-semibold leading-[1.3] tabular-nums transition-[filter,box-shadow] duration-100 group-hover:brightness-[0.96] group-hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                  />
                </button>
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
                onClick={() => {
                  setContextMenu(null);
                  setIsCreating(true);
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#eeeeee] bg-white text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:text-[#5f656d]"
                aria-label="タグを追加"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {contextMenuElement ? createPortal(contextMenuElement, document.body) : null}
    </>
  );
};