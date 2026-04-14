import { useAuthSession } from "@/contexts/AuthContext";
import { useTags, type Tag } from "@/hooks/settings/useTags";
import {
  getTagColorStyle,
  getTagColorSwatchStyle,
} from "@/lib/tags/tagColor";
import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type LayoutMap = Record<string, Point>;

type DragState = {
  tagId: string;
  offsetX: number;
  offsetY: number;
};

const NODE_WIDTH = 196;
const NODE_HEIGHT = 84;
const HORIZONTAL_GAP = 132;
const VERTICAL_GAP = 28;
const ROOT_SECTION_GAP = 56;
const CANVAS_PADDING_X = 48;
const CANVAS_PADDING_Y = 48;
const STORAGE_KEY_PREFIX = "tag-map-layout-v2";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const createStorageKey = (userId?: string): string =>
  `${STORAGE_KEY_PREFIX}:${userId ?? "anonymous"}`;

const parseStoredLayout = (raw: string | null): LayoutMap => {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: LayoutMap = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (
        typeof key === "string" &&
        value &&
        typeof value === "object" &&
        isFiniteNumber((value as { x?: unknown }).x) &&
        isFiniteNumber((value as { y?: unknown }).y)
      ) {
        next[key] = {
          x: (value as { x: number }).x,
          y: (value as { y: number }).y,
        };
      }
    }

    return next;
  } catch {
    return {};
  }
};

const sortTagsByName = (tags: Tag[]): Tag[] => {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name, "ja"));
};

const buildChildrenMap = (tags: Tag[]): Map<string | null, Tag[]> => {
  const tagIds = new Set(tags.map((tag) => tag.id));
  const map = new Map<string | null, Tag[]>();

  for (const tag of tags) {
    const parentId =
      typeof tag.parentId === "string" && tagIds.has(tag.parentId)
        ? tag.parentId
        : null;
    const siblings = map.get(parentId) ?? [];
    siblings.push(tag);
    map.set(parentId, siblings);
  }

  for (const [parentId, children] of map.entries()) {
    map.set(parentId, sortTagsByName(children));
  }

  return map;
};

const buildAutoLayout = (tags: Tag[]): LayoutMap => {
  const childrenMap = buildChildrenMap(tags);
  const roots = childrenMap.get(null) ?? [];
  const layout: LayoutMap = {};
  let cursorY = CANVAS_PADDING_Y;

  const placeSubtree = (tag: Tag, depth: number): number => {
    const children = childrenMap.get(tag.id) ?? [];

    if (children.length === 0) {
      const top = cursorY;
      layout[tag.id] = {
        x: CANVAS_PADDING_X + depth * (NODE_WIDTH + HORIZONTAL_GAP),
        y: top,
      };
      cursorY += NODE_HEIGHT + VERTICAL_GAP;
      return top + NODE_HEIGHT / 2;
    }

    const childCenters = children.map((child) => placeSubtree(child, depth + 1));
    const centerY = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;

    layout[tag.id] = {
      x: CANVAS_PADDING_X + depth * (NODE_WIDTH + HORIZONTAL_GAP),
      y: centerY - NODE_HEIGHT / 2,
    };

    return centerY;
  };

  for (const root of roots) {
    placeSubtree(root, 0);
    cursorY += ROOT_SECTION_GAP;
  }

  return layout;
};

const clamp = (value: number, min: number): number => Math.max(min, value);

