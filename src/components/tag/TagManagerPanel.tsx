import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag as TagIcon, Check, Trash2, Pencil, GitMerge, GripVertical } from 'lucide-react';
import { useTags, DEFAULT_COLORS, type Tag } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import { TagBadge } from '@/components/tag/TagBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TagManagerPanelProps = {
  className?: string;
};

type TagTreeNode = {
  tag: Tag;
  depth: number;
};

const sortTagsByName = (tags: Tag[]) => [...tags].sort((left, right) => left.name.localeCompare(right.name, 'ja'));

const buildTagTreeRows = (tags: Tag[]): TagTreeNode[] => {
  const tagIds = new Set(tags.map((tag) => tag.id));
  const childrenMap = new Map<string | null, Tag[]>();
  for (const tag of tags) {
    const parentId = tag.parentId && tagIds.has(tag.parentId) ? tag.parentId : null;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(tag);
    childrenMap.set(parentId, siblings);
  }

  const rows: TagTreeNode[] = [];
  const appendRows = (items: Tag[], depth: number, visited: Set<string>) => {
    for (const tag of sortTagsByName(items)) {
      if (visited.has(tag.id)) continue;
      rows.push({ tag, depth });
      const nextVisited = new Set(visited);
      nextVisited.add(tag.id);
      appendRows(childrenMap.get(tag.id) ?? [], depth + 1, nextVisited);
    }
  };

  appendRows(childrenMap.get(null) ?? [], 0, new Set<string>());
  return rows;
};

