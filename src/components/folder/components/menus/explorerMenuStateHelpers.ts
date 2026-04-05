import type { MutableRefObject } from "react";

interface BeginInlineRenameParams {
  id: string;
  name: string;
  closeMenu?: () => void;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  editingNameRef: MutableRefObject<string>;
  beforeStart?: () => void;
}

export const beginInlineRename = ({
  id,
  name,
  closeMenu,
  setEditingId,
  setEditingName,
  editingNameRef,
  beforeStart,
}: BeginInlineRenameParams) => {
  beforeStart?.();
  closeMenu?.();
  setEditingId(id);
  setEditingName(name);
  editingNameRef.current = name;
};
```

---

## `src/components/folder/components/menus/explorerMenuActionBuilders.tsx`

```tsx
import { FileText, Folder, Pencil, Plus, Tag, Trash2 } from "@/ui/icons";
import type { MutableRefObject } from "react";
import type { MenuAction } from "./menuActions";
import { beginInlineRename } from "./explorerMenuStateHelpers";

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
  editingNameRef: MutableRefObject<string>;
  handleDelete: (
    id: string,
    type: "folder" | "cardSet" | "card" | "document",
  ) => void;
  renameLabel?: string;
  deleteLabel?: string;
}

interface BuildExplorerCreateMenuActionsParams {
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onAddDocument?: () => void | Promise<void>;
  onBulkImport?: () => void | Promise<void>;
}

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
  editingNameRef,
  handleDelete,
  renameLabel = "名前を変更",
  deleteLabel = "削除",
}: BuildEntityRenameDeleteMenuActionsParams): MenuAction[] =>
  buildRenameDeleteMenuActions({
    renameLabel,
    deleteLabel,
    onRename: () => {
      beginInlineRename({
        id,
        name,
        closeMenu,
        setEditingId,
        setEditingName,
        editingNameRef,
        beforeStart: beforeRename,
      });
    },
    onDelete: () => {
      handleDelete(id, type);
    },
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
  canAddDocuments = false,
  canBulkImport = false,
  onCreateRootFolder,
  onCreateCardSet,
  onAddDocument,
  onBulkImport,
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
    actions.push({
      id: "add-document",
      label: "文書追加",
      icon: <FileText className="h-4 w-4" />,
      onSelect: () => {
        void onAddDocument?.();
      },
    });
  }

  if (canBulkImport) {
    actions.push({
      id: "bulk-import",
      label: "一括インポート",
      icon: <FileText className="h-4 w-4" />,
      onSelect: () => {
        void onBulkImport?.();
      },
    });
  }

  return actions;
};