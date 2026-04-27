import {
  buildExplorerDetailRows,
  type ExplorerDetailRow,
} from "@/components/folder/explorer/model/detailRows";
import { isSameSelectedExplorerItem } from "@/features/explorer/utils/isSameSelectedExplorerItem";
import { useCardCommands } from "@/hooks/card/useCardCommands";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import { useTags } from "@/hooks/settings/useTags";
import {
  UNKNOWN_EXPLORER_DETAIL_SYNC_STATE,
  useExplorerDetailSyncStates,
} from "@/hooks/sync/useExplorerDetailSyncStates";
import type {
  Card,
  CardSet,
  DocumentItem,
  Folder,
  SelectedExplorerItem,
} from "@/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
} from "react";
import {
  buildDetailGridStyle,
  buildDetailTableStyle,
  clampDetailColumnWidth,
  DEFAULT_SORT_STATE,
  DETAIL_DEFAULT_COLUMN_WIDTHS,
  readStoredDetailColumnWidths,
  writeStoredDetailColumnWidths,
  type ExplorerDetailColumnWidths,
} from "./detail-view/folderDetailColumns";
import {
  getDropPositionFromPointer,
  isFolderDescendantOf,
  isSamePayloadAndRow,
  moveIdBeforeOrAfter,
} from "./detail-view/folderDetailDrag";
import {
  buildTagEditorValue,
  formatExplorerTagNames,
  normalizeTagName,
  parseTagEditorValue,
} from "./detail-view/folderDetailTags";
import { FolderDetailHeader } from "./detail-view/FolderDetailHeader";
import { FolderDetailRow } from "./detail-view/FolderDetailRow";
import { getNextSortState, sortRows } from "./detail-view/folderDetailSorting";
import type {
  ExplorerDetailColumnId,
  ExplorerDetailDragPayload,
  ExplorerDetailDropIntent,
  ExplorerDetailDropPosition,
  ExplorerDetailSortKey,
  ExplorerDetailSortState,
  ExplorerDetailTagEditorState,
} from "./detail-view/folderDetailTypes";

interface FolderDetailViewProps {
  folders: Folder[];
  cards: Card[];
  cardSets?: CardSet[];
  documents: DocumentItem[];
  currentFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  currentCardSetId?: string | null;
  onFolderOpen: (folderId: string) => void;
  onCardSetOpen?: (cardSetId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onMoveFolder?: (
    folderId: string,
    targetParentFolderId: string | null,
  ) => Promise<void>;
  onReorderFolders?: (
    targetParentFolderId: string | null,
    folderIds: string[],
  ) => Promise<void>;
  onMoveCardSetToFolder?: (
    cardSetId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderCardSets?: (
    targetFolderId: string,
    cardSetIds: string[],
  ) => Promise<void>;
  onMoveDocumentToFolder?: (
    documentId: string,
    targetFolderId: string,
  ) => Promise<void>;
  onReorderDocuments?: (
    targetFolderId: string,
    documentIds: string[],
  ) => Promise<void>;
  onMoveCardToSet?: (cardId: string, targetCardSetId: string) => Promise<void>;
  onReorderCardsInCardSet?: (
    cardSetId: string,
    cardIds: string[],
  ) => Promise<void>;
}

export const FolderDetailView = ({
  folders,
  cards,
  cardSets = [],
  documents,
  currentFolderId,
  selectedItem,
  currentCardSetId = null,
  onFolderOpen,
  onCardSetOpen,
  onItemSelect,
  onMoveFolder,
  onReorderFolders,
  onMoveCardSetToFolder,
  onReorderCardSets,
  onMoveDocumentToFolder,
  onReorderDocuments,
  onMoveCardToSet,
  onReorderCardsInCardSet,
}: FolderDetailViewProps) => {
  const dragPayloadRef = useRef<ExplorerDetailDragPayload | null>(null);
  const [columnWidths, setColumnWidths] = useState<ExplorerDetailColumnWidths>(
    readStoredDetailColumnWidths,
  );
  const [sortState, setSortState] =
    useState<ExplorerDetailSortState>(DEFAULT_SORT_STATE);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIntent, setDropIntent] = useState<ExplorerDetailDropIntent | null>(
    null,
  );
  const [tagEditor, setTagEditor] =
    useState<ExplorerDetailTagEditorState | null>(null);
  const tagEditorSkipNextBlurRef = useRef(false);
  const { tags, tagById, addTag } = useTags();
  const { updateCard } = useCardCommands();
  const { updateDocument } = useDocumentCommands();
  const { updateFolder } = useFolderCommands();
  const { updateCardSet } = useCardSets();
  const setExplorerLayoutMode = useExplorerStore(
    (state) => state.setExplorerLayoutMode,
  );

  useEffect(() => {
    writeStoredDetailColumnWidths(columnWidths);
  }, [columnWidths]);

  const detailGridStyle = useMemo(
    () => buildDetailGridStyle(columnWidths),
    [columnWidths],
  );

  const detailTableStyle = useMemo(
    () => buildDetailTableStyle(columnWidths),
    [columnWidths],
  );

  const handleResizePointerDown = useCallback(
    (
      columnId: ExplorerDetailColumnId,
      event: ReactPointerEvent<HTMLSpanElement>,
    ) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = columnWidths[columnId];
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const deltaX = pointerEvent.clientX - startX;
        const nextWidth = clampDetailColumnWidth(columnId, startWidth + deltaX);
        setColumnWidths((current) => ({
          ...current,
          [columnId]: nextWidth,
        }));
      };

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [columnWidths],
  );