export function TagManagerPanel({ className }: TagManagerPanelProps) {
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
    setTagParent,
    ensureCategory,
  } = useTags();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');
  const [pendingUsageCount, setPendingUsageCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState('');
  const [mergeError, setMergeError] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [mergingFromId, setMergingFromId] = useState<string | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [parentErrors, setParentErrors] = useState<Record<string, string>>({});
  const [draggedTagId, setDraggedTagId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);

  const categoryOptions = useMemo(
    () => listCategoryIdsInUse().map((categoryId) => ({
      id: categoryId,
      name: getCategoryName(categoryId),
    })),
    [getCategoryName, listCategoryIdsInUse]
  );

  const grouped = useMemo(() => {
    const sorted = [...allTags].sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, typeof allTags>([['', []]]);
    for (const t of sorted) {
      const key = t.categoryId ?? '';
      const bucket = map.get(key) ?? map.get('');
      if (bucket) bucket.push(t);
    }
    return map;
  }, [allTags]);

  const tagTreeRows = useMemo(() => buildTagTreeRows(allTags), [allTags]);

  const handleParentChange = async (tagId: string, nextParentId: string | null) => {
    const result = await setTagParent(tagId, nextParentId);
    setParentErrors((prev) => ({
      ...prev,
      [tagId]: result?.error ?? '',
    }));
  };

  const resetDragState = () => {
    setDraggedTagId(null);
    setDropTargetId(null);
    setRootDropActive(false);
  };

  const handleColorChange = async (tagId: string, newColor: string) => {
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
      setPendingDeleteName('');
      setPendingUsageCount(0);
    }
  };

  const handleRenameStart = (tagId: string, currentName: string) => {
    setMergingFromId(null);
    setMergeError('');
    setRenamingTagId(tagId);
    setRenameInput(currentName);
    setRenameError('');
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
    setRenameError('');
  };

  const handleMergeStart = (tagId: string) => {
    setRenamingTagId(null);
    setRenameError('');
    setMergingFromId(tagId);
    setMergeIntoId('');
    setMergeError('');
  };

  const handleMergeConfirm = async () => {
    if (!mergingFromId || !mergeIntoId) return;
    let shouldClose = false;
    try {
      setIsMerging(true);
      const result = await mergeTags(mergingFromId, mergeIntoId);
      if ('error' in result) {
        setMergeError(result.error);
        return;
      }
      setMergeError('');
      shouldClose = true;
    } finally {
      setIsMerging(false);
      if (shouldClose) {
        setMergingFromId(null);
        setMergeIntoId('');
      }
    }
  };

  return (
    <div className={cn('min-w-0 space-y-6 overflow-x-hidden', className)}>
      {allTags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-400">
          <TagIcon className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>登録されているタグはありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">タグ階層エディタ</h3>
                <p className="mt-1 text-xs text-slate-500">タグを別タグの上にドロップすると子になります。外側の領域にドロップするとルートに戻せます。</p>
              </div>
            </div>

            <div
              className={cn(
                'rounded-2xl border border-dashed bg-white p-3 transition-colors',
                rootDropActive ? 'border-primary-500 bg-primary-50/60' : 'border-slate-300'
              )}
              onDragOver={(event) => {
                event.preventDefault();
                if (!draggedTagId) return;
                setRootDropActive(true);
                setDropTargetId(null);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setRootDropActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const currentDraggedTagId = draggedTagId;
                resetDragState();
                if (!currentDraggedTagId) return;
                void handleParentChange(currentDraggedTagId, null);
              }}
            >
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                ここにドロップすると親を外します
              </div>

              <div className="space-y-2">
                {tagTreeRows.map(({ tag, depth }) => {
                  const isDropTarget = dropTargetId === tag.id;
                  return (
                    <div
                      key={tag.id}
                      draggable
                      onDragStart={() => {
                        setDraggedTagId(tag.id);
                        setRootDropActive(false);
                      }}
                      onDragEnd={resetDragState}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!draggedTagId || draggedTagId === tag.id) return;
                        setDropTargetId(tag.id);
                        setRootDropActive(false);
                      }}
                      onDragLeave={(event) => {
                        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                        if (dropTargetId === tag.id) {
                          setDropTargetId(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const currentDraggedTagId = draggedTagId;
                        resetDragState();
                        if (!currentDraggedTagId || currentDraggedTagId === tag.id) return;
                        void handleParentChange(currentDraggedTagId, tag.id);
                      }}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm transition-colors',
                        isDropTarget ? 'border-primary-500 bg-primary-50' : 'border-slate-200'
                      )}
                      style={{ paddingLeft: `${depth * 24 + 12}px` }}
                    >
                      <span className="cursor-grab text-slate-400 active:cursor-grabbing" aria-hidden="true">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-medium text-slate-400">{depth === 0 ? 'ROOT' : `L${depth}`}</span>
                      <TagBadge label={tag.name} size="sm" colorClass={tag.color} />
                    </div>
                  );
                })}
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
                <div className="grid grid-cols-1 gap-3">
                  {tagList.map((tag) => (
                    <div key={tag.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        {renamingTagId === tag.id ? (
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                ref={renameInputRef}
                                value={renameInput}
                                onChange={(e) => {
                                  setRenameInput(e.target.value);
                                  setRenameError('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleRenameConfirm(tag.id);
                                  if (e.key === 'Escape') setRenamingTagId(null);
                                }}
                                className="h-8 min-w-0 flex-1 text-sm"
                              />
                              <Button size="sm" className="h-8 px-3 text-xs" onClick={() => void handleRenameConfirm(tag.id)}>
                                保存
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setRenamingTagId(null)}>
                                ×
                              </Button>
                            </div>
                            {renameError && <p className="px-1 text-xs text-red-500">{renameError}</p>}
                          </div>
                        ) : (
                          <TagBadge
                            label={tag.name}
                            size="md"
                            colorClass={tag.color}
                            className="max-w-full"
                          />
                        )}

                        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="shrink-0 text-xs text-slate-500">カテゴリ</span>
                              <select
                                value={tag.categoryId ?? '__none__'}
                                onChange={(event) => void setTagCategory(tag.id, event.target.value === '__none__' ? null : event.target.value)}
                                className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm sm:min-w-[160px]"
                              >
                                <option value="__none__">なし</option>
                                {categoryOptions.map((category) => (
                                  <option key={category.id} value={category.id}>
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
                                  await setTagCategory(tag.id, categoryId);
                                }}
                              >
                                ＋新規カテゴリ
                              </Button>
                            </div>
                            <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                              <summary className="cursor-pointer list-none text-xs font-medium text-slate-500">
                                詳細設定
                              </summary>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="shrink-0 text-xs text-slate-500">親</span>
                                <select
                                  value={tag.parentId ?? '__none__'}
                                  onChange={(event) => void handleParentChange(tag.id, event.target.value === '__none__' ? null : event.target.value)}
                                  className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm sm:min-w-[160px]"
                                >
                                  <option value="__none__">なし</option>
                                  {allTags
                                    .filter((candidate) => candidate.id !== tag.id)
                                    .map((candidate) => (
                                      <option key={candidate.id} value={candidate.id}>
                                        {candidate.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <p className="mt-2 text-[11px] text-slate-400">通常は上の階層エディタで変更し、ここは補助として使います。</p>
                              {parentErrors[tag.id] ? <p className="mt-2 px-1 text-xs text-red-500">{parentErrors[tag.id]}</p> : null}
                            </details>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {DEFAULT_COLORS.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => void handleColorChange(tag.id, color)}
                                  className={cn(
                                    'h-7 w-7 shrink-0 rounded-full border-2 ring-1 ring-slate-300/70 shadow-sm transition-all hover:scale-105',
                                    color.split(' ')[0],
                                    color.split(' ')[2],
                                    tag.color === color
                                      ? 'scale-110 ring-2 ring-primary-600 ring-offset-2 opacity-100 shadow-md'
                                      : 'opacity-80 hover:opacity-100'
                                  )}
                                >
                                  {tag.color === color && <Check className="mx-auto h-3 w-3 text-slate-700/70" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 self-start sm:justify-start">
                            <button
                              type="button"
                              onClick={() => handleRenameStart(tag.id, tag.name)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-500"
                              aria-label={`${tag.name} をリネーム`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMergeStart(tag.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-500"
                              aria-label={`${tag.name} をマージ`}
                            >
                              <GitMerge className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void openDeleteDialog(tag.id, tag.name)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                              aria-label={`${tag.name} を削除`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {mergingFromId === tag.id && (
                        <div className="flex flex-col gap-2 px-4 pb-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="shrink-0 text-xs text-slate-500">マージ先:</span>
                            <select
                              value={mergeIntoId}
                              onChange={(e) => {
                                setMergeIntoId(e.target.value);
                                setMergeError('');
                              }}
                              className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm sm:min-w-[220px]"
                            >
                              <option value="">-- 選択 --</option>
                              {allTags.filter((t) => t.id !== tag.id).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <Button size="sm" className="h-8 px-3 text-xs" disabled={!mergeIntoId || isMerging} onClick={() => void handleMergeConfirm()}>
                              {isMerging ? '実行中...' : 'マージ'}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => {
                              setMergingFromId(null);
                              setMergeIntoId('');
                              setMergeError('');
                            }}>
                              ×
                            </Button>
                          </div>
                          {mergeError && <p className="px-1 text-xs text-red-500">{mergeError}</p>}
                        </div>
                      )}
                    </div>
                  ))}
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
            setPendingDeleteName('');
            setPendingUsageCount(0);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">タグを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{pendingDeleteName}」を削除すると、{pendingUsageCount} 件のカードからこのタグが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirmed();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
