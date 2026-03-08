import React from "react";
import { Settings2 } from "@/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Card, SelectedExplorerItem } from "@/types";
import { VirtualTreeView } from "./VirtualTreeView";
import type { TreeNode, ViewDef } from "./viewTypes";

interface ViewsPanelProps {
  views: ViewDef[];
  selectedViewId: string | null;
  nodes: TreeNode[];
  cards: Card[];
  selectedItem: SelectedExplorerItem;
  onSelectView: (viewId: string) => void | Promise<void>;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onOpenManager: () => void;
}

export function ViewsPanel({
  views,
  selectedViewId,
  nodes,
  cards,
  selectedItem,
  onSelectView,
  onItemSelect,
  onOpenManager,
}: ViewsPanelProps) {
  if (views.length === 0) {
    return (
      <div className="flex min-h-full items-start justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center">
          <p className="text-sm font-medium text-slate-700">
            ビューはまだありません
          </p>
          <p className="mt-1 text-xs text-slate-500">
            右上の設定からタグビューやタグツリーを追加できます。
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={onOpenManager}
          >
            ビュー管理を開く
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-100 px-2 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {views.map((view) => {
            const isActive = view.id === selectedViewId;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  void onSelectView(view.id);
                }}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {view.name}
              </button>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onOpenManager}
            aria-label="ビュー管理"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <VirtualTreeView
          nodes={nodes}
          cards={cards}
          selectedItem={selectedItem}
          onItemSelect={onItemSelect}
        />
      </div>
    </div>
  );
}