const TagMap = () => {
  const { currentUser } = useAuthSession();
  const {
    tags,
    tagById,
    availableColors,
    getCategoryName,
    setTagCategory,
    ensureCategory,
    setTagParent,
    listCategoryIdsInUse,
    addTag,
    renameTag,
    updateTagColor,
    deleteTag,
    getTagPathString,
  } = useTags();

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [layoutOverrides, setLayoutOverrides] = useState<LayoutMap>({});
  const [rootDraft, setRootDraft] = useState("");
  const [childDraft, setChildDraft] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [newCategoryDraft, setNewCategoryDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const autoLayout = useMemo(() => buildAutoLayout(tags), [tags]);
  const childrenMap = useMemo(() => buildChildrenMap(tags), [tags]);

  const effectiveLayout = useMemo(() => {
    const next: LayoutMap = { ...autoLayout };

    for (const tag of tags) {
      const override = layoutOverrides[tag.id];
      if (override) {
        next[tag.id] = override;
      }
    }

    return next;
  }, [autoLayout, layoutOverrides, tags]);

  const orderedTags = useMemo(() => {
    return [...tags].sort((left, right) => {
      if (left.id === selectedTagId) return 1;
      if (right.id === selectedTagId) return -1;
      const leftPos = effectiveLayout[left.id] ?? { x: 0, y: 0 };
      const rightPos = effectiveLayout[right.id] ?? { x: 0, y: 0 };
      if (leftPos.x !== rightPos.x) return leftPos.x - rightPos.x;
      return leftPos.y - rightPos.y;
    });
  }, [effectiveLayout, selectedTagId, tags]);

  const selectedTag = selectedTagId ? tagById.get(selectedTagId) ?? null : null;
  const categoryIds = listCategoryIdsInUse();

  const selectedDescendantIds = useMemo(() => {
    if (!selectedTag) return new Set<string>();

    const visited = new Set<string>();
    const walk = (tagId: string) => {
      const children = childrenMap.get(tagId) ?? [];
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        walk(child.id);
      }
    };

    walk(selectedTag.id);
    return visited;
  }, [childrenMap, selectedTag]);

  const selectableParentTags = useMemo(() => {
    if (!selectedTag) return sortTagsByName(tags);
    return sortTagsByName(
      tags.filter(
        (tag) => tag.id !== selectedTag.id && !selectedDescendantIds.has(tag.id),
      ),
    );
  }, [selectedDescendantIds, selectedTag, tags]);

  const canvasSize = useMemo(() => {
    const positions = Object.values(effectiveLayout);
    if (positions.length === 0) {
      return { width: 1200, height: 720 };
    }

    const width = Math.max(
      1200,
      ...positions.map((point) => point.x + NODE_WIDTH + CANVAS_PADDING_X),
    );
    const height = Math.max(
      720,
      ...positions.map((point) => point.y + NODE_HEIGHT + CANVAS_PADDING_Y),
    );

    return { width, height };
  }, [effectiveLayout]);

  useEffect(() => {
    const nextSelected = selectedTagId ? tagById.get(selectedTagId) : null;
    if (nextSelected) return;
    setSelectedTagId(tags[0]?.id ?? null);
  }, [selectedTagId, tagById, tags]);

  useEffect(() => {
    setRenameDraft(selectedTag?.name ?? "");
    setChildDraft("");
    setNewCategoryDraft("");
  }, [selectedTag?.id, selectedTag?.name]);

  useEffect(() => {
    const storageKey = createStorageKey(currentUser?.uid);
    setLayoutOverrides(parseStoredLayout(localStorage.getItem(storageKey)));
  }, [currentUser?.uid]);

  useEffect(() => {
    setLayoutOverrides((previous) => {
      const tagIds = new Set(tags.map((tag) => tag.id));
      const next = Object.fromEntries(
        Object.entries(previous).filter(([tagId]) => tagIds.has(tagId)),
      ) as LayoutMap;

      const sameLength =
        Object.keys(next).length === Object.keys(previous).length;
      return sameLength ? previous : next;
    });
  }, [tags]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const storageKey = createStorageKey(currentUser.uid);
    const timer = window.setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(layoutOverrides));
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentUser?.uid, layoutOverrides]);

  useEffect(() => {
    if (!statusMessage) return;

    const timer = window.setTimeout(() => {
      setStatusMessage(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [statusMessage]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;

      const bounds = canvas.getBoundingClientRect();
      const nextX = event.clientX - bounds.left - drag.offsetX;
      const nextY = event.clientY - bounds.top - drag.offsetY;

      setLayoutOverrides((previous) => ({
        ...previous,
        [drag.tagId]: {
          x: clamp(nextX, 16),
          y: clamp(nextY, 16),
        },
      }));
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setDraggingTagId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const setMessageFromResult = (result: void | { error: string }) => {
    if (result && typeof result === "object" && "error" in result) {
      setStatusMessage(result.error);
      return true;
    }
    return false;
  };

  const handleAddRoot = async () => {
    const name = rootDraft.trim() || "新しいタグ";
    const created = await addTag(name);
    setRootDraft("");
    setSelectedTagId(created.id);
    setStatusMessage(`「${created.name}」を追加しました。`);
  };

  const handleAddChild = async () => {
    if (!selectedTag) return;
    const name = childDraft.trim() || "新しいタグ";
    const created = await addTag(name, selectedTag.color, selectedTag.categoryId, selectedTag.id);
    setChildDraft("");
    setSelectedTagId(created.id);
    setStatusMessage(`「${created.name}」を追加しました。`);
  };

  const handleRename = async () => {
    if (!selectedTag) return;
    const result = await renameTag(selectedTag.id, renameDraft);
    if (setMessageFromResult(result)) return;
    setStatusMessage("タグ名を更新しました。");
  };

  const handleDelete = async () => {
    if (!selectedTag) return;
    const confirmed = window.confirm(`「${selectedTag.name}」を削除しますか？`);
    if (!confirmed) return;

    await deleteTag(selectedTag.id);
    setSelectedTagId(null);
    setStatusMessage("タグを削除しました。");
  };

  const handleParentChange = async (nextParentId: string) => {
    if (!selectedTag) return;
    const result = await setTagParent(
      selectedTag.id,
      nextParentId === "__root__" ? null : nextParentId,
    );
    if (setMessageFromResult(result)) return;
    setStatusMessage("親タグを更新しました。");
  };

  const handleCategoryChange = async (nextCategoryId: string) => {
    if (!selectedTag) return;
    await setTagCategory(
      selectedTag.id,
      nextCategoryId === "__none__" ? null : nextCategoryId,
    );
    setStatusMessage("カテゴリを更新しました。");
  };

  const handleCreateCategory = async () => {
    if (!selectedTag) return;
    const categoryId = await ensureCategory(newCategoryDraft.trim() || undefined);
    await setTagCategory(selectedTag.id, categoryId);
    setNewCategoryDraft("");
    setStatusMessage("カテゴリを作成しました。");
  };

  const handleResetLayout = () => {
    setLayoutOverrides({});
    setStatusMessage("ノード位置をリセットしました。");
  };

  const handleNodePointerDown = (
    tagId: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const point = effectiveLayout[tagId] ?? autoLayout[tagId];
    if (!point) return;

    dragRef.current = {
      tagId,
      offsetX: event.clientX - bounds.left - point.x,
      offsetY: event.clientY - bounds.top - point.y,
    };
    setDraggingTagId(tagId);
  };

  const edges = useMemo(() => {
    const next: Array<{
      id: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }> = [];

    for (const tag of tags) {
      if (!tag.parentId) continue;
      const parent = tagById.get(tag.parentId);
      if (!parent) continue;

      const parentPoint = effectiveLayout[parent.id];
      const childPoint = effectiveLayout[tag.id];
      if (!parentPoint || !childPoint) continue;

      next.push({
        id: `${parent.id}-${tag.id}`,
        startX: parentPoint.x + NODE_WIDTH,
        startY: parentPoint.y + NODE_HEIGHT / 2,
        endX: childPoint.x,
        endY: childPoint.y + NODE_HEIGHT / 2,
      });
    }

    return next;
  }, [effectiveLayout, tagById, tags]);

  return (
    <div className="h-full min-h-full w-full bg-[#F6F8FA] px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Tag Map
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-800">
                タグマップ
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                タグをノードとして並べ、追加・名前変更・親子変更・色変更・削除をここで編集できます。ノード位置はこの端末に保存されます。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  value={rootDraft}
                  onChange={(event) => setRootDraft(event.target.value)}
                  placeholder="ルートタグ名"
                  className="min-w-[180px] bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleAddRoot}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                >
                  追加
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetLayout}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                位置をリセット
              </button>
            </div>
          </div>
        </header>

        {statusMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {statusMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">キャンバス</h2>
                <p className="mt-1 text-xs text-slate-500">
                  ノードをドラッグして配置できます。親子関係は右ペインで変更します。
                </p>
              </div>
              <div className="text-xs font-medium text-slate-400">
                {tags.length} tags
              </div>
            </div>

            <div className="h-[70dvh] min-h-[620px] overflow-auto rounded-[20px] border border-slate-200 bg-slate-50">
              <div
                ref={canvasRef}
                className="relative"
                style={{
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`,
                }}
              >
                <svg
                  className="pointer-events-none absolute inset-0"
                  width={canvasSize.width}
                  height={canvasSize.height}
                  viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                  aria-hidden="true"
                >
                  {edges.map((edge) => {
                    const controlOffset = Math.max(48, (edge.endX - edge.startX) / 2);
                    const path = [
                      `M ${edge.startX} ${edge.startY}`,
                      `C ${edge.startX + controlOffset} ${edge.startY}, ${edge.endX - controlOffset} ${edge.endY}, ${edge.endX} ${edge.endY}`,
                    ].join(" ");

                    return (
                      <path
                        key={edge.id}
                        d={path}
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        fill="none"
                      />
                    );
                  })}
                </svg>

                {orderedTags.map((tag) => {
                  const point = effectiveLayout[tag.id] ?? autoLayout[tag.id];
                  if (!point) return null;
                  const childCount = (childrenMap.get(tag.id) ?? []).length;
                  const isSelected = selectedTagId === tag.id;
                  const isDragging = draggingTagId === tag.id;

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onPointerDown={(event) => handleNodePointerDown(tag.id, event)}
                      onClick={() => setSelectedTagId(tag.id)}
                      className={[
                        "absolute rounded-[20px] border px-4 py-3 text-left shadow-sm transition duration-150",
                        isSelected
                          ? "ring-2 ring-slate-900/15 shadow-md"
                          : "hover:shadow-md",
                        isDragging ? "cursor-grabbing" : "cursor-grab",
                      ].join(" ")}
                      style={{
                        ...getTagColorStyle(tag.color),
                        left: `${point.x}px`,
                        top: `${point.y}px`,
                        width: `${NODE_WIDTH}px`,
                        minHeight: `${NODE_HEIGHT}px`,
                        zIndex: isSelected ? 30 : 10,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">
                            {tag.name}
                          </div>
                          <div className="mt-1 text-[11px] opacity-70">
                            {tag.categoryId ? getCategoryName(tag.categoryId) : "カテゴリなし"}
                          </div>
                        </div>
                        <span
                          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-[10px] font-bold"
                          style={getTagColorSwatchStyle(tag.color)}
                        >
                          {childCount}
                        </span>
                      </div>

                      <div className="mt-3 truncate text-[11px] opacity-80">
                        {tag.parentId ? getTagPathString(tag.id) : "ルートタグ"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">タグ編集</h2>

            {selectedTag ? (
              <div className="mt-4 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    選択中
                  </div>
                  <div className="mt-2 text-lg font-black text-slate-800">
                    {selectedTag.name}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-slate-500">
                    {getTagPathString(selectedTag.id) || "ルートタグ"}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    名前
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleRename}
                      className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      保存
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    子タグ追加
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={childDraft}
                      onChange={(event) => setChildDraft(event.target.value)}
                      placeholder="子タグ名"
                      className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      追加
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    親タグ
                  </label>
                  <select
                    value={selectedTag.parentId ?? "__root__"}
                    onChange={(event) => void handleParentChange(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                  >
                    <option value="__root__">ルート</option>
                    {selectableParentTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {getTagPathString(tag.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    カテゴリ
                  </label>
                  <select
                    value={selectedTag.categoryId ?? "__none__"}
                    onChange={(event) => void handleCategoryChange(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                  >
                    <option value="__none__">未設定</option>
                    {categoryIds.map((categoryId) => (
                      <option key={categoryId} value={categoryId}>
                        {getCategoryName(categoryId)}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={newCategoryDraft}
                      onChange={(event) => setNewCategoryDraft(event.target.value)}
                      placeholder="新しいカテゴリ名"
                      className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      作成
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    色
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableColors.map((colorKey) => {
                      const isActive = colorKey === selectedTag.color;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => void updateTagColor(selectedTag.id, colorKey)}
                          className={[
                            "flex h-11 items-center justify-center rounded-2xl border transition",
                            isActive ? "ring-2 ring-slate-900/15" : "hover:scale-[1.02]",
                          ].join(" ")}
                          style={getTagColorSwatchStyle(colorKey)}
                          title={colorKey}
                        >
                          <span className="text-[11px] font-bold uppercase">
                            {colorKey.slice(0, 3)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    このタグを削除
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-relaxed text-slate-500">
                左のキャンバスでタグを選ぶと、ここで編集できます。
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
};

export default TagMap;
