import React, { useState } from "react";
import { Tag as TagIcon } from "@/ui/icons";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTags } from "@/hooks/settings/useTags";
import { TagBadge } from "@/components/tag/TagBadge";
import { getTagColorKey } from "@/lib/tags/tagColor";

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName?: string;
}

export default function BulkTagDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: BulkTagDialogProps) {
  const { tags, addTagToCardsInFolder } = useTags();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const handleApply = async () => {
    if (!selectedTagId) return;
    setIsWorking(true);
    setResult(null);
    try {
      const count = await addTagToCardsInFolder(
        folderId,
        selectedTagId,
        includeSubfolders,
      );
      setResult(count);
    } finally {
      setIsWorking(false);
    }
  };

  const handleClose = () => {
    setSelectedTagId(null);
    setIncludeSubfolders(false);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-primary-500" />
          配下カードにタグを一括付与
        </DialogTitle>

        {folderName && (
          <p className="text-sm text-slate-500 -mt-2">
            フォルダ:{" "}
            <span className="font-medium text-slate-700">{folderName}</span>
          </p>
        )}

        {/* タグ選択 */}
        <div className="mt-2">
          <p className="text-sm font-medium text-slate-700 mb-2">タグを選択</p>
          {tags.length === 0 ? (
            <p className="text-sm text-slate-400">
              タグがまだありません。先にタグを作成してください。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelectedTagId(tag.id === selectedTagId ? null : tag.id)
                  }
                  className={cn(
                    "rounded-full transition-all",
                    selectedTagId === tag.id
                      ? "ring-2 ring-offset-1 ring-primary-500 scale-105"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <TagBadge
                    label={tag.name}
                    size="md"
                    colorKey={getTagColorKey(tag.color)}
                    className="pointer-events-none"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* サブフォルダオプション */}
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeSubfolders}
            onChange={(e) => setIncludeSubfolders(e.target.checked)}
            className="rounded"
          />
          サブフォルダも含める
        </label>

        {/* 結果表示 */}
        {result !== null && (
          <p className="text-sm text-emerald-600 font-medium">
            {result} 件のカードにタグを付与しました
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isWorking}>
            閉じる
          </Button>
          <Button
            onClick={() => void handleApply()}
            disabled={!selectedTagId || isWorking}
          >
            {isWorking ? "処理中..." : "付与する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