  const handleResetColumnWidth = useCallback(
    (columnId: ExplorerDetailColumnId) => {
      setColumnWidths((current) => ({
        ...current,
        [columnId]: DETAIL_DEFAULT_COLUMN_WIDTHS[columnId],
      }));
    },
    [],
  );

  const manualRows = useMemo(
    () =>
      buildExplorerDetailRows({
        folders,
        cards,
        cardSets,
        documents,
        currentFolderId,
        currentCardSetId,
      }),
    [cards, cardSets, currentCardSetId, currentFolderId, documents, folders],
  );

  const rows = useMemo(
    () => sortRows(manualRows, sortState),
    [manualRows, sortState],
  );
  const syncStateByRowKey = useExplorerDetailSyncStates(rows);

  const isManualOrder = sortState.key === "manual";

  const resolveRowTagNames = useCallback(
    (row: ExplorerDetailRow): string[] => {
      if (row.kind !== "card") {
        return row.tags;
      }

      return row.tags.map((tagId) => tagById.get(tagId)?.name ?? tagId);
    },
    [tagById],
  );

  const resolveTagIds = useCallback(
    async (tagNames: string[]): Promise<string[]> => {
      const tagIds: string[] = [];

      for (const tagName of tagNames) {
        const normalizedName = normalizeTagName(tagName);
        if (!normalizedName) continue;

        const existingTag = tags.find(
          (tag) =>
            tag.name === normalizedName ||
            tag.nameLower === normalizedName.toLowerCase(),
        );
        const tag = existingTag ?? (await addTag(normalizedName));

        if (!tagIds.includes(tag.id)) {
          tagIds.push(tag.id);
        }
      }

      return tagIds;
    },
    [addTag, tags],
  );

