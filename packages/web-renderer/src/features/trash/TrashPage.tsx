import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import type { Card, Folder } from "@/types";
import { useTrashItems } from "./useTrashItems";

type TrashItemRow = {
  id: string;
  kind: "folder" | "card";
  title: string;
  subtitle: string;
};

const getFolderTitle = (folder: Folder): string => {
  return folder.folderName || "無題のフォルダ";
};

const getCardTitle = (card: Card): string => {
  return card.title || card.questionNumber || "無題のカード";
};

const createFolderRows = (folders: Folder[]): TrashItemRow[] => {
  return folders.map((folder) => ({
    id: folder.id,
    kind: "folder",
    title: getFolderTitle(folder),
    subtitle: "フォルダ",
  }));
};

const createCardRows = (cards: Card[]): TrashItemRow[] => {
  return cards.map((card) => ({
    id: card.id,
    kind: "card",
    title: getCardTitle(card),
    subtitle: "カード",
  }));
};

const TrashPage = () => {
  const { currentUser, loading } = useAuthSession();
  const userId = currentUser?.uid ?? null;
  const { items, status, errorMessage, refresh, restore, permanentlyDelete, empty } = useTrashItems(userId);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return [...createFolderRows(items.folders), ...createCardRows(items.cards)];
  }, [items.cards, items.folders]);

  const isBusy = status === "loading" || pendingActionId !== null;
  const hasItems = rows.length > 0;

  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [loading, refresh]);

  const handleRestore = async (row: TrashItemRow) => {
    const actionId = `restore:${row.kind}:${row.id}`;
    setPendingActionId(actionId);

    try {
      await restore({
        folderIds: row.kind === "folder" ? [row.id] : [],
        cardIds: row.kind === "card" ? [row.id] : [],
      });
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDelete = async (row: TrashItemRow) => {
    const actionId = `delete:${row.kind}:${row.id}`;
    setPendingActionId(actionId);

    try {
      await permanentlyDelete({
        folderIds: row.kind === "folder" ? [row.id] : [],
        cardIds: row.kind === "card" ? [row.id] : [],
      });
    } finally {
      setPendingActionId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setPendingActionId("empty");

    try {
      await empty();
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <main className="h-full min-h-0 w-full overflow-auto bg-white px-6 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trash</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">ゴミ箱</h1>
            <p className="mt-2 text-sm text-slate-600">削除済みのフォルダとカードを復元、または完全に削除します。</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isBusy}>
              再読み込み
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleEmptyTrash()} disabled={isBusy || !hasItems}>
              ゴミ箱を空にする
            </Button>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {!currentUser && !loading ? (
          <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            ゴミ箱を表示するにはログインが必要です。
          </section>
        ) : null}

        {currentUser && status === "loading" ? (
          <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            読み込み中です。
          </section>
        ) : null}

        {currentUser && status !== "loading" && !hasItems ? (
          <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            ゴミ箱は空です。
          </section>
        ) : null}

        {currentUser && hasItems ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>Item</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <article key={`${row.kind}:${row.id}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium text-slate-950">{row.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{row.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleRestore(row)} disabled={isBusy}>
                      復元
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => void handleDelete(row)} disabled={isBusy}>
                      完全削除
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default TrashPage;
