import { Pencil, Tag, Trash2 } from "@web-renderer/chip/icons";
import { AddDocumentIcon, BulkImportIcon, CreateCardIcon, CreateCardSetIcon, CreateFolderIcon, FolderContextCardSetIcon, FolderContextFolderIcon, FolderContextRenameIcon, FolderContextTrashIcon } from "./explorerMenuActionIcons";
import { beginInlineRename } from "./explorerMenuStateHelpers";
import type { MenuAction } from "./menuActions";



interface BuildFolderMenuActionsParams {
  onCreateSubfolder?: () => void;
  onCreateCardSet?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onBulkTag?: () => void;
}
interface BuildRenameDeleteMenuActionsParams {
  renameLabel?: string;
  deleteLabel?: string;
  onRename?: () => void;
  onDelete?: () => void;
}
interface BuildEntityRenameDeleteMenuActionsParams {
  id: string;
  name: string;
  type: "cardSet" | "document";
  beforeRename?: () => void;
  closeMenu?: () => void;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  canRename?: boolean;
  onDelete?: (id: string, type: "cardSet" | "document") => void;
  renameLabel?: string;
  deleteLabel?: string;
}
interface BuildExplorerCreateMenuActionsParams {
  canCreateCardSet?: boolean;
  canCreateCard?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onCreateCard?: () => void | Promise<void>;
  onAddDocument?: () => void | Promise<void>;
  onBulkImport?: () => void | Promise<void>;
}



const buildRenameDeleteMenuActions = ({ renameLabel = "名前を変更", deleteLabel = "削除", onRename, onDelete }: BuildRenameDeleteMenuActionsParams): MenuAction[] => {
  const actions: MenuAction[] = [];
  if (onRename) {
    actions.push({
      id: "rename",
      label: renameLabel,
      icon: <Pencil className="h-4 w-4" />,
      onSelect: onRename,
    });
  }
  if (onDelete) {
    actions.push({
      id: "delete",
      label: deleteLabel,
      icon: <Trash2 className="h-4 w-4" />,
      danger: true,
      onSelect: onDelete,
    });
  }
  return actions;
};
const buildEntityRenameDeleteMenuActions = ({ id, name, type, beforeRename, closeMenu, setEditingId, setEditingName, canRename = true, onDelete, renameLabel = "名前を変更", deleteLabel = "削除" }: BuildEntityRenameDeleteMenuActionsParams): MenuAction[] => buildRenameDeleteMenuActions({ renameLabel, deleteLabel, onRename: canRename ? () => {
  beginInlineRename({ id, name, closeMenu, setEditingId, setEditingName, beforeStart: beforeRename });
}
  : undefined,
onDelete: onDelete
  ? () => {
    onDelete(id, type);
  }
  : undefined,
});
const buildFolderMenuActions = ({ onCreateSubfolder, onCreateCardSet, onRename, onDelete, onBulkTag }: BuildFolderMenuActionsParams): MenuAction[] => {
  const actions: MenuAction[] = [];
  if (onCreateSubfolder) {
    actions.push({
      id: "create-subfolder",
      label: "新規フォルダ",
      icon: <FolderContextFolderIcon />,
      onSelect: onCreateSubfolder,
    });
  }
  if (onCreateCardSet) {
    actions.push({
      id: "create-card-set",
      label: "新規カードセット",
      icon: <FolderContextCardSetIcon />,
      onSelect: onCreateCardSet,
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
  if (onRename) {
    actions.push({
      id: "rename",
      label: "名前を変更",
      icon: <FolderContextRenameIcon />,
      onSelect: onRename,
    });
  }
  if (onDelete) {
    actions.push({
      id: "delete",
      label: "削除",
      icon: <FolderContextTrashIcon />,
      danger: true,
      onSelect: onDelete,
    });
  }
  return actions;
};
const buildExplorerCreateMenuActions = ({ canCreateCardSet = false, canCreateCard = false, canAddDocuments = false, canBulkImport = false, onCreateRootFolder, onCreateCardSet, onCreateCard, onAddDocument, onBulkImport }: BuildExplorerCreateMenuActionsParams): MenuAction[] => {
  const actions: MenuAction[] = [{ id: "create-root-folder", label: "新規プロジェクト", icon: <CreateFolderIcon />, onSelect: () => {
    void onCreateRootFolder?.();
  },
  },
  ];
  if (canCreateCardSet) {
    actions.push({
      id: "create-card-set",
      label: "新規カードセット",
      icon: <CreateCardSetIcon />,
      onSelect: () => {
        void onCreateCardSet?.();
      },
    });
  }
  if (canCreateCard) {
    actions.push({
      id: "create-card",
      label: "新規暗記カード",
      icon: <CreateCardIcon />,
      onSelect: () => {
        void onCreateCard?.();
      },
    });
  }
  if (canAddDocuments) {
    actions.push({
      id: "add-document",
      label: "文書追加",
      icon: <AddDocumentIcon />,
      onSelect: () => {
        void onAddDocument?.();
      },
    });
  }
  if (canBulkImport) {
    actions.push({
      id: "bulk-import",
      label: "一括インポート",
      icon: <BulkImportIcon />,
      separatorBefore: true,
      onSelect: () => {
        void onBulkImport?.();
      },
    });
  }
  return actions;
};



export { buildRenameDeleteMenuActions, buildEntityRenameDeleteMenuActions, buildFolderMenuActions, buildExplorerCreateMenuActions };
