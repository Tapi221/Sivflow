import { Plus, Pencil, Trash2, Folder, ArrowRight, Tag } from "@/ui/icons";
import { Pin } from "@/ui/icons";
// Note: If IDE still reports Star as missing, we verify that npm run typecheck passes.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContextMenuProps {
  type: "folder" | "card";
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreateSubfolder?: () => void;
  onCreateCard?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onBulkTag?: () => void;
  // ピン留め機能
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function ContextMenu({
  type,
  children,
  open,
  onOpenChange,
  onCreateSubfolder,
  onCreateCard,
  onRename,
  onDelete,
  onMove,
  onBulkTag,
  isPinned,
  onTogglePin,
}: ContextMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {type === "folder" && (
          <>
            {onCreateSubfolder && (
              <DropdownMenuItem onClick={onCreateSubfolder} className="gap-2">
                <Folder className="w-4 h-4" /> 新規フォルダ
              </DropdownMenuItem>
            )}
            {onCreateCard && (
              <DropdownMenuItem onClick={onCreateCard} className="gap-2">
                <Plus className="w-4 h-4 text-blue-500" /> 新規カード
              </DropdownMenuItem>
            )}
            {(onCreateSubfolder || onCreateCard) && <DropdownMenuSeparator />}
          </>
        )}

        {/* ピン留め / ピン解除 */}
        {onTogglePin && (
          <DropdownMenuItem onClick={onTogglePin} className="gap-2">
            <Pin className={`w-4 h-4 ${isPinned ? "text-amber-500" : ""}`} />
            {isPinned ? "ピン留め解除" : "ピン留め"}
          </DropdownMenuItem>
        )}

        {onRename && (
          <DropdownMenuItem onClick={onRename} className="gap-2">
            <Pencil className="w-4 h-4" /> 名前を変更
          </DropdownMenuItem>
        )}

        {type === "card" && onMove && (
          <DropdownMenuItem onClick={onMove} className="gap-2">
            <ArrowRight className="w-4 h-4" /> 移動
          </DropdownMenuItem>
        )}

        {type === "folder" && onBulkTag && (
          <DropdownMenuItem onClick={onBulkTag} className="gap-2">
            <Tag className="w-4 h-4 text-violet-500" /> タグを一括付与
          </DropdownMenuItem>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> 削除
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
