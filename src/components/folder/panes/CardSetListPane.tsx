import { useCardSets } from "@/hooks/cardSet/useCardSets";
import type { CardSet } from "@/types";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Plus, Layers, Trash2 } from "@/ui/icons";

interface CardSetListPaneProps {
  folderId: string;
  selectedCardSetId: string | null;
  onCardSetSelect: (cardSetId: string) => void;
}

export function CardSetListPane({
  folderId,
  selectedCardSetId,
  onCardSetSelect,
}: CardSetListPaneProps) {
  const { cardSets, loading, createCardSet, deleteCardSet } = useCardSets(folderId);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const cs = await createCardSet(name, folderId);
    setNewName("");
    setIsCreating(false);
    onCardSetSelect(cs.id);
  };

  const handleDeleteConfirm = async (cs: CardSet) => {
    if (!window.confirm(`「${cs.name}」を削除しますか？\n配下のカードもすべて削除されます。`)) return;
    await deleteCardSet(cs.id);
    if (selectedCardSetId === cs.id) onCardSetSelect("");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-slate-400 text-sm">読み込み中...</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">カードセット</h2>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Plus className="w-3 h-3" />
          新規作成
        </button>
      </div>

      {isCreating && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
            }}
            placeholder="セット名を入力..."
            className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            作成
          </button>
          <button
            type="button"
            onClick={() => { setIsCreating(false); setNewName(""); }}
            className="px-2 py-1 text-xs border border-slate-200 rounded text-slate-500 hover:bg-slate-50"
          >
            キャンセル
          </button>
        </div>
      )}

      {cardSets.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Layers className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-400">カードセットがありません</p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-xs text-blue-500 hover:underline"
          >
            最初のセットを作成する
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {cardSets.map((cs) => (
            <li key={cs.id}>
              <div
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-colors",
                  selectedCardSetId === cs.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "hover:bg-slate-50 text-slate-700 border border-transparent",
                )}
                onClick={() => onCardSetSelect(cs.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onCardSetSelect(cs.id)}
              >
                <Layers className={cn("w-4 h-4 shrink-0", selectedCardSetId === cs.id ? "text-blue-500" : "text-slate-400")} />
                <span className="flex-1 text-sm font-medium truncate">{cs.name}</span>
                {cs.description && (
                  <span className="text-xs text-slate-400 truncate hidden sm:block max-w-[120px]">{cs.description}</span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteConfirm(cs); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                  aria-label={`${cs.name}を削除`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
