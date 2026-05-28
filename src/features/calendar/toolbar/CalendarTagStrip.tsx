import { memo, useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { TAG_COLOR_CONTEXT_MENU_HEIGHT, TAG_COLOR_CONTEXT_MENU_WIDTH, TagColorRightClickPanel } from "@/chip/rightclickpanel.desktop/TagColorRightClickPanel";
import { RIGHT_CLICK_PANEL_NO_DRAG_STYLE, clampRightClickPanelPosition, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { getTagColorKey, type TagColorKey } from "@/chip/tag/tagColor";
import { TagChip } from "@/components/tag/TagChip";
import { useTags } from "@/features/settings/hooks/useTags";
import { ChevronLeft, ChevronRight, Plus, Tag, X } from "@/ui/icons";

type TagContextMenuState = {
  tagId: string;
  x: number;
  y: number;
};

type TagContextMenuTriggerEvent = ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>;

const TAG_COLOR_CONTEXT_PANEL_ID = "tag-color-context-menu";
const TAG_PANEL_LAYOUT_TRANSITION = {
  type: "spring",
  stiffness: 520,
  damping: 42,
} as const;

const CalendarTagStripBase = () => {
  const { addTag, availableColors, tags, updateTagColor } = useTags();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [tagName, setTagName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<TagContextMenuState | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isCreating) return;
    inputRef.current?.focus();
  }, [isCreating]);

  useRightClickPanelDismiss(
    TAG_COLOR_CONTEXT_PANEL_ID,
    contextMenu !== null,
    contextMenuRef,
    () => setContextMenu(null),
  );

  const handleCancelCreate = () => {
    setIsCreating(false);
    setTagName("");
  };

  const handleCollapse = () => {
    setContextMenu(null);
    handleCancelCreate();
    setIsCollapsed(true);
  };

  const handleExpand = () => {
    setIsCollapsed(false);
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

    const { x, y } = clampRightClickPanelPosition(event.clientX, event.clientY, {
      width: TAG_COLOR_CONTEXT_MENU_WIDTH,
      height: TAG_COLOR_CONTEXT_MENU_HEIGHT,
    });
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
        key={`${contextMenu.tagId}:${contextMenu.x}:${contextMenu.y}`}
        x={contextMenu.x}
        y={contextMenu.y}
        availableColors={availableColors}
        currentColorKey={contextMenuTagColorKey}
        tagName={contextMenuTag.name}
        menuRef={contextMenuRef}
        noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE}
        panelId={TAG_COLOR_CONTEXT_PANEL_ID}
        onSelectColor={(colorKey) => {
          void handleUpdateTagColor(contextMenuTag.id, colorKey);
        }}
      />
    ) : null;

  return (
    <>
      <motion.div
        layout="size"
        transition={TAG_PANEL_LAYOUT_TRANSITION}
        className={
          isCollapsed
            ? "flex h-8 w-[58px] min-w-0 shrink-0 items-center overflow-hidden rounded-xl border border-[#eeeeee] bg-white p-0.5 text-[#6d747f] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            : "flex h-8 min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-transparent bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        }
      >
        <button
          type="button"
          onClick={isCollapsed ? handleExpand : handleCollapse}
          className={
            isCollapsed
              ? "flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[#6d747f] transition-colors hover:bg-[#fafafa] hover:text-[#3f4652] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              : "mr-1 flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[#6d747f] transition-colors hover:bg-[#f5f6f8] hover:text-[#3f4652] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          }
          aria-label={isCollapsed ? "タグ一覧を開く" : "タグ一覧を閉じる"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "タグ一覧を開く" : "タグ一覧を閉じる"}
        >
          <Tag className="h-4 w-4 shrink-0" />
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          )}
        </button>

        <div
          aria-hidden={isCollapsed}
          className={
            isCollapsed
              ? "pointer-events-none min-w-0 flex-1 overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              : "min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          <div className="flex w-max items-center gap-1.5 px-1">
            {tags.map((tag) => {
              const tagColorKey = getTagColorKey(tag.color);

              return (
                <button
                  key={tag.id}
                  type="button"
                  tabIndex={isCollapsed ? -1 : 0}
                  className="group flex min-w-0 max-w-[180px] shrink-0 cursor-context-menu rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
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
                    className="pointer-events-none h-[20px] min-w-0 max-w-full gap-1 px-1.5 text-[10px] font-medium leading-[1.2] transition-[filter,box-shadow] duration-100 group-hover:brightness-[0.96] group-hover:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
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
                  tabIndex={isCollapsed ? -1 : 0}
                  onChange={(event) => setTagName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      handleCancelCreate();
                    }
                  }}
                  disabled={isSaving || isCollapsed}
                  placeholder="タグ名"
                  className="h-full w-24 min-w-0 bg-transparent text-[12px] font-medium text-[#3f4652] outline-none placeholder:text-[#a6adba]"
                />

                <button
                  type="submit"
                  tabIndex={isCollapsed ? -1 : 0}
                  disabled={!tagName.trim() || isSaving || isCollapsed}
                  className="grid h-5 w-5 place-items-center rounded-full text-[#8c8c8c] transition-colors hover:bg-[#f2f2f2] disabled:cursor-default disabled:opacity-40"
                  aria-label="タグを追加"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  tabIndex={isCollapsed ? -1 : 0}
                  onClick={handleCancelCreate}
                  disabled={isSaving || isCollapsed}
                  className="grid h-5 w-5 place-items-center rounded-full text-[#a0a0a0] transition-colors hover:bg-[#f2f2f2] disabled:cursor-default disabled:opacity-40"
                  aria-label="タグ追加をキャンセル"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                tabIndex={isCollapsed ? -1 : 0}
                onClick={() => {
                  setContextMenu(null);
                  setIsCreating(true);
                }}
                className="grid !h-5 !w-5 !min-h-5 !min-w-5 shrink-0 place-items-center rounded-full border border-[#eeeeee] bg-white text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:text-[#5f656d]"
                aria-label="タグを追加"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {contextMenuElement ? createPortal(contextMenuElement, document.body) : null}
    </>
  );
};

const CalendarTagStrip = memo(CalendarTagStripBase);

CalendarTagStrip.displayName = "CalendarTagStrip";

export { CalendarTagStrip };