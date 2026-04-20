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

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Switch } from "@/components/ui/switch";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import type { BlockConfig } from "@/types";
import {
  Code,
  GripVertical,
  ImageIcon,
  Sigma,
  StratisMarkdownIcon,
  Type,
  type IconProps,
} from "@/ui/icons";

type SupportedBlockType = Extract<
  BlockConfig["type"],
  "text" | "code" | "image" | "math" | "markdown"
>;

const BLOCK_ICONS: Record<SupportedBlockType, ComponentType<IconProps>> = {
  text: Type,
  code: Code,
  image: ImageIcon,
  math: Sigma,
  markdown: StratisMarkdownIcon,
};

const DEFAULT_BLOCKS: BlockConfig[] = [
  {
    id: "text",
    type: "text",
    label: "テキスト",
    isVisible: true,
    orderIndex: 0,
  },
  {
    id: "code",
    type: "code",
    label: "コード",
    isVisible: true,
    orderIndex: 1,
  },
  {
    id: "image",
    type: "image",
    label: "画像",
    isVisible: true,
    orderIndex: 2,
  },
  {
    id: "math",
    type: "math",
    label: "数式",
    isVisible: true,
    orderIndex: 3,
  },
  {
    id: "markdown",
    type: "markdown",
    label: "Markdown",
    isVisible: true,
    orderIndex: 4,
  },
];

const sanitizeBlockSettings = (items: BlockConfig[]) => {
  return items
    .filter((item) => item.type !== "reference" && item.type !== "audio")
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));
};

const resolveVerticalTransform = (transform?: string) => {
  if (!transform) return undefined;

  const translateMatch = transform.match(
    /translate\(\s*[-\d.]+px,\s*([-\d.]+px)\s*\)/,
  );
  if (translateMatch?.[1]) {
    return `translate(0px, ${translateMatch[1]})`;
  }

  const translate3dMatch = transform.match(
    /translate3d\(\s*[-\d.]+px,\s*([-\d.]+px),\s*[-\d.]+px\s*\)/,
  );
  if (translate3dMatch?.[1]) {
    return `translate3d(0px, ${translate3dMatch[1]}, 0px)`;
  }

  return transform;
};

export const BlockOrdering = () => {
  const { settings, updateSettings } = useUserSettings();
  const [blocks, setBlocks] = useState<BlockConfig[]>([]);
  const [enabled, setEnabled] = useState(false);
  const isDraggingRef = useRef(false);

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

    const source = settings?.editorBlockSettings
      ? [...settings.editorBlockSettings]
      : DEFAULT_BLOCKS;
    const nextBlocks = sanitizeBlockSettings(source);

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
      }, 100);
    }
  };

  const handleToggleVisibility = (blockId: string, checked: boolean) => {
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
                const Icon =
                  BLOCK_ICONS[block.type as SupportedBlockType] ?? Type;

                return (
                  <Draggable
                    key={block.id}
                    draggableId={block.id}
                    index={index}
                  >
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-shadow",
                          !snapshot.isDragging && "hover:shadow-sm",
                          snapshot.isDragging &&
                            "border-[var(--settings-accent)] shadow-lg",
                        )}
                        style={
                          {
                            ...draggableProvided.draggableProps.style,
                            transform: resolveVerticalTransform(
                              draggableProvided.draggableProps.style?.transform,
                            ),
                            zIndex: snapshot.isDragging ? 30 : 1,
                          } satisfies CSSProperties
                        }
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
                    )}
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
