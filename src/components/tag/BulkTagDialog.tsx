import React, { useState } from "react";
import { getTagColorKey } from "@/chip/tag/tagColor";
import { Button } from "@/chip/ui/button/button";
import { Dialog, DialogContent, DialogTitle } from "@/chip/ui/dialog/dialog";
import { useTags } from "@/features/settings/hooks/useTags";
import { cn } from "@/lib/utils";
import { Tag as TagIcon } from "@/ui/icons";
import { TagBadge } from "@/components/tag/TagBadge";

interface BulkTagDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  folderId: string;
  folderName?: string;
}

const BulkTagDialog = ({
  open,
  isOpen,
  onOpenChange,
  onClose,
  folderId,
  folderName,
}: BulkTagDialogProps) => {
  const { tags, addTagToCardsInFolder } = useTags();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const resolvedOpen = open ?? isOpen ?? false;

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
    onOpenChange?.(false);
    onClose?.();
  };

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleClose}>
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
                    selectedTagId === tag.id &&
                    "ring-2 ring-primary-400 ring-offset-2",
                  )}
                >
                  <TagBadge
                    label={tag.name}
                    colorKey={getTagColorKey(tag.color)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeSubfolders}
            onChange={(event) => setIncludeSubfolders(event.target.checked)}
          />
          サブフォルダも含める
        </label>

        {result !== null && (
          <p className="text-sm text-emerald-600">
            {result}枚のカードにタグを付与しました。
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={isWorking}>
            閉じる
          </Button>
          <Button onClick={handleApply} disabled={!selectedTagId || isWorking}>
            {isWorking ? "適用中..." : "適用"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTagDialog;
