import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tag as TagIcon,
  Check,
  Trash2,
  Pencil,
  GitMerge,
  FolderInput,
  Move,
} from "@/ui/icons";
import { useTags, DEFAULT_TAG_COLOR_KEYS } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import { TagChip } from "@/components/tag/TagChip";
import {
  getTagColorKey,
  getTagColorSwatchStyle,
  type TagColorKey,
} from "@/lib/tags/tagColor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TagManagerPanelProps = {
  className?: string;
};

export const TagManagerPanel = ({ className }: TagManagerPanelProps) => {
  const {
    tags: allTags,
    updateTagColor,
    deleteTag,
    getTagUsageCount,
    renameTag,
    mergeTags,
    getCategoryName,
    listCategoryIdsInUse,
    setTagCategory,
    ensureCategory,
    ensurePathExists,
    moveSelectedTagToPath,
    getTagPathString,
  } = useTags();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>("");
  const [pendingUsageCount, setPendingUsageCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState("");
  const [mergeError, setMergeError] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [mergingFromId, setMergingFromId] = useState<string | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [createPathInput, setCreatePathInput] = useState("");
  const [createPathError, setCreatePathError] = useState("");
  const [isCreatingPath, setIsCreatingPath] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [movePathInput, setMovePathInput] = useState("");
  const [movePathError, setMovePathError] = useState("");
  const [isMovingPath, setIsMovingPath] = useState(false);
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () =>
      listCategoryIdsInUse().map((categoryId) => ({
        id: categoryId,
        name: getCategoryName(categoryId),
      })),
    [getCategoryName, listCategoryIdsInUse],
  );

  const grouped = useMemo(() => {
    const sorted = [...allTags].sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, typeof allTags>([["", []]]);
    for (const t of sorted) {
      const key = t.categoryId ?? "";
      const bucket = map.get(key) ?? map.get("");
      if (bucket) bucket.push(t);
    }
    return map;
  }, [allTags]);

  const expandedTag = useMemo(
    () => allTags.find((tag) => tag.id === expandedTagId) ?? null,
    [allTags, expandedTagId],
  );

  const handleCreateByPath = async () => {
    const path = createPathInput.trim();
    if (!path) return;
    setIsCreatingPath(true);
    setCreatePathError("");
    try {
      const result = await ensurePathExists(path);
      if ("error" in result) {
        setCreatePathError(result.error);
      } else {
        setCreatePathInput("");
      }
    } finally {
      setIsCreatingPath(false);
    }
  };

  const handleMoveByPath = async () => {
    if (!selectedTagId) {
      setMovePathError("ツリーのタグ行をクリックして選択してください。");
      return;
    }
    setIsMovingPath(true);
    setMovePathError("");
    try {
      const result = await moveSelectedTagToPath(selectedTagId, movePathInput);
      if (result && "error" in result) {
        setMovePathError(result.error);
      } else {
        setMovePathInput("");
        setSelectedTagId(null);
      }
    } finally {
      setIsMovingPath(false);
    }
  };

  const handleColorChange = async (tagId: string, newColor: TagColorKey) => {
    await updateTagColor(tagId, newColor);
  };

  const openDeleteDialog = async (tagId: string, tagName: string) => {
    const usageCount = await getTagUsageCount(tagId);
    setPendingUsageCount(usageCount);
    setPendingDeleteId(tagId);
    setPendingDeleteName(tagName);
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteId) return;
    try {
      setIsDeleting(true);
      await deleteTag(pendingDeleteId);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
      setPendingDeleteName("");
      setPendingUsageCount(0);
    }
  };

  const handleRenameStart = (tagId: string, currentName: string) => {
    setMergingFromId(null);
    setMergeError("");
    setRenamingTagId(tagId);
    setRenameInput(currentName);
    setRenameError("");
    setExpandedTagId(tagId);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleRenameConfirm = async (tagId: string) => {
    const trimmed = renameInput.trim();
    if (!trimmed) {
      setRenamingTagId(null);
      return;
    }
    const result = await renameTag(tagId, trimmed);
    if (result?.error) {
      setRenameError(result.error);
      return;
    }
    setRenamingTagId(null);
    setRenameError("");
  };

  const handleMergeStart = (tagId: string) => {
    setRenamingTagId(null);
    setRenameError("");
    setMergingFromId(tagId);
    setMergeIntoId("");
    setMergeError("");
    setExpandedTagId(tagId);
  };

  const handleMergeConfirm = async () => {
    if (!mergingFromId || !mergeIntoId) return;
    let shouldClose = false;
    try {
      setIsMerging(true);
      const result = await mergeTags(mergingFromId, mergeIntoId);
      if ("error" in result) {
        setMergeError(result.error);
        return;
      }
      setMergeError("");
      shouldClose = true;
    } finally {
      setIsMerging(false);
      if (shouldClose) {
        setMergingFromId(null);
        setMergeIntoId("");
      }
    }
  };

  return (
    <div className={cn("min-w-0 space-y-4 overflow-x-hidden", className)}>
      {allTags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-400">
          <TagIcon className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>登録されているタグはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            <div className="mb-3 space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  タグ階層エディタ
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  タグの関係はパスでのみ管理します。
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <FolderInput className="h-3.5 w-3.5" />
                  パスで新規作成
                </p>
                <div className="flex gap-2">
                  <Input
                    value={createPathInput}
                    onChange={(e) => {
                      setCreatePathInput(e.target.value);
                      setCreatePathError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreateByPath();
                    }}
                    placeholder="JavaScript/DOM/innerHTML"
                    className="h-8 flex-1 text-xs font-mono"
                    disabled={isCreatingPath}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => void handleCreateByPath()}
                    disabled={isCreatingPath || !createPathInput.trim()}
                  >
                    作成
                  </Button>
                </div>
                {createPathError && (
                  <p className="text-xs text-red-500">{createPathError}</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                  <Move className="h-3.5 w-3.5" />
                  選択タグを移動
                  {selectedTagId && (
                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                      {getTagPathString(selectedTagId)}
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={movePathInput}
                    onChange={(e) => {
                      setMovePathInput(e.target.value);
                      setMovePathError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleMoveByPath();
                    }}
                    placeholder="親パス（例: JavaScript/DOM）空欄でルートへ"
                    className="h-8 flex-1 text-xs font-mono"
                    disabled={isMovingPath}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => void handleMoveByPath()}
                    disabled={isMovingPath || !selectedTagId}
                  >
                    移動
                  </Button>
                </div>
                {movePathError && (
                  <p className="text-xs text-red-500">{movePathError}</p>
                )}
              </div>
            </div>
          </section>

          {Array.from(grouped.entries()).map(([categoryKey, tagList]) => {
            if (tagList.length === 0) return null;
            return (
              <div key={categoryKey}>
                {categoryKey && (
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {getCategoryName(categoryKey)}
                  </h3>
                )}
                <div className="space-y-3">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex flex-wrap gap-2">
                      {tagList.map((tag) => {
                        const isExpanded = expandedTagId === tag.id;
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              setExpandedTagId((prev) =>
                                prev === tag.id ? null : tag.id,
                              );
                              setMergingFromId((prev) =>
                                prev === tag.id ? prev : null,
                              );
                              setRenamingTagId((prev) =>
                                prev === tag.id ? prev : null,
                              );
                              setRenameError("");
                              setMergeError("");
                            }}
                            className={cn(
                              "transition-all",
                              isExpanded
                                ? "scale-[1.02]"
                                : "hover:scale-[1.01]",
                            )}
                          >
                            <TagChip
                              label={tag.name}
                              colorKey={getTagColorKey(tag.color)}
                              className={cn(
                                "shadow-none",
                                isExpanded && "ring-2 ring-primary-500/35",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {expandedTag &&
                    tagList.some((tag) => tag.id === expandedTag.id) && (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          {renamingTagId === expandedTag.id ? (
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  ref={renameInputRef}
                                  value={renameInput}
                                  onChange={(e) => {
                                    setRenameInput(e.target.value);
                                    setRenameError("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      void handleRenameConfirm(expandedTag.id);
                                    if (e.key === "Escape")
                                      setRenamingTagId(null);
                                  }}
                                  className="h-8 min-w-0 flex-1 text-sm"
                                />
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  onClick={() =>
                                    void handleRenameConfirm(expandedTag.id)
                                  }
                                >
                                  保存
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => setRenamingTagId(null)}
                                >
                                  ×
                                </Button>
                              </div>
                              {renameError && (
                                <p className="px-1 text-xs text-red-500">
                                  {renameError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <TagChip
                              label={expandedTag.name}
                              colorKey={getTagColorKey(expandedTag.color)}
                              className="w-fit"
                            />
                          )}

                          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                            <div className="flex min-w-0 flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="shrink-0 text-xs text-slate-500">
                                  カテゴリ
                                </span>
                                <select
                                  value={expandedTag.categoryId ?? "__none__"}
                                  onChange={(event) =>
                                    void setTagCategory(
                                      expandedTag.id,
                                      event.target.value === "__none__"
                                        ? null
                                        : event.target.value,
                                    )
                                  }
                                  className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm sm:min-w-[140px]"
                                >
                                  <option value="__none__">なし</option>
                                  {categoryOptions.map((category) => (
                                    <option
                                      key={category.id}
                                      value={category.id}
                                    >
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-xs"
                                  onClick={async () => {
                                    const categoryId = await ensureCategory();
                                    await setTagCategory(
                                      expandedTag.id,
                                      categoryId,
                                    );
                                  }}
                                >
                                  ＋新規カテゴリ
                                </Button>
                              </div>
                              <details
                                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                                open
                              >
                                <summary className="cursor-pointer list-none text-xs font-medium text-slate-500">
                                  詳細設定
                                </summary>
                                <div className="mt-3 space-y-2">
                                  <div className="text-xs text-slate-500">
                                    現在のパス
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                                    {getTagPathString(expandedTag.id) ||
                                      expandedTag.name}
                                  </div>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">
                                  階層の変更は上部の「選択タグを移動」に親パスを入力して行います。
                                </p>
                              </details>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {DEFAULT_TAG_COLOR_KEYS.map((colorKey) => (
                                  <button
                                    key={colorKey}
                                    type="button"
                                    aria-label={`${colorKey}を選択`}
                                    onClick={() =>
                                      void handleColorChange(
                                        expandedTag.id,
                                        colorKey,
                                      )
                                    }
                                    className={cn(
                                      "h-6 w-6 shrink-0 rounded-full border-2 ring-1 ring-slate-300/70 shadow-sm transition-all hover:scale-105",
                                      getTagColorKey(expandedTag.color) ===
                                        colorKey
                                        ? "scale-110 ring-2 ring-primary-600 ring-offset-2 opacity-100 shadow-md"
                                        : "opacity-80 hover:opacity-100",
                                    )}
                                    style={getTagColorSwatchStyle(colorKey)}
                                  >
                                    {getTagColorKey(expandedTag.color) ===
                                      colorKey && (
                                      <Check className="mx-auto h-3 w-3 text-slate-700/70" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1 self-start sm:justify-start">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRenameStart(
                                    expandedTag.id,
                                    expandedTag.name,
                                  )
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-500"
                                aria-label={`${expandedTag.name} をリネーム`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMergeStart(expandedTag.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-500"
                                aria-label={`${expandedTag.name} をマージ`}
                              >
                                <GitMerge className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void openDeleteDialog(
                                    expandedTag.id,
                                    expandedTag.name,
                                  )
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                aria-label={`${expandedTag.name} を削除`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {mergingFromId === expandedTag.id && (
                          <div className="flex flex-col gap-2 px-3 pb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="shrink-0 text-xs text-slate-500">
                                マージ先:
                              </span>
                              <select
                                value={mergeIntoId}
                                onChange={(e) => {
                                  setMergeIntoId(e.target.value);
                                  setMergeError("");
                                }}
                                className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm sm:min-w-[220px]"
                              >
                                <option value="">-- 選択 --</option>
                                {allTags
                                  .filter((t) => t.id !== expandedTag.id)
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                disabled={!mergeIntoId || isMerging}
                                onClick={() => void handleMergeConfirm()}
                              >
                                {isMerging ? "実行中..." : "マージ"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => {
                                  setMergingFromId(null);
                                  setMergeIntoId("");
                                  setMergeError("");
                                }}
                              >
                                ×
                              </Button>
                            </div>
                            {mergeError && (
                              <p className="px-1 text-xs text-red-500">
                                {mergeError}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
            setPendingDeleteName("");
            setPendingUsageCount(0);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              タグを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              「{pendingDeleteName}」を削除すると、{pendingUsageCount}{" "}
              件のカードからこのタグが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirmed();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500"
            >
              {isDeleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
