import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Tag } from '@/hooks/useTags';
import type { ViewDef, ViewKind } from './viewTypes';

interface ViewManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  views: ViewDef[];
  tags: Tag[];
  categoryNameEntries: Array<[string, string]>;
  onAddView: (kind: ViewKind) => void;
  onRenameView: (id: string, name: string) => void;
  onDeleteView: (id: string) => void;
  onUpdateCategoryName: (categoryId: string, name: string) => void;
  onUpdateUngroupedLabel: (viewId: string, label: string) => void;
  onUpdateViewOptions: (viewId: string, options: NonNullable<ViewDef['options']>) => void;
}

export function ViewManagerDialog(props: ViewManagerDialogProps) {
  const {
    open,
    onOpenChange,
    views,
    tags,
    categoryNameEntries,
    onAddView,
    onRenameView,
    onDeleteView,
    onUpdateCategoryName,
    onUpdateUngroupedLabel,
    onUpdateViewOptions,
  } = props;
  const [newViewKind, setNewViewKind] = useState<ViewKind>('tagCategory');
  const [viewNameDrafts, setViewNameDrafts] = useState<Record<string, string>>({});
  const [ungroupedLabelDrafts, setUngroupedLabelDrafts] = useState<Record<string, string>>({});
  const [categoryNameDrafts, setCategoryNameDrafts] = useState<Record<string, string>>({});
  const [tagSearchDrafts, setTagSearchDrafts] = useState<Record<string, string>>({});
  const customViews = useMemo(() => views.filter((view) => view.kind !== 'folder'), [views]);
  const sortedTags = useMemo(
    () => [...tags].sort((left, right) => left.name.localeCompare(right.name, 'ja')),
    [tags]
  );
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  useEffect(() => {
    if (!open) return;

    const nextViewNameDrafts: Record<string, string> = {};
    const nextUngroupedLabelDrafts: Record<string, string> = {};
    const nextCategoryNameDrafts: Record<string, string> = {};

    for (const view of views) {
      nextViewNameDrafts[view.id] = view.name;
      nextUngroupedLabelDrafts[view.id] = view.options?.ungroupedLabel ?? '';
    }

    for (const [categoryId, displayName] of categoryNameEntries) {
      nextCategoryNameDrafts[categoryId] = displayName;
    }

    setViewNameDrafts(nextViewNameDrafts);
    setUngroupedLabelDrafts(nextUngroupedLabelDrafts);
    setCategoryNameDrafts(nextCategoryNameDrafts);
    setTagSearchDrafts({});
  }, [open, views, categoryNameEntries]);

  const commitViewName = (viewId: string) => {
    const nextValue = (viewNameDrafts[viewId] ?? '').trim();
    const currentValue = views.find((view) => view.id === viewId)?.name ?? '';
    if (nextValue && nextValue !== currentValue) {
      onRenameView(viewId, nextValue);
      return;
    }
    setViewNameDrafts((prev) => ({ ...prev, [viewId]: currentValue }));
  };

  const commitUngroupedLabel = (viewId: string) => {
    const nextValue = (ungroupedLabelDrafts[viewId] ?? '').trim();
    const currentValue = views.find((view) => view.id === viewId)?.options?.ungroupedLabel ?? '';
    if (nextValue !== currentValue) {
      onUpdateUngroupedLabel(viewId, nextValue);
    }
  };

  const commitCategoryName = (categoryId: string) => {
    const nextValue = (categoryNameDrafts[categoryId] ?? '').trim();
    const currentValue = categoryNameEntries.find(([id]) => id === categoryId)?.[1] ?? '';
    if (nextValue !== currentValue) {
      onUpdateCategoryName(categoryId, nextValue);
    }
  };

  const updateTagTreeOptions = (view: ViewDef, patch: Partial<NonNullable<ViewDef['options']>>) => {
    onUpdateViewOptions(view.id, {
      ...view.options,
      scopeMode: view.options?.scopeMode ?? 'all',
      hideZeroUsage: view.options?.hideZeroUsage ?? true,
      ungroupedLabel: view.options?.ungroupedLabel ?? '未分類',
      ...patch,
    });
  };

  const filterTags = (viewId: string) => {
    const keyword = (tagSearchDrafts[viewId] ?? '').trim().toLowerCase();
    if (keyword.length === 0) return sortedTags;
    return sortedTags.filter((tag) => tag.nameLower.includes(keyword));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ビュー管理</DialogTitle>
          <DialogDescription>ビュー名と tagTree の表示範囲を編集します。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-view-kind">新しいビュー種別</Label>
                <select
                  id="new-view-kind"
                  value={newViewKind}
                  onChange={(event) => setNewViewKind(event.target.value as ViewKind)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="tagCategory">tagCategory</option>
                  <option value="tagTree">tagTree</option>
                </select>
              </div>
              <Button type="button" onClick={() => onAddView(newViewKind)}>追加</Button>
            </div>

            <div className="space-y-3">
              {views.map((view) => (
                <div key={view.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={viewNameDrafts[view.id] ?? ''}
                      onChange={(event) => setViewNameDrafts((prev) => ({ ...prev, [view.id]: event.target.value }))}
                      onBlur={() => commitViewName(view.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <div className="min-w-24 text-xs text-slate-500">{view.kind}</div>
                    <Button type="button" variant="outline" disabled={view.kind === 'folder'} onClick={() => onDeleteView(view.id)}>
                      削除
                    </Button>
                  </div>
                  {view.kind === 'tagCategory' ? (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`ungrouped-${view.id}`}>未分類ラベル</Label>
                      <Input
                        id={`ungrouped-${view.id}`}
                        value={ungroupedLabelDrafts[view.id] ?? ''}
                        onChange={(event) => setUngroupedLabelDrafts((prev) => ({ ...prev, [view.id]: event.target.value }))}
                        onBlur={() => commitUngroupedLabel(view.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  {view.kind === 'tagTree' ? (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`scope-${view.id}`}>範囲</Label>
                        <select
                          id={`scope-${view.id}`}
                          value={view.options?.scopeMode ?? 'all'}
                          onChange={(event) => {
                            const nextScopeMode = event.target.value as NonNullable<ViewDef['options']>['scopeMode'];
                            updateTagTreeOptions(view, { scopeMode: nextScopeMode });
                          }}
                          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                        >
                          <option value="all">全て</option>
                          <option value="selectedRoots">ルートタグで絞る</option>
                          <option value="selectedTags">タグ選択</option>
                          <option value="prefix">プレフィックス</option>
                        </select>
                      </div>

                      {(view.options?.scopeMode ?? 'all') === 'selectedRoots' ? (
                        <div className="space-y-2">
                          <Label htmlFor={`root-tag-search-${view.id}`}>起点ルートタグ</Label>
                          <Input
                            id={`root-tag-search-${view.id}`}
                            placeholder="タグ名で検索"
                            value={tagSearchDrafts[view.id] ?? ''}
                            onChange={(event) => setTagSearchDrafts((prev) => ({ ...prev, [view.id]: event.target.value }))}
                          />
                          <p className="text-xs text-slate-500">選んだルートタグ配下の子孫タグも表示します。</p>
                          {(view.options?.rootTagIds?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-2">
                              {(view.options?.rootTagIds ?? []).map((rootTagId) => (
                                <span key={rootTagId} className="rounded-full border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-700">
                                  {tagById.get(rootTagId)?.name ?? rootTagId}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed border-slate-200 p-2 text-xs text-slate-400">
                              まだルートタグは選択されていません
                            </div>
                          )}
                          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
                            {filterTags(view.id).map((tag) => {
                              const rootTagIds = view.options?.rootTagIds ?? [];
                              const checked = rootTagIds.includes(tag.id);
                              return (
                                <label
                                  key={tag.id}
                                  className={checked ? 'flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-sm text-slate-700' : 'flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700'}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      const nextRootTagIds = event.target.checked
                                        ? [...rootTagIds, tag.id]
                                        : rootTagIds.filter((rootTagId) => rootTagId !== tag.id);
                                      updateTagTreeOptions(view, { rootTagIds: nextRootTagIds });
                                    }}
                                  />
                                  <span className="truncate">{tag.name}</span>
                                  {checked ? <span className="ml-auto text-[11px] font-medium text-emerald-700">選択中</span> : null}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {(view.options?.scopeMode ?? 'all') === 'selectedTags' ? (
                        <div className="space-y-2">
                          <Label htmlFor={`tag-search-${view.id}`}>含めるタグ</Label>
                          <Input
                            id={`tag-search-${view.id}`}
                            placeholder="タグ名で検索"
                            value={tagSearchDrafts[view.id] ?? ''}
                            onChange={(event) => setTagSearchDrafts((prev) => ({ ...prev, [view.id]: event.target.value }))}
                          />
                          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
                            {filterTags(view.id).map((tag) => {
                              const includedTagIds = view.options?.includedTagIds ?? [];
                              const checked = includedTagIds.includes(tag.id);
                              return (
                                <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      const nextIncludedTagIds = event.target.checked
                                        ? [...includedTagIds, tag.id]
                                        : includedTagIds.filter((tagId) => tagId !== tag.id);
                                      updateTagTreeOptions(view, { includedTagIds: nextIncludedTagIds });
                                    }}
                                  />
                                  <span className="truncate">{tag.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {(view.options?.scopeMode ?? 'all') === 'prefix' ? (
                        <div className="space-y-2">
                          <Label htmlFor={`prefix-${view.id}`}>プレフィックス</Label>
                          <Input
                            id={`prefix-${view.id}`}
                            placeholder="javascript/"
                            value={view.options?.tagNamePrefix ?? ''}
                            onChange={(event) => updateTagTreeOptions(view, { tagNamePrefix: event.target.value })}
                          />
                        </div>
                      ) : null}

                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={view.options?.hideZeroUsage ?? true}
                          onChange={(event) => updateTagTreeOptions(view, { hideZeroUsage: event.target.checked })}
                        />
                        <span>0件タグを隠す</span>
                      </label>
                    </div>
                  ) : null}
                </div>
              ))}
              {customViews.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  カスタムビューはまだありません。
                </div>
              ) : null}
            </div>
          </section>

          <details className="space-y-3 rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">カテゴリ表示名</summary>
            <div className="mt-3 space-y-3">
              {categoryNameEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  categoryId を持つタグはまだありません。
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryNameEntries.map(([categoryId, displayName]) => (
                    <div key={categoryId} className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-3">
                      <div className="truncate text-xs text-slate-500">{categoryId}</div>
                      <Input
                        value={categoryNameDrafts[categoryId] ?? displayName}
                        onChange={(event) => setCategoryNameDrafts((prev) => ({ ...prev, [categoryId]: event.target.value }))}
                        onBlur={() => commitCategoryName(categoryId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
