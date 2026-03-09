import { buildVirtualTree, type ViewDef, type ViewKind } from "@/components/folder/types/viewTypes";
import type { useTags } from "@/hooks/settings/useTags";
import type { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import { useCallback, useMemo } from "react";
import React from "react";
import { CardPane } from "@/components/folder/panes/CardPane";
import { FolderDashboard } from "@/components/folder/components/views/FolderDashboard";
import { DirectoryDiagramPane } from "@/components/folder/panes/DirectoryDiagramPane";
import { PdfPane } from "@/components/pdf/PdfPane";
import { PowerPointPane } from "@/components/pptx/PowerPointPane";
import Dashboard from "@/pages/Dashboard";
import Gallery from "@/pages/Gallery";
import Calendar from "@/pages/Calendar";
import Trash from "@/pages/Trash";

const DEFAULT_FOLDER_VIEW: ViewDef = {
  id: "folder-default",
  name: "フォルダ",
  kind: "folder",
};

const createViewId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `view-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

type Settings = ReturnType<typeof useUserSettings>["settings"];
type UpdateSettings = ReturnType<typeof useUserSettings>["updateSettings"];
type TagsApi = ReturnType<typeof useTags>;

interface UseTreeViewViewsParams {
  settings: Settings;
  updateSettings: UpdateSettings;
  tags: TagsApi["tags"];
  listCategoryIdsInUse: TagsApi["listCategoryIdsInUse"];
  getCategoryName: TagsApi["getCategoryName"];
  filteredCards: Card[];
  onFolderSelect: (folderId: string | null) => void;
}

function isViewKind(value: unknown): value is ViewKind {
  return value === "folder" || value === "tagCategory" || value === "tagTree";
}

function isViewDef(value: unknown): value is ViewDef {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    isViewKind(candidate.kind)
  );
}

export function useTreeViewViews({
  settings,
  updateSettings,
  tags,
  listCategoryIdsInUse,
  getCategoryName,
  filteredCards,
  onFolderSelect,
}: UseTreeViewViewsParams) {
  const explorerViews = settings?.explorerViews;
  const selectedExplorerViewId = settings?.selectedExplorerViewId;
  const tagCategoryDisplayNames = settings?.tagCategoryDisplayNames;

  const viewDefs = useMemo(() => {
    const storedViewsRaw: unknown[] = Array.isArray(explorerViews)
      ? explorerViews
      : [];

    const validStoredViews = storedViewsRaw.filter(isViewDef);

    const folderView =
      validStoredViews.find((view) => view.kind === "folder") ??
      DEFAULT_FOLDER_VIEW;

    return [
      folderView,
      ...validStoredViews.filter((view) => view.kind !== "folder"),
    ];
  }, [explorerViews]);

  const selectedViewId = useMemo(() => {
    if (
      selectedExplorerViewId &&
      viewDefs.some((view) => view.id === selectedExplorerViewId)
    ) {
      return selectedExplorerViewId;
    }

    return viewDefs[0]?.id ?? DEFAULT_FOLDER_VIEW.id;
  }, [selectedExplorerViewId, viewDefs]);

  const selectedView = useMemo(
    () =>
      viewDefs.find((view) => view.id === selectedViewId) ??
      DEFAULT_FOLDER_VIEW,
    [selectedViewId, viewDefs],
  );

  const customViews = useMemo(
    () => viewDefs.filter((view) => view.kind !== "folder"),
    [viewDefs],
  );

  const activeCustomView = useMemo(() => {
    if (selectedView.kind !== "folder") return selectedView;
    return customViews[0] ?? null;
  }, [customViews, selectedView]);

  const categoryIdsInUse = useMemo(
    () => listCategoryIdsInUse(),
    [listCategoryIdsInUse],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const categoryId of categoryIdsInUse) {
      map.set(categoryId, getCategoryName(categoryId));
    }

    return map;
  }, [categoryIdsInUse, getCategoryName]);

  const virtualTreeNodes = useMemo(() => {
    if (!activeCustomView) return [];

    return buildVirtualTree(
      activeCustomView,
      filteredCards,
      tags,
      categoryNameById,
    );
  }, [activeCustomView, filteredCards, tags, categoryNameById]);

  const persistSettings = useCallback(
    async (patch: Partial<NonNullable<Settings>>) => {
      await updateSettings(patch);
    },
    [updateSettings],
  );

  const handleViewChange = useCallback(
    async (viewId: string) => {
      await persistSettings({ selectedExplorerViewId: viewId });

      const nextView = viewDefs.find((view) => view.id === viewId);
      if (nextView && nextView.kind !== "folder") {
        onFolderSelect(null);
      }
    },
    [onFolderSelect, persistSettings, viewDefs],
  );

  const handleAddView = useCallback(
    async (kind: ViewKind) => {
      if (kind === "folder") return;

      const nextView: ViewDef = {
        id: createViewId(),
        name: kind === "tagCategory" ? "新しいタグビュー" : "新しいタグツリー",
        kind,
        options:
          kind === "tagCategory"
            ? {
                categoryMode: "user-defined",
                ungroupedLabel: "未分類",
              }
            : {
                scopeMode: "all",
                hideZeroUsage: true,
                ungroupedLabel: "未分類",
              },
      };

      await persistSettings({
        explorerViews: [...viewDefs, nextView],
        selectedExplorerViewId: nextView.id,
      });
    },
    [persistSettings, viewDefs],
  );

  const handleRenameView = useCallback(
    async (viewId: string, name: string) => {
      await persistSettings({
        explorerViews: viewDefs.map((view) =>
          view.id === viewId ? { ...view, name } : view,
        ),
      });
    },
    [persistSettings, viewDefs],
  );

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      const nextViews = viewDefs.filter((view) => view.id !== viewId);

      await persistSettings({
        explorerViews: nextViews,
        selectedExplorerViewId:
          selectedViewId === viewId ? DEFAULT_FOLDER_VIEW.id : selectedViewId,
      });
    },
    [persistSettings, selectedViewId, viewDefs],
  );

  const handleUpdateCategoryName = useCallback(
    async (categoryId: string, displayName: string) => {
      await updateSettings({
        tagCategoryDisplayNames: {
          ...(tagCategoryDisplayNames ?? {}),
          [categoryId]: displayName,
        },
      });
    },
    [tagCategoryDisplayNames, updateSettings],
  );

  const handleUpdateUngroupedLabel = useCallback(
    async (viewId: string, label: string) => {
      await persistSettings({
        explorerViews: viewDefs.map((view) =>
          view.id === viewId
            ? {
                ...view,
                options: {
                  ...(view.options ?? {}),
                  ungroupedLabel: label,
                },
              }
            : view,
        ),
      });
    },
    [persistSettings, viewDefs],
  );

  const handleUpdateViewOptions = useCallback(
    async (viewId: string, options: NonNullable<ViewDef["options"]>) => {
      await persistSettings({
        explorerViews: viewDefs.map((view) =>
          view.id === viewId
            ? {
                ...view,
                options,
              }
            : view,
        ),
      });
    },
    [persistSettings, viewDefs],
  );

  return {
    viewDefs,
    selectedViewId,
    selectedView,
    customViews,
    activeCustomView,
    categoryIdsInUse,
    categoryNameById,
    virtualTreeNodes,
    handleViewChange,
    handleAddView,
    handleRenameView,
    handleDeleteView,
    handleUpdateCategoryName,
    handleUpdateUngroupedLabel,
    handleUpdateViewOptions,
  };
}

interface RightPaneProps {
  selectedItem: SelectedExplorerItem;
  selectedCardId: string | null;
  selectedDocument: DocumentItem | null;
  selectedFolderId: string | null;
  selectedFolderName: string;
  folders: Folder[];
  cards: Card[];
  documents: DocumentItem[];
  folderCards: Card[];
  folderStats: {
    dueCount: number;
    unlearnedCount: number;
    lastReviewedAt: Date | null;
  };
  onCardUpdated: () => void;
  onDocumentUpdated?: (
    documentId: string,
    updates: Partial<DocumentItem>,
  ) => Promise<void> | void;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void> | void;
  handlers: {
    onStartStudy: () => void;
    onViewCards: () => void;
    onCreateCard: () => void;
  };
}

export function RightPane({
  selectedItem,
  selectedCardId,
  selectedDocument,
  selectedFolderId,
  selectedFolderName,
  folders,
  cards,
  documents,
  folderCards,
  onCardUpdated,
  onDocumentUpdated,
  onRenameFolder,
  handlers,
}: RightPaneProps) {
  if (selectedItem?.type === "gallery") {
    return <Gallery />;
  }
  if (selectedItem?.type === "directory") {
    return (
      <DirectoryDiagramPane
        folders={folders}
        cards={cards}
        documents={documents}
      />
    );
  }
  if (selectedItem?.type === "calendar") {
    return <Calendar />;
  }
  if (selectedItem?.type === "settings") {
    return <Dashboard />;
  }
  if (selectedItem?.type === "trash") {
    return <Trash />;
  }

  if (selectedDocument) {
    if (selectedDocument.kind === "pptx") {
      return <PowerPointPane doc={selectedDocument} />;
    }
    return (
      <PdfPane
        doc={selectedDocument}
        onDocumentUpdated={
          onDocumentUpdated
            ? (updates) =>
                onDocumentUpdated(
                  selectedDocument.id,
                  updates as Partial<DocumentItem>,
                )
            : undefined
        }
      />
    );
  }

  if (selectedCardId) {
    return (
      <CardPane selectedCardId={selectedCardId} onCardUpdated={onCardUpdated} />
    );
  }

  if (selectedFolderId) {
    return (
      <div className="h-full min-h-0 flex">
        <div className="min-w-0 flex-1">
          <FolderDashboard
            folderId={selectedFolderId}
            folderName={selectedFolderName}
            cards={folderCards}
            handlers={handlers}
            onRenameFolder={
              onRenameFolder
                ? (newName) => onRenameFolder(selectedFolderId, newName)
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  return <CardPane selectedCardId={null} onCardUpdated={onCardUpdated} />;
}