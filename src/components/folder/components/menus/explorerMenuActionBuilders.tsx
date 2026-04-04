import { FileText, Folder, Pencil, Plus, Tag, Trash2 } from "@/ui/icons";
import type { MenuAction } from "./menuActions";

interface BuildFolderMenuActionsParams {
  onCreateSubfolder?: () => void;
  onCreateCardSet?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onBulkTag?: () => void;
}

interface BuildExplorerCreateMenuActionsParams {
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onAddPdf?: () => void | Promise<void>;
  onAddPptx?: () => void | Promise<void>;
}

/**
 * フォルダ用コンテキストメニューのアクション定義をビルド
 */
export const buildFolderMenuActions = ({
  onCreateSubfolder,
  onCreateCardSet,
  onRename,
  onDelete,
  onBulkTag,
}: BuildFolderMenuActionsParams): MenuAction[] => {
  const actions: MenuAction[] = [];

  if (onCreateSubfolder) {
    actions.push({
      id: "create-subfolder",
      label: "新規フォルダ",
      icon: <Folder className="h-4 w-4" />,
      onSelect: onCreateSubfolder,
    });
  }

  if (onCreateCardSet) {
    actions.push({
      id: "create-card-set",
      label: "新規カードセット",
      icon: <Plus className="h-4 w-4 text-blue-500" />,
      onSelect: onCreateCardSet,
    });
  }

  if (onRename) {
    actions.push({
      id: "rename",
      label: "名前を変更",
      icon: <Pencil className="h-4 w-4" />,
      separatorBefore: actions.length > 0,
      onSelect: onRename,
    });
  }

  if (onBulkTag) {
    actions.push({
      id: "bulk-tag",
      label: "タグを一括付与",
      icon: <Tag className="h-4 w-4 text-violet-500" />,
      onSelect: onBulkTag,
    });
  }

  if (onDelete) {
    actions.push({
      id: "delete",
      label: "削除",
      icon: <Trash2 className="h-4 w-4" />,
      danger: true,
      separatorBefore: true,
      onSelect: onDelete,
    });
  }

  return actions;
};

/**
 * 追加ボタン（＋）メニューのアクション定義をビルド
 */
export const buildExplorerCreateMenuActions = ({
  canCreateCardSet = false,
  canAddDocuments = false,
  onCreateRootFolder,
  onCreateCardSet,
  onAddPdf,
  onAddPptx,
}: BuildExplorerCreateMenuActionsParams): MenuAction[] => {
  const actions: MenuAction[] = [
    {
      id: "create-root-folder",
      label: "新規フォルダ",
      icon: <Folder className="h-4 w-4" />,
      onSelect: () => {
        void onCreateRootFolder?.();
      },
    },
  ];

  if (canCreateCardSet) {
    actions.push({
      id: "create-card-set",
      label: "新規カードセット",
      icon: <Plus className="h-4 w-4" />,
      onSelect: () => {
        void onCreateCardSet?.();
      },
    });
  }

  if (canAddDocuments) {
    actions.push(
      {
        id: "add-pdf",
        label: "PDF追加",
        icon: <FileText className="h-4 w-4" />,
        onSelect: () => {
          void onAddPdf?.();
        },
      },
      {
        id: "add-pptx",
        label: "PPTX追加",
        icon: <FileText className="h-4 w-4" />,
        onSelect: () => {
          void onAddPptx?.();
        },
      },
    );
  }

  return actions;
};
