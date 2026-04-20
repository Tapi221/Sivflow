import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
} from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import {
  createDefaultEditorBlockSettings,
  parseEditorBlockSettings,
  type EditorBlockConfig,
  type EditorBlockType,
} from "@/lib/editorBlockSettings";
import { cn } from "@/lib/utils";
import {
  Code,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Sigma,
  StratisMarkdownIcon,
  Type,
  type IconProps,
} from "@/ui/icons";

const BLOCK_ICONS: Record<EditorBlockType, ComponentType<IconProps>> = {
  text: Type,
  question: HelpCircle,
  code: Code,
  image: ImageIcon,
  math: Sigma,
  markdown: StratisMarkdownIcon,
};

export const BlockOrdering = () => {
  const { settings, updateSettings } = useUserSettings();
  const [blocks, setBlocks] = useState<EditorBlockConfig[]>(() =>
    createDefaultEditorBlockSettings(),
  );
  const [enabled, setEnabled] = useState(false);
  const isDraggingRef = useRef(false);
  const itemWidthByIdRef = useRef<Partial<Record<EditorBlockType, number>>>({});

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setEnabled(true));

    return () => {
      cancelAnimationFrame(frameId);
      queueMicrotask(() => setEnabled(false));
    };
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    const nextBlocks = parseEditorBlockSettings(settings?.editorBlockSettings);

    queueMicrotask(() =>
      setBlocks((previousBlocks) => {
        return JSON.stringify(previousBlocks) === JSON.stringify(nextBlocks)
          ? previousBlocks
          : nextBlocks;
      }),
    );
  }, [settings?.editorBlockSettings]);

  const visibleCount = useMemo(() => {
    return blocks.filter((block) => block.isVisible).length;
  }, [blocks]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      isDraggingRef.current = false;
      return;
    }

    if (result.destination.index === result.source.index) {
      isDraggingRef.current = false;
      return;
    }

    const reorderedBlocks = [...blocks];
    const [movedBlock] = reorderedBlocks.splice(result.source.index, 1);
    reorderedBlocks.splice(result.destination.index, 0, movedBlock);

    const nextBlocks = reorderedBlocks.map((block, index) => ({
      ...block,
      orderIndex: index,
    }));

    setBlocks(nextBlocks);

    try {
      await updateSettings({ editorBlockSettings: nextBlocks });
    } finally {
      window.setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    }
  };

  const handleToggleVisibility = (blockId: EditorBlockType, checked: boolean) => {
    const nextBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, isVisible: checked } : block,
    );

    setBlocks(nextBlocks);
    void updateSettings({ editorBlockSettings: nextBlocks });
  };

  if (!enabled) {
    return null;
  }

  return (
    <SettingsSection
      title="エディタブロック"
      description="カードエディタで表示するブロック候補の順序と、表示 / 非表示を整理します。"
      action={
        <span className="ds-settings-panel__status-pill ds-settings-panel__status-pill--off">
          {visibleCount} / {blocks.length} 表示
        </span>
      }
    >
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="block-ordering">
          {(droppableProvided) => (
            <div
              {...droppableProvided.droppableProps}
              ref={droppableProvided.innerRef}
              className="space-y-2"
            >
              {blocks.map((block, index) => {
                const Icon = BLOCK_ICONS[block.type];

                return (
                  <Draggable
                    key={block.id}
                    draggableId={block.id}
                    index={index}
                  >
                    {(draggableProvided, snapshot) => {
                      const draggableStyle = {
                        ...draggableProvided.draggableProps.style,
                        width: snapshot.isDragging
                          ? itemWidthByIdRef.current[block.id]
                          : undefined,
                        zIndex: snapshot.isDragging ? 9999 : 1,
                      } satisfies CSSProperties;

                      const draggableNode = (
                        <div
                          ref={(element) => {
                            draggableProvided.innerRef(element);

                            if (element) {
                              itemWidthByIdRef.current[block.id] =
                                element.getBoundingClientRect().width;
                            }
                          }}
                          {...draggableProvided.draggableProps}
                          className={cn(
                            "rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-shadow",
                            !snapshot.isDragging && "hover:shadow-sm",
                            snapshot.isDragging &&
                              "border-[var(--settings-accent)] shadow-lg",
                          )}
                          style={draggableStyle}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              aria-label={`${block.label} を並び替え`}
                              {...draggableProvided.dragHandleProps}
                              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                            >
                              <GripVertical className="h-4 w-4 cursor-grab" />
                            </button>

                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500",
                                !block.isVisible && "opacity-60",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "text-sm font-semibold text-slate-800",
                                  !block.isVisible && "text-slate-500",
                                )}
                              >
                                {block.label}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                新規カード作成時の候補順 {index + 1}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "ds-settings-panel__status-pill",
                                  block.isVisible
                                    ? "ds-settings-panel__status-pill--success"
                                    : "ds-settings-panel__status-pill--off",
                                )}
                              >
                                {block.isVisible ? "表示" : "非表示"}
                              </span>
                              <Switch
                                checked={block.isVisible}
                                onCheckedChange={(checked) =>
                                  handleToggleVisibility(block.id, checked)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );

                      if (
                        snapshot.isDragging &&
                        typeof document !== "undefined" &&
                        document.body
                      ) {
                        return createPortal(draggableNode, document.body);
                      }

                      return draggableNode;
                    }}
                  </Draggable>
                );
              })}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="ds-settings-panel__note ds-settings-panel__note--info mt-4">
        ドラッグで順序を変更できます。非表示にしたブロックは候補一覧から外れますが、既存カードの内容は消えません。
      </div>
    </SettingsSection>
  );
};
