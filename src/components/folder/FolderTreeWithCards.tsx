import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Folder } from 'lucide-react';
// DnD types and components
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import type { Card, DocumentItem, ExplorerItem, SelectedExplorerItem } from '@/types';
import DeleteFolderDialog from './DeleteFolderDialog';
import { useFolderDnD, DnDHelpers } from '@/hooks/useFolderDnD';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getLocalDb } from '@/services/localDB';
import { saveDocumentBlob } from '@/services/documentFileStore';
import { getOrCreateDeviceId } from '@/utils/device';
import {
  type FolderTreeNode,
  ROOT_FOLDER_ID,
  DEFAULT_NEW_FOLDER_NAME,
  DEFAULT_NEW_CARD_NAME,
  getFolderId,
  getParentFolderId,
  normalizeFolderId,
  isSameFolder,
  getEntityTime,
  createOptimisticId,
  createDocumentId,
  buildStoragePath,
  isTextInputTarget,
  hasOpenModalDialog,
  isFileDragEvent,
  extractPdfFiles,
  extractPptxFiles,
  PPTX_MIME,
} from './explorer/model/utils';
import { DocumentRow } from './explorer/rows/DocumentRow';
import { CardRow } from './explorer/rows/CardRow';
import { FolderRow } from './explorer/rows/FolderRow';

const isSoftDeleted = (entity?: { isDeleted?: boolean; is_deleted?: boolean } | null) =>
  Boolean(entity?.isDeleted ?? entity?.is_deleted);

interface FolderTreeWithCardsProps {
  folders: FolderTreeNode[];
  cards: Card[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCreateFolder?: (name: string, parentId?: string) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: unknown) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onCreateCard?: (data: unknown) => Promise<any>;
  onUpdateCard?: (cardId: string, data: unknown) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  moveCardToFolder?: (cardId: string, targetFolderId: string) => Promise<void>;
  reorderCards?: (folderId: string, cardIds: string[]) => Promise<void>;
  pinnedItems?: Array<{ type: 'folder' | 'card' | 'document'; id: string }>;
  onPinItem?: (item: { type: 'folder' | 'card' | 'document'; id: string }) => void;
  onUnpinItem?: (item: { type: 'folder' | 'card' | 'document'; id: string }) => void;
  isFiltering?: boolean;

  /** サイドバー外側のclass（任意） */
  className?: string;
}