  const saveTagEditor = useCallback(async () => {
    const editor = tagEditor;
    if (!editor || editor.isSaving) return;

    const tagNames = parseTagEditorValue(editor.value);

    setTagEditor((current) =>
      current?.rowKey === editor.rowKey
        ? { ...current, isSaving: true, error: null }
        : current,
    );

    try {
      const tagIds = await resolveTagIds(tagNames);

      if (editor.rowKind === "card") {
        await updateCard(editor.rowId, { tagIds });
      } else if (editor.rowKind === "document") {
        await updateDocument(editor.rowId, { tags: tagNames });
      } else if (editor.rowKind === "folder") {
        await updateFolder(editor.rowId, {
          tags: tagNames,
        } as unknown as Partial<Folder>);
      } else {
        await updateCardSet(editor.rowId, {
          tags: tagNames,
        } as unknown as Parameters<typeof updateCardSet>[1]);
      }

      setTagEditor((current) =>
        current?.rowKey === editor.rowKey ? null : current,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "タグを保存できませんでした。";
      setTagEditor((current) =>
        current?.rowKey === editor.rowKey
          ? { ...current, isSaving: false, error: message }
          : current,
      );
    }
  }, [
    resolveTagIds,
    tagEditor,
    updateCard,
    updateCardSet,
    updateDocument,
    updateFolder,
  ]);

  const cancelTagEditor = useCallback(() => {
    tagEditorSkipNextBlurRef.current = true;
    setTagEditor(null);
  }, []);

  const openTagEditor = useCallback(
    (row: ExplorerDetailRow) => {
      setExplorerLayoutMode("detail");
      setTagEditor({
        rowKey: row.key,
        rowKind: row.kind,
        rowId: row.id,
        value: buildTagEditorValue(resolveRowTagNames(row)),
        error: null,
        isSaving: false,
      });
      setDropIntent(null);
      setDraggingKey(null);
      dragPayloadRef.current = null;
    },
    [resolveRowTagNames, setExplorerLayoutMode],
  );

  const handleTagEditorValueChange = useCallback((value: string) => {
    setTagEditor((current) => (current ? { ...current, value } : current));
  }, []);

  const handleTagEditorBlur = useCallback(() => {
    if (tagEditorSkipNextBlurRef.current) {
      tagEditorSkipNextBlurRef.current = false;
      return;
    }

    void saveTagEditor();
  }, [saveTagEditor]);

  const handleTagEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();

      if (event.key === "Enter") {
        event.preventDefault();
        void saveTagEditor();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelTagEditor();
      }
    },
    [cancelTagEditor, saveTagEditor],
  );

  const handleSort = useCallback(
    (key: Exclude<ExplorerDetailSortKey, "manual">) => {
      setSortState((current) => getNextSortState(current, key));
      setDropIntent(null);
      setDraggingKey(null);
      dragPayloadRef.current = null;
    },
    [],
  );

  const handleActivateRow = useCallback(
    (row: ExplorerDetailRow) => {
      if (row.openFolderId) {
        onFolderOpen(row.openFolderId);
        return;
      }

      if (row.openCardSetId) {
        onCardSetOpen?.(row.openCardSetId);
        setDropIntent(null);
        setDraggingKey(null);
        dragPayloadRef.current = null;
        return;
      }

      if (row.selectTarget) {
        onItemSelect(row.selectTarget);
      }
    },
    [onCardSetOpen, onFolderOpen, onItemSelect],
  );

  const clearDragState = useCallback(() => {
    dragPayloadRef.current = null;
    setDraggingKey(null);
    setDropIntent(null);
  }, []);

  const reorderRows = useCallback(
    (
      payload: ExplorerDetailDragPayload,
      targetRow: ExplorerDetailRow,
      position: "before" | "after",
    ) => {
      if (payload.kind !== targetRow.kind) return;

      const scopedRows = manualRows.filter((row) => row.kind === payload.kind);
      const orderedIds = moveIdBeforeOrAfter(
        scopedRows.map((row) => row.id),
        payload.id,
        targetRow.id,
        position,
      );

      setSortState(DEFAULT_SORT_STATE);

      if (payload.kind === "folder") {
        void onReorderFolders?.(currentFolderId, orderedIds);
        return;
      }

      if (payload.kind === "card") {
        if (!currentCardSetId) return;
        void onReorderCardsInCardSet?.(currentCardSetId, orderedIds);
        return;
      }

      if (!currentFolderId) return;

      if (payload.kind === "cardSet") {
        void onReorderCardSets?.(currentFolderId, orderedIds);
        return;
      }

      void onReorderDocuments?.(currentFolderId, orderedIds);
    },
    [
      currentFolderId,
      manualRows,
      onReorderCardSets,
      onReorderCardsInCardSet,
      onReorderDocuments,
      onReorderFolders,
      currentCardSetId,
    ],
  );

  const movePayloadIntoFolder = useCallback(
    (payload: ExplorerDetailDragPayload, targetFolderId: string | null) => {
      if (
        payload.kind === "folder" &&
        targetFolderId &&
        (payload.id === targetFolderId ||
          isFolderDescendantOf(folders, targetFolderId, payload.id))
      ) {
        return;
      }

      setSortState(DEFAULT_SORT_STATE);

      if (payload.kind === "folder") {
        void onMoveFolder?.(payload.id, targetFolderId);
        return;
      }

      if (!targetFolderId) return;

      if (payload.kind === "cardSet") {
        void onMoveCardSetToFolder?.(payload.id, targetFolderId);
        return;
      }

      if (payload.kind === "document") {
        void onMoveDocumentToFolder?.(payload.id, targetFolderId);
      }
    },
    [folders, onMoveCardSetToFolder, onMoveDocumentToFolder, onMoveFolder],
  );

  const movePayloadIntoCardSet = useCallback(
    (payload: ExplorerDetailDragPayload, targetCardSetId: string) => {
      if (payload.kind !== "card") return;

      setSortState(DEFAULT_SORT_STATE);
      void onMoveCardToSet?.(payload.id, targetCardSetId);
    },
    [onMoveCardToSet],
  );

  const handleDropOnRow = useCallback(
    (row: ExplorerDetailRow, position: ExplorerDetailDropPosition) => {
      const payload = dragPayloadRef.current;
      if (!payload) return;

      if (position === "inside" && row.kind === "folder") {
        movePayloadIntoFolder(payload, row.id);
        return;
      }

      if (position === "inside" && row.kind === "cardSet") {
        movePayloadIntoCardSet(payload, row.id);
        return;
      }

      if (position === "before" || position === "after") {
        reorderRows(payload, row, position);
      }
    },
    [movePayloadIntoCardSet, movePayloadIntoFolder, reorderRows],
  );

  const handleDropOnPane = useCallback(() => {
    const payload = dragPayloadRef.current;
    if (!payload || dropIntent?.position !== "append") return;

    if (currentCardSetId && payload.kind === "card") {
      movePayloadIntoCardSet(payload, currentCardSetId);
      return;
    }

    movePayloadIntoFolder(payload, currentFolderId);
  }, [
    currentFolderId,
    dropIntent?.position,
    movePayloadIntoCardSet,
    movePayloadIntoFolder,
    currentCardSetId,
  ]);

  return (
    <div
      className="h-full min-h-0 w-full overflow-auto bg-[rgba(255,255,255,0.96)]"
      onDragOver={(event) => {
        if (!isManualOrder || !dragPayloadRef.current) return;

        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest("[role='row'][data-detail-row='true']")) return;

        event.preventDefault();
        setDropIntent({ rowKey: "__pane__", position: "append" });
      }}
      onDrop={(event) => {
        if (!isManualOrder || !dragPayloadRef.current) return;

        event.preventDefault();
        handleDropOnPane();
        clearDragState();
      }}
    >
      <div
        role="table"
        aria-label="エクスプローラー詳細表示"
        aria-rowcount={rows.length + 1}
        className="text-[13px]"
        style={detailTableStyle}
      >
        <FolderDetailHeader
          gridStyle={detailGridStyle}
          sortState={sortState}
          onSort={handleSort}
          onResizePointerDown={handleResizePointerDown}
          onResetWidth={handleResetColumnWidth}
        />

        {rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-[12px] text-[#8f8d86]">
            この場所には表示できる項目がありません。
          </div>
        ) : (
          rows.map((row) => {
            const selected =
              row.selectTarget !== null &&
              isSameSelectedExplorerItem(selectedItem, row.selectTarget);
            const dragging = draggingKey === row.key;
            const currentDropPosition =
              dropIntent?.rowKey === row.key ? dropIntent.position : null;

            return (
              <FolderDetailRow
                key={row.key}
                row={row}
                syncState={
                  syncStateByRowKey.get(row.key) ??
                  UNKNOWN_EXPLORER_DETAIL_SYNC_STATE
                }
                selected={selected}
                dragging={dragging}
                draggable={isManualOrder}
                dropPosition={currentDropPosition}
                gridStyle={detailGridStyle}
                tagDisplayText={formatExplorerTagNames(resolveRowTagNames(row))}
                tagEditState={tagEditor}
                onTagCellContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openTagEditor(row);
                }}
                onTagEditChange={handleTagEditorValueChange}
                onTagEditKeyDown={handleTagEditorKeyDown}
                onTagEditBlur={handleTagEditorBlur}
                onActivate={() => handleActivateRow(row)}
                onDragStart={(event) => {
                  if (!isManualOrder) {
                    event.preventDefault();
                    return;
                  }

                  dragPayloadRef.current = { kind: row.kind, id: row.id };
                  setDraggingKey(row.key);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(
                    "application/x-manifolia-explorer-detail-row",
                    row.key,
                  );
                }}
                onDragEnd={() => {
                  clearDragState();
                }}
                onDragOver={(event) => {
                  const payload = dragPayloadRef.current;
                  if (
                    !isManualOrder ||
                    !payload ||
                    isSamePayloadAndRow(payload, row)
                  ) {
                    return;
                  }

                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";

                  const position = getDropPositionFromPointer(row, event);
                  setDropIntent({ rowKey: row.key, position });
                }}
                onDragLeave={(event) => {
                  const relatedTarget = event.relatedTarget;
                  if (
                    relatedTarget instanceof Node &&
                    event.currentTarget.contains(relatedTarget)
                  ) {
                    return;
                  }

                  setDropIntent((current) =>
                    current?.rowKey === row.key ? null : current,
                  );
                }}
                onDrop={(event) => {
                  if (!isManualOrder || !dragPayloadRef.current) return;

                  event.preventDefault();
                  const position = getDropPositionFromPointer(row, event);
                  handleDropOnRow(row, position);
                  clearDragState();
                }}
              />
            );
          })
        )}
      </div>

      {dropIntent?.position === "append" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 mx-3 mb-2 h-8 rounded-[8px] border border-dashed border-[#bdb9ae] bg-[#f5f3ee]/80"
        />
      ) : null}
    </div>
  );
};
