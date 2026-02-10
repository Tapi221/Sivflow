import React from 'react';
import { Plus, Pencil, Trash2, Folder, ArrowRight, Bookmark } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

interface ContextMenuProps {
  type: 'folder' | 'card';
  children: React.ReactNode;
  onCreateSubfolder?: () => void;
  onCreateCard?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  // ピン留め機能
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function ContextMenu({
  type,
  children,
  onCreateSubfolder,
  onCreateCard,
  onRename,
  onDelete,
  onMove,
  isPinned,
  onTogglePin,
}: ContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {type === 'folder' && (
          <>
            {onCreateSubfolder && (
              <DropdownMenuItem onClick={onCreateSubfolder} className="gap-2">
                <Folder className="w-4 h-4" /> 新規フォルダ（このフォルダ内）
              </DropdownMenuItem>
            )}
            {onCreateCard && (
              <DropdownMenuItem onClick={onCreateCard} className="gap-2">
                <Plus className="w-4 h-4 text-blue-500" /> 新規カード（このフォルダ内）
              </DropdownMenuItem>
            )}
            {(onCreateSubfolder || onCreateCard) && <DropdownMenuSeparator />}
          </>
        )}
        
        {/* ピン留め / ピン解除 */}
        {onTogglePin && (
          <DropdownMenuItem onClick={onTogglePin} className="gap-2">
            <Bookmark className={`w-4 h-4 ${isPinned ? 'fill-amber-400 text-amber-500' : ''}`} />
            {isPinned ? 'お気に入りから削除' : 'お気に入りに追加'}
          </DropdownMenuItem>
        )}
        
        {onRename && (
          <DropdownMenuItem onClick={onRename} className="gap-2">
            <Pencil className="w-4 h-4" /> 名前を変更
          </DropdownMenuItem>
        )}
        
        {type === 'card' && onMove && (
          <DropdownMenuItem onClick={onMove} className="gap-2">
            <ArrowRight className="w-4 h-4" /> 移動
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