export function FolderTreeWithCards({
  folders,
  cards,
  documents,
  selectedFolderId,
  selectedItem,
  onFolderSelect,
  onItemSelect,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  moveCardToFolder,
  reorderCards,
  pinnedItems,
  onPinItem,
  onUnpinItem,
  isFiltering = false,
  className,
}: FolderTreeWithCardsProps) {
  // フォルダ・カード共通の行スタイル（高さ・padding・背景の描画範囲を完全統一）
  // overflow-hidden を入れて「選択背景が行の縦幅を超えて見える」問題を確実に切る
  const ROW_BASE =
    'group flex items-center h-8 min-h-0 box-border pr-2 py-0 relative w-full text-left rounded-md overflow-hidden transition-colors';

  const { currentUser } = useAuth();
  const { uploadFile } = useReliableFileUpload();
  const { error: toastError } = useToast();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('folder_expandedFolders');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const [optimisticFolders, setOptimisticFolders] = useState<FolderTreeNode[]>([]);
  const [optimisticCards, setOptimisticCards] = useState<Card[]>([]);

  useEffect(() => {
    localStorage.setItem('folder_expandedFolders', JSON.stringify(Array.from(expandedFolders)));
  }, [expandedFolders]);

  const treeFolders = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();
    for (const folder of folders) {
      const folderId = getFolderId(folder);
      if (!folderId) continue;
      map.set(folderId, folder);
    }
    for (const folder of optimisticFolders) {
      const id = getFolderId(folder);
      if (!id) continue;
      if (!map.has(id)) map.set(id, folder);
    }
    return Array.from(map.values());
  }, [folders, optimisticFolders]);

  const treeCards = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    for (const card of optimisticCards) {
      if (!map.has(card.id)) map.set(card.id, card);
    }
    return Array.from(map.values());
  }, [cards, optimisticCards]);

  // selectedFolderId が変更されたときに、そのフォルダとその親フォルダすべてを自動展開
  useEffect(() => {
    if (!selectedFolderId) return;

    // 親フォルダのパスを取得
    const getAncestorFolderIds = (folderId: string): string[] => {
      const ancestors: string[] = [];
      let currentId: string | null = folderId;

      while (currentId) {
        ancestors.push(currentId);
        const folder = treeFolders.find((f) => getFolderId(f) === currentId);
        if (!folder) break;
        currentId = normalizeFolderId(getParentFolderId(folder));
      }

      return ancestors;
    };

    const ancestorIds = getAncestorFolderIds(selectedFolderId);

    setExpandedFolders((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const id of ancestorIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [selectedFolderId, treeFolders]);

  // カードが選択されたときも、そのカードが属するフォルダを自動展開
  useEffect(() => {
    if (!selectedItem || selectedItem.type !== 'card') return;

    const card = treeCards.find((c) => c.id === selectedItem.id);
    if (!card || !card.folderId) return;

    // 親フォルダのパスを取得
    const getAncestorFolderIds = (folderId: string): string[] => {
      const ancestors: string[] = [];
      let currentId: string | null = folderId;

      while (currentId) {
        ancestors.push(currentId);
        const folder = treeFolders.find((f) => getFolderId(f) === currentId);
        if (!folder) break;
        currentId = normalizeFolderId(getParentFolderId(folder));
      }

      return ancestors;
    };

    const ancestorIds = getAncestorFolderIds(card.folderId);

    setExpandedFolders((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const id of ancestorIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [selectedItem, treeCards, treeFolders]);

  const [newlyCreatedCardId, setNewlyCreatedCardId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  // 別のカードを選択したら新規フラグを解除（ただし、新規作成直後の自動選択による遷移は除く）
  useEffect(() => {
    if (selectedItem?.type === 'card' && selectedItem.id && newlyCreatedCardId) {
      if (selectedItem.id !== newlyCreatedCardId) {
        setNewlyCreatedCardId(null);
      }
    }
  }, [selectedItem, newlyCreatedCardId]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [fileDragFolderId, setFileDragFolderId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [deleteTargetFolderId, setDeleteTargetFolderId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const treeRootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetFolderIdRef = useRef<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const editingNameRef = useRef('');
  const optimisticFolderNameRef = useRef<Map<string, string>>(new Map());
  const optimisticCardNameRef = useRef<Map<string, string>>(new Map());
  const renameCancelledRef = useRef(false);
  const inFlightRef = useRef(false);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const cardsForDnD = useMemo(
    () => treeCards.filter((card) => !(card as any).__optimistic),
    [treeCards]
  );

  const { onDragEnd } = useFolderDnD({
    cards: cardsForDnD,
    moveCardToFolder: moveCardToFolder || (async () => {}),
    reorderCards: reorderCards || (async () => {}),
  });

  // トグル用: DnD 中は hover 表示を抑止するためのフラグ
  const [isDragging, setIsDragging] = useState(false);
  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = (result: Parameters<typeof onDragEnd>[0]) => {
    setIsDragging(false);
    void onDragEnd(result);
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  useEffect(() => {
    editingNameRef.current = editingName;
  }, [editingName]);

  useEffect(() => {
    if (!pendingScrollId) return;
    const row = rowRefs.current.get(pendingScrollId);
    if (!row) return;
    const rafId = window.requestAnimationFrame(() => {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setPendingScrollId(null);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [pendingScrollId, treeFolders, treeCards, expandedFolders]);

  const setRowRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) rowRefs.current.set(id, node);
    else rowRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const childFoldersByParentId = useMemo(() => {
    const map = new Map<string, FolderTreeNode[]>();
    for (const folder of treeFolders) {
      const isHidden = folder.isHidden ?? folder.is_hidden;
      if (isSoftDeleted(folder) || isHidden) continue;

      const parentId = normalizeFolderId(getParentFolderId(folder));
      const siblings = map.get(parentId);
      if (siblings) siblings.push(folder);
      else map.set(parentId, [folder]);
    }

    for (const siblings of map.values()) {
      siblings.sort((a, b) => {
        const orderA = (a.orderIndex ?? a.order_index ?? 0) as number;
        const orderB = (b.orderIndex ?? b.order_index ?? 0) as number;
        return orderA - orderB;
      });
    }
    return map;
  }, [treeFolders]);

  const rootFolders = useMemo(
    () => childFoldersByParentId.get(ROOT_FOLDER_ID) ?? [],
    [childFoldersByParentId]
  );

  const getChildFolders = useCallback(
    (parentId: string) => childFoldersByParentId.get(parentId) ?? [],
    [childFoldersByParentId]
  );

  const visibleFolderIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const folder of treeFolders) {
      const isHidden = folder.isHidden ?? folder.is_hidden;
      if (isSoftDeleted(folder) || isHidden) continue;
      const id = getFolderId(folder);
      if (id) set.add(id);
    }
    return set;
  }, [treeFolders]);

  const resolveTreeFolderId = useCallback(
    (folderId: string | null | undefined) => {
      const normalized = normalizeFolderId(folderId);
      if (normalized === ROOT_FOLDER_ID) return ROOT_FOLDER_ID;
      return visibleFolderIdSet.has(normalized) ? normalized : ROOT_FOLDER_ID;
    },
    [visibleFolderIdSet]
  );

  // カード/ドキュメントは「実在するフォルダに紐づくもののみ表示」する。
  const hasValidFolderBinding = useCallback(
    (folderId: string | null | undefined) => {
      const normalized = normalizeFolderId(folderId);
      if (normalized === ROOT_FOLDER_ID) return false;
      return visibleFolderIdSet.has(normalized);
    },
    [visibleFolderIdSet]
  );

  const directCardCountByFolderId = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of treeCards) {
      if (isSoftDeleted(card as any)) continue;
      if (!hasValidFolderBinding(card.folderId ?? (card as any).folder_id)) continue;
      const folderId = resolveTreeFolderId(card.folderId ?? (card as any).folder_id);
      map.set(folderId, (map.get(folderId) ?? 0) + 1);
    }
    return map;
  }, [treeCards, resolveTreeFolderId, hasValidFolderBinding]);

  const deleteTargetFolder = useMemo(() => {
    if (!deleteTargetFolderId) return null;
    return treeFolders.find((folder) => getFolderId(folder) === deleteTargetFolderId) ?? null;
  }, [deleteTargetFolderId, treeFolders]);

  const deleteTargetCounts = useMemo(() => {
    if (!deleteTargetFolderId) return { cardCount: 0, subfolderCount: 0 };

    let cardCount = 0;
    let subfolderCount = 0;
    const stack = [deleteTargetFolderId];

    while (stack.length > 0) {
      const folderId = stack.pop()!;
      cardCount += directCardCountByFolderId.get(folderId) ?? 0;

      const children = childFoldersByParentId.get(folderId) ?? [];
      subfolderCount += children.length;
      for (const child of children) {
        stack.push(getFolderId(child));
      }
    }

    return { cardCount, subfolderCount };
  }, [deleteTargetFolderId, directCardCountByFolderId, childFoldersByParentId]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<string, ExplorerItem[]>();
    const pushItem = (folderId: string | null | undefined, item: ExplorerItem) => {
      const key = normalizeFolderId(folderId);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    };

    for (const card of treeCards) {
      if (isSoftDeleted(card as any)) continue;
      if (!hasValidFolderBinding(card.folderId ?? (card as any).folder_id)) continue;
      pushItem(resolveTreeFolderId(card.folderId ?? (card as any).folder_id), { type: 'card', data: card });
    }
    for (const doc of documents) {
      if (isSoftDeleted(doc as any)) continue;
      if (!hasValidFolderBinding(doc.folderId ?? (doc as any).folder_id)) continue;
      pushItem(resolveTreeFolderId(doc.folderId ?? (doc as any).folder_id), { type: 'document', data: doc });
    }

    for (const list of map.values()) {
      list.sort((a, b) => {
        const orderA = a.data.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.data.orderIndex ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;

        // タイブレーク: updatedAt (新しい順)
        const timeA = getEntityTime(a.data.updatedAt);
        const timeB = getEntityTime(b.data.updatedAt);
        return timeB - timeA;
      });
    }
    return map;
  }, [treeCards, documents, resolveTreeFolderId, hasValidFolderBinding]);

  const getFolderItems = useCallback(
    (folderId: string | null): ExplorerItem[] =>
      itemsByFolderId.get(normalizeFolderId(folderId)) ?? [],
    [itemsByFolderId]
  );

  const rootItems = useMemo(() => getFolderItems(null), [getFolderItems]);

  const selectedFolderName = useMemo(() => {
    if (!selectedFolderId) return 'ルート';
    const folder = treeFolders.find((f) => getFolderId(f) === selectedFolderId);
    return folder?.folderName ?? folder?.folder_name ?? 'ルート';
  }, [selectedFolderId, treeFolders]);

  // Memoize match counts for filtering to avoid expensive recursive recalculation
  const matchCountMap = useMemo(() => {
    if (!isFiltering) return new Map<string, number>();

    const map = new Map<string, number>();
    const calcMatchCount = (folderId: string): number => {
      if (map.has(folderId)) return map.get(folderId)!;
      const directCount = getFolderItems(folderId).length;
      const children = getChildFolders(folderId);
      const childCount = children.reduce(
        (acc, child) => acc + calcMatchCount(getFolderId(child)),
        0
      );
      const total = directCount + childCount;
      map.set(folderId, total);
      return total;
    };

    for (const folder of treeFolders) {
      const folderId = getFolderId(folder);
      if (!map.has(folderId)) calcMatchCount(folderId);
    }
    return map;
  }, [isFiltering, treeFolders, getFolderItems, getChildFolders]);

  const getNextOrderIndex = useCallback(
    (folderId: string | null) => {
      const targetFolderId = resolveTreeFolderId(folderId);
      let maxOrder = -1;
      for (const card of treeCards) {
        if (isSoftDeleted(card as any)) continue;
        const cardFolderId = resolveTreeFolderId(card.folderId ?? (card as any).folder_id);
        if (!isSameFolder(cardFolderId, targetFolderId)) continue;
        const order = card.orderIndex ?? -1;
        if (order > maxOrder) maxOrder = order;
      }
      for (const doc of documents) {
        if (isSoftDeleted(doc as any)) continue;
        const docFolderId = resolveTreeFolderId(doc.folderId ?? (doc as any).folder_id);
        if (!isSameFolder(docFolderId, targetFolderId)) continue;
        const order = doc.orderIndex ?? -1;
        if (order > maxOrder) maxOrder = order;
      }
      return maxOrder + 1;
    },
    [treeCards, documents, resolveTreeFolderId]
  );

  const handlePdfDropped = useCallback(
    async (folderId: string, files: File[]) => {
      if (!files.length) return;
      if (!currentUser) {
        toastError?.('PDFの追加にはログインが必要です');
        return;
      }

      const pdfFiles = files.filter((file) => {
        const name = file.name?.toLowerCase() ?? '';
        return file.type === 'application/pdf' || name.endsWith('.pdf');
      });

      if (pdfFiles.length === 0) return;

      const db = await getLocalDb(currentUser.uid);
      let nextOrderIndex = getNextOrderIndex(folderId);

      for (const file of pdfFiles) {
        const now = new Date();
        const docId = createDocumentId();
        const storagePath = buildStoragePath(currentUser.uid, docId, 'pdf');
        const mimeType = file.type || 'application/pdf';
        const baseDoc: DocumentItem = {
          id: docId,
          userId: currentUser.uid,
          deviceId: getOrCreateDeviceId(),
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
          kind: 'pdf',
          folderId,
          orderIndex: nextOrderIndex,
          title: file.name,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          blobUrl: null,
          localUrl: null,
          localFileId: docId,
          remoteUrl: null,
          storagePath,
          downloadUrl: null,
          uploadStatus: 'pending',
        };

        try {
          await saveDocumentBlob(docId, file, { userId: currentUser.uid });
          await db.documents.put(baseDoc as any);
          nextOrderIndex += 1;
        } catch (localErr: unknown) {
          console.error('[FolderTreeWithCards] Failed to prepare local PDF source', {
            error: localErr,
            docId,
            fileName: file.name,
          });
          toastError?.(localErr?.message || 'PDFのローカル保存に失敗しました');
          continue;
        }

        try {
          const result = await uploadFile(file, () => storagePath, { type: 'pdf', folderId, docId });

          const remoteDownloadUrl = result.metadata?.downloadUrl ?? null;
          await db.updateItem('documents', docId, {
            storagePath: result.storagePath || storagePath,
            remoteUrl: remoteDownloadUrl,
            downloadUrl: remoteDownloadUrl,
            uploadStatus: remoteDownloadUrl ? 'ready' : 'queued',
            updatedAt: new Date(),
          });
          if (!remoteDownloadUrl) {
            const latestDoc = await db.documents.get(docId);
            console.info('[FolderTreeWithCards] PDF upload queued in local-only mode', {
              docId,
              uploadSource: result.source,
              uploadStatus: latestDoc?.uploadStatus ?? null,
              localFileId: latestDoc?.localFileId ?? null,
              blobUrl: (latestDoc as any)?.blobUrl ?? latestDoc?.localUrl ?? null,
            });
          }
        } catch (err: unknown) {
          console.error('[FolderTreeWithCards] PDF upload failed', err);
          try {
            await db.updateItem('documents', docId, {
              uploadStatus: 'failed',
              updatedAt: new Date(),
            });
            const failedDoc = await db.documents.get(docId);
            console.error('[FolderTreeWithCards] PDF upload failed but local source kept', {
              docId,
              localFileId: failedDoc?.localFileId ?? null,
              blobUrl: (failedDoc as any)?.blobUrl ?? failedDoc?.localUrl ?? null,
            });
          } catch (markErr) {
            console.error('[FolderTreeWithCards] Failed to mark PDF upload failure', markErr);
          }
          toastError?.(err?.message || 'PDFの追加に失敗しました');
        }
      }

      if (pdfFiles.length > 0) {
        setExpandedFolders((prev) => new Set(prev).add(folderId));
      }
    },
    [currentUser, getNextOrderIndex, toastError, uploadFile]
  );

  const handlePptxDropped = useCallback(
    async (folderId: string, files: File[]) => {
      if (!files.length) return;
      if (!currentUser) {
        toastError?.('PPTXの追加にはログインが必要です');
        return;
      }

      const pptxFiles = files.filter((file) => {
        const name = file.name?.toLowerCase() ?? '';
        return file.type === PPTX_MIME || name.endsWith('.pptx');
      });

      if (pptxFiles.length === 0) return;

      const db = await getLocalDb(currentUser.uid);
      let nextOrderIndex = getNextOrderIndex(folderId);

      for (const file of pptxFiles) {
        const now = new Date();
        const docId = createDocumentId();
        const storagePath = buildStoragePath(currentUser.uid, docId, 'pptx');
        const mimeType = file.type || PPTX_MIME;
        const baseDoc: DocumentItem = {
          id: docId,
          userId: currentUser.uid,
          deviceId: getOrCreateDeviceId(),
          createdAt: now,
          updatedAt: now,
          isDeleted: false,
          kind: 'pptx',
          convertStatus: 'processing',
          pptxManifestStatus: 'none',
          pptxManifestPath: null,
          pptxSlideCount: null,
          pptxLastError: null,
          pptxConvertRequestedAt: null,
          pptxConvertedAt: null,
          pptx: {
            manifestPath: null,
            fallbackPdfPath: null,
            slideCount: null,
            updatedAt: now,
            error: null,
          },
          folderId,
          orderIndex: nextOrderIndex,
          title: file.name,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          blobUrl: null,
          localUrl: null,
          localFileId: docId,
          remoteUrl: null,
          storagePath,
          downloadUrl: null,
          uploadStatus: 'pending',
        };

        try {
          await saveDocumentBlob(docId, file, { userId: currentUser.uid });
          await db.documents.put(baseDoc as any);
          nextOrderIndex += 1;
        } catch (localErr: unknown) {
          console.error('[FolderTreeWithCards] Failed to prepare local PPTX source', {
            error: localErr,
            docId,
            fileName: file.name,
          });
          toastError?.(localErr?.message || 'PPTXのローカル保存に失敗しました');
          continue;
        }

        try {
          const result = await uploadFile(file, () => storagePath, { type: 'pptx', folderId, docId });

          const remoteDownloadUrl = result.metadata?.downloadUrl ?? null;
          await db.updateItem('documents', docId, {
            storagePath: result.storagePath || storagePath,
            remoteUrl: remoteDownloadUrl,
            downloadUrl: remoteDownloadUrl,
            uploadStatus: remoteDownloadUrl ? 'ready' : 'queued',
            updatedAt: new Date(),
          });

          if (!remoteDownloadUrl) {
            const latestDoc = await db.documents.get(docId);
            console.info('[FolderTreeWithCards] PPTX upload queued in local-only mode', {
              docId,
              uploadSource: result.source,
              uploadStatus: latestDoc?.uploadStatus ?? null,
              localFileId: latestDoc?.localFileId ?? null,
              blobUrl: (latestDoc as any)?.blobUrl ?? latestDoc?.localUrl ?? null,
            });
          }
        } catch (err: unknown) {
          console.error('[FolderTreeWithCards] PPTX upload failed', err);
          try {
            const failedAt = new Date();
            await db.updateItem('documents', docId, {
              uploadStatus: 'failed',
              convertStatus: 'failed',
              pptxManifestStatus: 'failed',
              pptxLastError: err?.message || 'upload_failed',
              pptx: {
                ...(baseDoc.pptx ?? {}),
                error: err?.message || 'upload_failed',
                updatedAt: failedAt,
              },
              updatedAt: failedAt,
            });
            const failedDoc = await db.documents.get(docId);
            console.error('[FolderTreeWithCards] PPTX upload failed but local source kept', {
              docId,
              localFileId: failedDoc?.localFileId ?? null,
              blobUrl: (failedDoc as any)?.blobUrl ?? failedDoc?.localUrl ?? null,
            });
          } catch (markErr) {
            console.error('[FolderTreeWithCards] Failed to mark PPTX upload failure', markErr);
          }
          toastError?.(err?.message || 'PPTXの追加に失敗しました');
        }
      }

      setExpandedFolders((prev) => new Set(prev).add(folderId));
    },
    [currentUser, getNextOrderIndex, toastError, uploadFile]
  );

  const getUniqueFolderName = useCallback(
    (parentId: string | null) => {
      const siblings = treeFolders.filter((folder) => {
        if (isSoftDeleted(folder)) return false;
        return isSameFolder(getParentFolderId(folder), parentId);
      });
      const names = new Set(
        siblings
          .map((folder) => String(folder.folderName ?? folder.folder_name ?? '').trim())
          .filter(Boolean)
      );
      if (!names.has(DEFAULT_NEW_FOLDER_NAME)) return DEFAULT_NEW_FOLDER_NAME;

      let next = 2;
      while (names.has(`${DEFAULT_NEW_FOLDER_NAME} (${next})`)) {
        next += 1;
      }
      return `${DEFAULT_NEW_FOLDER_NAME} (${next})`;
    },
    [treeFolders]
  );

  const getUniqueCardName = useCallback(
    (folderId: string | null) => {
      const targetFolderId = resolveTreeFolderId(folderId);
      const names = new Set(
        treeCards
          .filter((card) => {
            if (isSoftDeleted(card as any)) return false;
            const cardFolderId = resolveTreeFolderId(card.folderId ?? (card as any).folder_id);
            return isSameFolder(cardFolderId, targetFolderId);
          })
          .map((card) => String(card.title ?? '').trim())
          .filter(Boolean)
      );
      if (!names.has(DEFAULT_NEW_CARD_NAME)) return DEFAULT_NEW_CARD_NAME;

      let next = 2;
      while (names.has(`${DEFAULT_NEW_CARD_NAME} (${next})`)) {
        next += 1;
      }
      return `${DEFAULT_NEW_CARD_NAME} (${next})`;
    },
    [treeCards, resolveTreeFolderId]
  );

  const handleCreateFolderAction = async (parentId: string | null) => {
    if (!onCreateFolder) return;
    const name = getUniqueFolderName(parentId);
    const tempId = createOptimisticId('folder');
    optimisticFolderNameRef.current.set(tempId, name);
    const siblingCount = treeFolders.filter((folder) => {
      if (isSoftDeleted(folder)) return false;
      return isSameFolder(getParentFolderId(folder), parentId);
    }).length;

    const optimisticFolder = {
      id: tempId,
      folderId: tempId,
      folderName: name,
      parentFolderId: parentId,
      isDeleted: false,
      orderIndex: siblingCount,
      __optimistic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setOptimisticFolders((prev) => [...prev, optimisticFolder]);
    if (parentId) {
      setExpandedFolders((prev) => new Set(prev).add(parentId));
    }
    // 新規作成直後に必ず名前編集へ入る
    setEditingId(tempId);
    setEditingName(name);
    editingIdRef.current = tempId;
    editingNameRef.current = name;
    renameCancelledRef.current = false;
    setPendingScrollId(tempId);

    try {
      const createdFolderId = await onCreateFolder(name, parentId ?? undefined);
      if (!createdFolderId) {
        throw new Error('フォルダIDの取得に失敗しました');
      }
      const finalName =
        (editingIdRef.current === tempId
          ? editingNameRef.current.trim()
          : optimisticFolderNameRef.current.get(tempId)) || name;

      setOptimisticFolders((prev) => prev.filter((folder) => getFolderId(folder) !== tempId));
      if (parentId) {
        setExpandedFolders((prev) => new Set(prev).add(parentId));
      }
      optimisticFolderNameRef.current.delete(tempId);
      const isStillEditingTemp = editingIdRef.current === tempId;
      if (isStillEditingTemp) {
        const carriedName = editingNameRef.current || finalName || name;
        setEditingId(createdFolderId);
        setEditingName(carriedName);
        editingIdRef.current = createdFolderId;
        editingNameRef.current = carriedName;
      }
      onFolderSelect(createdFolderId);
      // finalName が初期名と異なれば、サーバー側に同期
      if (!isStillEditingTemp && finalName !== name) {
        void onUpdateFolder?.(createdFolderId, { folderName: finalName });
      }
      // スクロール表示のみ（編集開始はしない）
      setPendingScrollId(createdFolderId);
    } catch (err: unknown) {
      setOptimisticFolders((prev) => prev.filter((folder) => getFolderId(folder) !== tempId));
      optimisticFolderNameRef.current.delete(tempId);
      setPendingScrollId((prev) => (prev === tempId ? null : prev));
      if (editingIdRef.current === tempId) {
        closeRename();
      }
      toastError?.(err?.message || 'フォルダの作成に失敗しました');
    }
  };

  const handleCreateCardAction = async (targetFolderId: string | null) => {
    if (!onCreateCard) return;

    const normalizedFolderId = normalizeFolderId(targetFolderId);
    const title = ''; // 空文字で作成
    const tempId = createOptimisticId('card');
    optimisticCardNameRef.current.set(tempId, title);
    const now = new Date();

    const optimisticCard = {
      id: tempId,
      folderId: normalizedFolderId,
      title,
      orderIndex: getNextOrderIndex(targetFolderId),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      __optimistic: true,
    } as unknown as Card;

    setOptimisticCards((prev) => [...prev, optimisticCard]);
    if (targetFolderId) {
      setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
    }
    setPendingScrollId(tempId);

    try {
      const createdCard = await onCreateCard({ folderId: normalizedFolderId, title, blocks: [] });
      const createdCardId = createdCard?.id ?? createdCard?.cardId ?? null;

      if (createdCardId) {
        setNewlyCreatedCardId(createdCardId);
        // 新規作成後に右ペインを表示（エディタを開く）するように連動させる
        onItemSelect({ type: 'card', id: createdCardId });
      }

      const finalName =
        (editingIdRef.current === tempId
          ? editingNameRef.current.trim()
          : optimisticCardNameRef.current.get(tempId)) || title;

      setOptimisticCards((prev) => prev.filter((card) => card.id !== tempId));
      optimisticCardNameRef.current.delete(tempId);

      if (!createdCardId) {
        throw new Error('カードIDの取得に失敗しました');
      }

      if (editingIdRef.current === tempId) {
        closeRename();
      }
      // finalName が初期名と異なれば、サーバー側に同期
      if (finalName !== title) {
        void onUpdateCard?.(createdCardId, { title: finalName });
      }
      // スクロール表示のみ（編集開始はしない）
      setPendingScrollId(createdCardId);
    } catch (err: unknown) {
      setOptimisticCards((prev) => prev.filter((card) => card.id !== tempId));
      optimisticCardNameRef.current.delete(tempId);
      setPendingScrollId((prev) => (prev === tempId ? null : prev));
      if (editingIdRef.current === tempId) {
        closeRename();
      }
      toastError?.(err?.message || 'カードの作成に失敗しました');
    }
  };

  const handleToolbarAddFile = useCallback(() => {
    const targetFolderId = selectedFolderId;
    if (!targetFolderId) {
      toastError?.('ファイル追加先のフォルダを選択してください');
      return;
    }
    uploadTargetFolderIdRef.current = targetFolderId;
    fileInputRef.current?.click();
  }, [selectedFolderId, toastError]);

  const handleToolbarFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetFolderId = uploadTargetFolderIdRef.current;
    const files = event.target.files;
    event.target.value = '';

    if (!targetFolderId || !files) return;

    const pdfFiles = extractPdfFiles(files);
    const pptxFiles = extractPptxFiles(files);

    if (pdfFiles.length > 0) void handlePdfDropped(targetFolderId, pdfFiles);
    if (pptxFiles.length > 0) void handlePptxDropped(targetFolderId, pptxFiles);

    if (pdfFiles.length === 0 && pptxFiles.length === 0) {
      toastError?.('PDFまたはPPTXファイルを選択してください');
    }
  };

  const closeRename = useCallback(() => {
    setEditingId(null);
    setEditingName('');
    editingIdRef.current = null;
    editingNameRef.current = '';
    renameCancelledRef.current = false;
  }, []);

  const handleRenameConfirm = async () => {
    // 二重起動防止
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      // Esc キャンセルフラグ掃除を最優先（editingId が null でも実行して残留を防ぐ）
      if (renameCancelledRef.current) {
        renameCancelledRef.current = false;
        closeRename();
        return;
      }

      // ref から値を確定（state 更新タイミング差を避ける）
      const id = editingIdRef.current;
      const nextName = editingNameRef.current.trim();

      // 既に閉じている場合は何もしない
      if (!id) return;

      if (!nextName) {
        closeRename();
        return;
      }

      // tmp- ID（optimistic）の場合は、ローカル更新のみ（サーバー更新しない）
      if (id.startsWith('tmp-')) {
        const isOptimisticFolder = optimisticFolders.some((folder) => getFolderId(folder) === id);
        if (isOptimisticFolder) {
          optimisticFolderNameRef.current.set(id, nextName);
          setOptimisticFolders((prev) =>
            prev.map((folder) =>
              getFolderId(folder) === id
                ? { ...folder, folderName: nextName, folder_name: nextName }
                : folder
            )
          );
          closeRename();
          return;
        }

        const isOptimisticCard = optimisticCards.some((card) => card.id === id);
        if (isOptimisticCard) {
          optimisticCardNameRef.current.set(id, nextName);
          setOptimisticCards((prev) =>
            prev.map((card) => (card.id === id ? ({ ...card, title: nextName } as Card) : card))
          );
          closeRename();
          return;
        }

        // tmp- ID だが optimistic リストに無い場合は何もしない
        closeRename();
        return;
      }

      // サーバー上の実体を更新
      const isFolder = treeFolders.some((folder) => getFolderId(folder) === id);
      if (isFolder) {
        await onUpdateFolder?.(id, { folderName: nextName });
      } else {
        await onUpdateCard?.(id, { title: nextName });
      }
      // 成功時だけ閉じる
      closeRename();
    } catch (err: unknown) {
      // 失敗時はエラー表示のみで、editingId は維持して再編集可能にする
      toastError?.(err?.message || '名前の変更に失敗しました');
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleDelete = async (id: string, type: 'folder' | 'card') => {
    const isOptimistic =
      type === 'folder'
        ? optimisticFolders.some((folder) => getFolderId(folder) === id)
        : optimisticCards.some((card) => card.id === id);
    if (isOptimistic) return;

    if (type === 'folder') {
      if (!onDeleteFolder) return;
      setDeleteTargetFolderId(id);
      setDeleteFolderDialogOpen(true);
      return;
    }

    const confirmMessage = 'このカードを削除しますか?';
    if (!confirm(confirmMessage)) return;

    await onDeleteCard?.(id);
  };

  const handleDeleteFolderDialogOpenChange = useCallback((nextOpen: boolean) => {
    setDeleteFolderDialogOpen(nextOpen);
    if (!nextOpen) setDeleteTargetFolderId(null);
  }, []);

  const handleConfirmDeleteFolder = useCallback(
    async (folder: { id?: string; folderId?: string }) => {
      const folderId = String(folder.id ?? folder.folderId ?? '');
      if (!folderId) throw new Error('フォルダIDの取得に失敗しました');
      if (!onDeleteFolder) throw new Error('フォルダ削除ハンドラが未設定です');
      await onDeleteFolder(folderId);
    },
    [onDeleteFolder]
  );

  const handleMoveCard = async (cardId: string) => {
    const targetFolderName = prompt('移動先のフォルダ名を入力してください(完全一致)');
    if (!targetFolderName) return;

    const targetFolder = treeFolders.find((f) => (f.folderName || f.folder_name) === targetFolderName);

    if (targetFolder) {
      await onUpdateCard?.(cardId, { folderId: getFolderId(targetFolder) });
    } else {
      alert('フォルダが見つかりませんでした。');
    }
  };

  const handleArrowNavigation = (key: string, currentId: string, _hasItemSelection: boolean) => {
    const flatList: Array<{ id: string; type: 'folder' | 'card' | 'document'; parentId: string | null }> =
      [];

    const addFolderAndChildren = (folderId: string | null) => {
      const folderList = folderId === null ? rootFolders : getChildFolders(folderId);

      folderList.forEach((folder) => {
        const id = getFolderId(folder);
        flatList.push({ id, type: 'folder', parentId: folderId });

        if (expandedFolders.has(id)) {
          addFolderAndChildren(id);
          getFolderItems(id).forEach((item) => {
            flatList.push({
              id: item.data.id || (item.data as any).cardId || (item.data as any).documentId,
              type: item.type as any,
              parentId: id,
            });
          });
        }
      });
    };

    // First, expand root folders and their contents to match UI rendering order
    addFolderAndChildren(null);

    // Then append root-level items (cards/documents that live at root)
    getFolderItems(null).forEach((item) => {
      flatList.push({
        id: item.data.id || (item.data as any).cardId || (item.data as any).documentId,
        type: item.type as any,
        parentId: null,
      });
    });

    const currentIndex = flatList.findIndex((item) => item.id === currentId);
    if (currentIndex === -1) return;

    const currentItem = flatList[currentIndex];

    if (key === 'ArrowUp' && currentIndex > 0) {
      const prevItem = flatList[currentIndex - 1];
      if (prevItem.type === 'folder') onFolderSelect(prevItem.id);
      else onItemSelect({ type: prevItem.type, id: prevItem.id });
    } else if (key === 'ArrowDown' && currentIndex < flatList.length - 1) {
      const nextItem = flatList[currentIndex + 1];
      if (nextItem.type === 'folder') onFolderSelect(nextItem.id);
      else onItemSelect({ type: nextItem.type, id: nextItem.id });
    } else if (key === 'ArrowRight' && currentItem.type === 'folder') {
      if (!expandedFolders.has(currentId)) {
        toggleFolder(currentId);
      } else {
        const children = getChildFolders(currentId);
        const folderItems = getFolderItems(currentId);
        if (children.length > 0) onFolderSelect(getFolderId(children[0]));
        else if (folderItems.length > 0) {
          onItemSelect({
            type: folderItems[0].type === 'card' ? 'card' : 'document',
            id:
              folderItems[0].data.id ||
              (folderItems[0].data as any).cardId ||
              (folderItems[0].data as any).documentId,
          });
        }
      }
    } else if (key === 'ArrowLeft') {
      if (currentItem.type === 'folder' && expandedFolders.has(currentId)) {
        toggleFolder(currentId);
      } else if (currentItem.parentId) {
        onFolderSelect(currentItem.parentId);
      }
    }
  };

  // Assign the latest key handler after all related handlers are defined to avoid TDZ/stale closures.
  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      const treeRoot = treeRootRef.current;
      if (!treeRoot) return;
      const activeEl = document.activeElement as HTMLElement | null;
      const isTreeFocused = treeRoot.contains(target) || (activeEl ? treeRoot.contains(activeEl) : false);
      if (!isTreeFocused) return;
      if (isTextInputTarget(target)) return;
      if (hasOpenModalDialog()) return;

      // 新規フォルダ
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void handleCreateFolderAction(selectedFolderId ?? null);
        return;
      }

      // ファイル追加（未使用回避も兼ねる）
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleToolbarAddFile();
        return;
      }

      const currentId = selectedItem?.id || selectedFolderId;
      if (!currentId) return;

      const isCard = selectedItem?.type === 'card';
      const isDoc = selectedItem?.type === 'document';

      if (e.key === 'F2') {
        e.preventDefault();
        if (selectedItem?.type === 'document') return;

        let name = '';
        if (selectedItem?.type === 'card') {
          const card = treeCards.find((c) => c.id === selectedItem.id);
          name = card?.title || '無題のカード';
        } else if (selectedFolderId) {
          const folder = treeFolders.find((f) => getFolderId(f) === selectedFolderId);
          name = folder?.folderName || folder?.folder_name || '';
        }

        if (name || selectedFolderId) {
          setEditingId(currentId);
          setEditingName(name || '');
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (isCard) void handleDelete(currentId, 'card');
        else if (isDoc) {
          /* ドキュメント削除は未実装 */
        } else void handleDelete(currentId, 'folder');
      }

      if (e.key === 'Enter' && isCard) {
        e.preventDefault();
        onItemSelect({ type: 'card', id: currentId });
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        handleArrowNavigation(e.key, currentId, !!selectedItem);
      }
    };
  }, [
    selectedItem,
    selectedFolderId,
    treeCards,
    treeFolders,
    expandedFolders,
    onItemSelect,
    onFolderSelect,
    toggleFolder,
    handleCreateFolderAction,
    handleDelete,
    handleArrowNavigation,
    handleToolbarAddFile,
  ]);

  const renderFolder = (folder: FolderTreeNode, depth: number = 0) => {
    const folderId = getFolderId(folder);
    const folderName = folder.folderName ?? folder.folder_name ?? '(名称未設定)';
    const isExpanded = expandedFolders.has(folderId);
    const isSelected = selectedFolderId === folderId;
    const isEditing = editingId === folderId;
    const childFolders = getChildFolders(folderId);

    const isPinned = pinnedItems?.some((f) => f.type === 'folder' && f.id === folderId);
    const handleTogglePin = () => {
      if (isPinned) onUnpinItem?.({ type: 'folder', id: folderId });
      else onPinItem?.({ type: 'folder', id: folderId });
    };

    const matchCount = isFiltering ? matchCountMap.get(folderId) ?? 0 : -1;
    const hasExpandableContent =
      childFolders.length > 0 || (isFiltering ? matchCount > 0 : getFolderItems(folderId).length > 0);
    const isDimmed = isFiltering && matchCount === 0;
    const isFileDraggingOver = fileDragFolderId === folderId;

    return (
      <FolderRow
        key={folderId}
        folder={folder}
        depth={depth}
        isExpanded={isExpanded}
        isSelected={isSelected}
        isEditing={isEditing}
        editingId={editingId}
        setEditingId={setEditingId}
        editingName={editingName}
        setEditingName={setEditingName}
        editingNameRef={editingNameRef}
        editInputRef={editInputRef}
        onToggle={() => toggleFolder(folderId)}
        onSelect={() => onFolderSelect(folderId)}
        onNavigate={() => onFolderSelect(folderId)}
        handleCreateFolderAction={handleCreateFolderAction}
        handleCreateCardAction={handleCreateCardAction}
        handleDelete={handleDelete as any}
        handleRenameConfirm={handleRenameConfirm}
        renameCancelledRef={renameCancelledRef}
        isPinned={isPinned}
        handleTogglePin={handleTogglePin}
        isFiltering={Boolean(isFiltering)}
        matchCount={matchCount}
        rowBaseClassName={ROW_BASE}
        isDragging={isDragging}
        hasUpdateOrDelete={Boolean(onUpdateFolder || onDeleteFolder)}
        menuOpen={openRowMenuId === `folder:${folderId}`}
        onMenuOpenChange={(open) =>
          setOpenRowMenuId(open ? `folder:${folderId}` : (prev) => (prev === `folder:${folderId}` ? null : prev))
        }
        setRowRef={setRowRef}
        isDimmed={isDimmed}
        isFileDraggingOver={isFileDraggingOver}
        onDragEnterCapture={(e) => {
          if (!isFileDragEvent(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setFileDragFolderId(folderId);
        }}
        onDragOverCapture={(e) => {
          if (!isFileDragEvent(e)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          setFileDragFolderId(folderId);
        }}
        onDragLeaveCapture={(e) => {
          if (!isFileDragEvent(e)) return;
          const nextTarget = e.relatedTarget as Node | null;
          if (nextTarget && e.currentTarget.contains(nextTarget)) return;
          setFileDragFolderId((prev) => (prev === folderId ? null : prev));
        }}
        onDropCapture={(e) => {
          if (!isFileDragEvent(e)) return;
          e.preventDefault();
          e.stopPropagation();
          setFileDragFolderId(null);
          const files = e.dataTransfer?.files ?? null;
          const pdfFiles = extractPdfFiles(files);
          const pptxFiles = extractPptxFiles(files);
          if (pdfFiles.length > 0) void handlePdfDropped(folderId, pdfFiles);
          if (pptxFiles.length > 0) void handlePptxDropped(folderId, pptxFiles);
        }}
        hasExpandableContent={hasExpandableContent}
      >
        {/* 子要素（サブフォルダとカードリスト） */}
        <div>
          {childFolders.map((childFolder) => renderFolder(childFolder, depth + 1))}

          <Droppable droppableId={DnDHelpers.createCardListDroppableId(folderId)} direction="vertical">
            {(provided, snapshot) => {
              const folderItems = getFolderItems(folderId);
              let cardIndexForFolder = 0;
              const isOrigin = Boolean(snapshot.draggingFromThisWith) && !snapshot.isDraggingOver;
              const hasItems = folderItems.length > 0;
              const isDragActive = snapshot.isDraggingOver || isOrigin;

              return (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'block',
                    // アイテムがあるか、ドラッグ中の場合のみ最小高さを設定
                    (hasItems || isDragActive) && 'min-h-[32px]',
                    snapshot.isDraggingOver && 'bg-blue-100 ring-1 ring-blue-300',
                    isOrigin && 'bg-blue-50 ring-1 ring-blue-200'
                  )}
                >
                  {folderItems.map((item) =>
                    item.type === 'card'
                      ? renderCard(item.data, depth + 1, cardIndexForFolder++)
                      : renderDocument(item.data, depth + 1, 0)
                  )}
                  {provided.placeholder}
                </div>
              );
            }}
          </Droppable>
        </div>
      </FolderRow>
    );
  };

  /**
   * ✅追加: PDFドキュメントのレンダリング
   */
  const renderDocument = (doc: DocumentItem, depth: number, _index: number) => {
    const docId = doc.id;
    const isSelected = selectedItem?.type === 'document' && selectedItem.id === docId;
    const isPinned = pinnedItems?.some((f) => f.type === 'document' && f.id === docId);
    const handleTogglePin = () => {
      if (isPinned) onUnpinItem?.({ type: 'document', id: docId });
      else onPinItem?.({ type: 'document', id: docId });
    };

    return (
      <DocumentRow
        key={docId}
        doc={doc}
        depth={depth}
        isSelected={isSelected}
        onSelect={onItemSelect}
        treeFolders={treeFolders}
        treeCards={treeCards}
        documents={documents}
        onUpdateFolder={onUpdateFolder}
        isPinned={isPinned}
        handleTogglePin={handleTogglePin}
        rowBaseClassName={ROW_BASE}
        setRowRef={setRowRef}
        isDragging={isDragging}
        menuOpen={openRowMenuId === `document:${docId}`}
        onMenuOpenChange={(open) =>
          setOpenRowMenuId(open ? `document:${docId}` : (prev) => (prev === `document:${docId}` ? null : prev))
        }
      />
    );
  };

  const renderCard = (card: Card, depth: number, index: number) => {
    const cardId = card.id;
    const isSelected = selectedItem?.type === 'card' && selectedItem.id === cardId;
    const isEditing = editingId === cardId;
    const isPinned = pinnedItems?.some((f) => f.type === 'card' && f.id === cardId);

    const handleTogglePin = () => {
      if (isPinned) onUnpinItem?.({ type: 'card', id: cardId });
      else onPinItem?.({ type: 'card', id: cardId });
    };

    return (
      <CardRow
        key={cardId}
        card={card}
        depth={depth}
        index={index}
        isSelected={isSelected}
        isEditing={isEditing}
        editingId={editingId}
        setEditingId={setEditingId}
        editingName={editingName}
        setEditingName={setEditingName}
        editingNameRef={editingNameRef}
        editInputRef={editInputRef}
        onItemSelect={onItemSelect}
        handleMoveCard={handleMoveCard}
        handleDelete={handleDelete as any}
        handleRenameConfirm={handleRenameConfirm}
        renameCancelledRef={renameCancelledRef}
        isPinned={isPinned}
        handleTogglePin={handleTogglePin}
        rowBaseClassName={ROW_BASE}
        setRowRef={setRowRef}
        isDragging={isDragging}
        hasUpdateOrDelete={Boolean(onUpdateCard || onDeleteCard)}
        isNewlyCreated={cardId === newlyCreatedCardId}
        menuOpen={openRowMenuId === `card:${cardId}`}
        onMenuOpenChange={(open) =>
          setOpenRowMenuId(open ? `card:${cardId}` : (prev) => (prev === `card:${cardId}` ? null : prev))
        }
      />
    );
  };

  const hasRootContent = rootFolders.length > 0 || rootItems.length > 0;

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* ✅ サイドバー境界線: 右端 1px + ほんのり背景差 */}
      <div
        ref={treeRootRef}
        className={cn(
          'h-full w-full bg-[#F1F4F7] border-r border-black/5',
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="hidden"
          multiple
          onChange={handleToolbarFileInputChange}
        />

        {!hasRootContent ? (
          <div className="text-center py-8 text-slate-400">
            <Folder className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">フォルダとカードがありません</p>
          </div>
        ) : (
          <div>
            {rootFolders.map((folder) => renderFolder(folder, 0))}
            {rootItems.length > 0 && (
              <div className="mt-1">
                <Droppable
                  droppableId={DnDHelpers.createCardListDroppableId(ROOT_FOLDER_ID)}
                  direction="vertical"
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'min-h-[32px] block',
                        snapshot.isDraggingOver && 'bg-blue-100 ring-1 ring-blue-300',
                        snapshot.draggingFromThisWith &&
                          !snapshot.isDraggingOver &&
                          'bg-blue-50 ring-1 ring-blue-200'
                      )}
                    >
                      {(() => {
                        let rootCardIndex = 0;
                        return rootItems.map((item) =>
                          item.type === 'card'
                            ? renderCard(item.data, 0, rootCardIndex++)
                            : renderDocument(item.data, 0, 0)
                        );
                      })()}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </div>
        )}

        <DeleteFolderDialog
          open={deleteFolderDialogOpen}
          onOpenChange={handleDeleteFolderDialogOpenChange}
          folder={deleteTargetFolder}
          cardCount={deleteTargetCounts.cardCount}
          subfolderCount={deleteTargetCounts.subfolderCount}
          onConfirm={handleConfirmDeleteFolder}
        />
      </div>
    </DragDropContext>
  );
}

