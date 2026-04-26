import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/contexts/ToastContext";
import {
  buildPortableImportBatchItems,
  formatPortableImportBatchItemSubtitle,
  importPortableFileBatch,
  type PortableImportBatchItem,
} from "@/features/import/application/importPortableFileBatch";
import type {
  CreateMfDeckCard,
  CreateMfDeckCardSet,
  EnsureMfDeckTagByName,
  UpdateMfDeckCardSet,
} from "@/features/deckFile/application/importMfDeck";
import { cn } from "@/lib/utils";

export type PortableImportBatchCompletedPayload = {
  cardSetId: string;
  cardSetName: string;
  folderId: string;
  createdCount: number;
};

type PortableImportBatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName?: string | null;
  files: File[];
  filesRevision?: number;
  onImported?: (payload: PortableImportBatchCompletedPayload) => void;
  createCardSet: CreateMfDeckCardSet;
  updateCardSet?: UpdateMfDeckCardSet;
  createCard: CreateMfDeckCard;
  ensureTagByName?: EnsureMfDeckTagByName;
};

const STATUS_LABELS: Record<PortableImportBatchItem["status"], string> = {
  queued: "待機中",
  parsing: "解析中",
  importing: "取り込み中",
  imported: "完了",
  failed: "失敗",
  skipped: "スキップ",
};

const STATUS_CLASS_NAMES: Record<PortableImportBatchItem["status"], string> = {
  queued: "bg-slate-100 text-slate-600",
  parsing: "bg-blue-50 text-blue-700",
  importing: "bg-blue-50 text-blue-700",
  imported: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
  skipped: "bg-amber-50 text-amber-700",
};

export const PortableImportBatchDialog = ({
  open,
  onOpenChange,
  folderId,
  folderName,
  files,
  filesRevision = 0,
  onImported,
  createCardSet,
  updateCardSet,
  createCard,
  ensureTagByName,
}: PortableImportBatchDialogProps) => {
  const toast = useToast();
  const [items, setItems] = useState<PortableImportBatchItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(buildPortableImportBatchItems(files));
  }, [files, filesRevision, open]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      imported: items.filter((item) => item.status === "imported").length,
      failed: items.filter((item) => item.status === "failed").length,
      pending: items.filter(
        (item) =>
          item.status === "queued" ||
          item.status === "parsing" ||
          item.status === "importing",
      ).length,
      createdCards: items.reduce(
        (total, item) => total + (item.createdCount ?? 0),
        0,
      ),
    };
  }, [items]);

  const handleClose = (nextOpen: boolean) => {
    if (isImporting) return;

    if (!nextOpen) {
      setItems([]);
    }

    onOpenChange(nextOpen);
  };

  const handleImportAll = async () => {
    if (!folderId) {
      toast.error("インポート先フォルダが選択されていません。");
      return;
    }

    if (items.length === 0) {
      toast.error("取り込める MFDeck / MFCard がありません。");
      return;
    }

    setIsImporting(true);

    try {
      const result = await importPortableFileBatch({
        files: items.map((item) => item.file),
        folderId,
        createCardSet,
        updateCardSet,
        createCard,
        ensureTagByName,
        onItemChange: (changedItem) => {
          setItems((currentItems) =>
            currentItems.map((item) =>
              item.id === changedItem.id ? changedItem : item,
            ),
          );
        },
      });

      if (result.importedCount > 0) {
        toast.success(
          `${result.importedCount} 件のファイルから ${result.createdCardCount} 件のカードをインポートしました。`,
        );
      }

      if (result.failedCount > 0 || result.skippedCount > 0) {
        toast.warning(
          `${result.failedCount + result.skippedCount} 件のファイルを取り込めませんでした。`,
        );
      }

      if (result.importedCount > 0 && result.lastImportedCardSetId) {
        onImported?.({
          cardSetId: result.lastImportedCardSetId,
          cardSetName: result.lastImportedCardSetName ?? "カードセット",
          folderId,
          createdCount: result.createdCardCount,
        });
      }
    } catch (error) {
      console.error("[PortableImportBatchDialog] import failed", error);
      toast.error("一括インポート中にエラーが発生しました。");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>MF ファイルをまとめてインポート</DialogTitle>
          <DialogDescription>
            {folderName
              ? `インポート先: ${folderName}`
              : "選択中のフォルダに MFDeck / MFCard をまとめて追加します。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">ファイル数</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {summary.total}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">完了</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {summary.imported}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">失敗</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {summary.failed}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500">カード数</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {summary.createdCards}
              </p>
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
            {items.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                取り込める MFDeck / MFCard がありません。
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="grid gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatPortableImportBatchItemSubtitle(item)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          STATUS_CLASS_NAMES[item.status],
                        )}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>

                    {item.createdCardSetName || item.createdCount ? (
                      <p className="text-xs text-slate-500">
                        {item.createdCardSetName ?? "カードセット"} /{" "}
                        {item.createdCount ?? 0} 件
                        {item.warningCount
                          ? ` / warning ${item.warningCount}`
                          : ""}
                      </p>
                    ) : null}

                    {item.errorMessage ? (
                      <p className="text-xs font-medium text-rose-600">
                        {item.errorMessage}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isImporting}
          >
            閉じる
          </Button>
          <Button
            type="button"
            onClick={handleImportAll}
            disabled={isImporting || items.length === 0 || !folderId}
          >
            {isImporting ? "インポート中..." : "まとめてインポート"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
