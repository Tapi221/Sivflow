import { Folder, Pencil, Plus, Tag, Trash2 } from "@/ui/icons";
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

const createMenuIconClassName = "h-[15px] w-[15px] shrink-0";

const CreateFolderIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-2h6a2 2 0 0 1 2 2v1" />
    <line x1="17" y1="11" x2="17" y2="17" />
    <line x1="14" y1="14" x2="20" y2="14" />
  </svg>
);

const CreateCardSetIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="7" width="13" height="10" rx="1.5" />
    <rect x="7" y="5" width="13" height="10" rx="1.5" />
  </svg>
);

const CreateCardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="13" rx="1.5" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <line x1="8" y1="6" x2="8" y2="11" />
  </svg>
);

const AddDocumentIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <polyline points="9 15 12 18 15 15" />
  </svg>
);

const BulkImportIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className={createMenuIconClassName}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path
      d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-5-6H8z"
      opacity={0.35}
    />
    <path d="M11 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-5-6h-3z" />
    <polyline points="11 9 16 9" />
    <line x1="13.5" y1="13" x2="13.5" y2="17" />
    <polyline points="11.5 15.2 13.5 17 15.5 15.2" />
  </svg>
);

export const buildRenameDeleteMenuActions = ({
  renameLabel = "名前を変更",
  deleteLabel = "削除",
  onRename,
  onDelete,
}: BuildRenameDeleteMenuActionsParams): MenuAction[] => {
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

export const buildEntityRenameDeleteMenuActions = ({
  id,
  name,
  type,
  beforeRename,
  closeMenu,
  setEditingId,
  setEditingName,
  canRename = true,
  onDelete,
  renameLabel = "名前を変更",
  deleteLabel = "削除",
}: BuildEntityRenameDeleteMenuActionsParams): MenuAction[] =>
  buildRenameDeleteMenuActions({
    renameLabel,
    deleteLabel,
    onRename: canRename
      ? () => {
          beginInlineRename({
            id,
            name,
            closeMenu,
            setEditingId,
            setEditingName,
            beforeStart: beforeRename,
          });
        }
      : undefined,
    onDelete: onDelete
      ? () => {
          onDelete(id, type);
        }
      : undefined,
  });

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

  if (onBulkTag) {
    actions.push({
      id: "bulk-tag",
      label: "タグを一括付与",
      icon: <Tag className="h-4 w-4 text-violet-500" />,
      onSelect: onBulkTag,
    });
  }

  return [
    ...actions,
    ...buildRenameDeleteMenuActions({
      onRename,
      onDelete,
    }),
  ];
};

/**
 * 追加ボタン（＋）メニューのアクション定義をビルド
 */
export const buildExplorerCreateMenuActions = ({
  canCreateCardSet = false,
  canCreateCard = false,
  canAddDocuments = false,
  canBulkImport = false,
  onCreateRootFolder,
  onCreateCardSet,
  onCreateCard,
  onAddDocument,
  onBulkImport,
}: BuildExplorerCreateMenuActionsParams): MenuAction[] => {
  const actions: MenuAction[] = [
    {
      id: "create-root-folder",
      label: "新規フォルダ",
      icon: <CreateFolderIcon />,
      onSelect: () => {
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