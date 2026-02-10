import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, MoreVertical, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { ContextMenu } from './ContextMenu';
import { DocumentRowMenu } from './DocumentRowMenu';
import { useFolderDnD, DnDHelpers } from '@/hooks/useFolderDnD';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getLocalDb } from '@/services/localDB';
import { saveDocumentBlob } from '@/services/documentFileStore';
import { getOrCreateDeviceId } from '@/utils/device';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import type { Card, DocumentItem, ExplorerItem, SelectedExplorerItem } from '@/types';

type FolderTreeNode = {
  id?: string;
  folderId?: string;
  parentFolderId?: string | null;
  parent_folder_id?: string | null;
  folderName?: string;
  folder_name?: string;
  orderIndex?: number;
  order_index?: number;
  isDeleted?: boolean;
  is_deleted?: boolean;
  isHidden?: boolean;
  is_hidden?: boolean;
  __optimistic?: boolean;
  [key: string]: unknown;
};

interface FolderTreeWithCardsProps {
  folders: FolderTreeNode[];
  cards: Card[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  selectedItem: SelectedExplorerItem;
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
  onCreateFolder?: (name: string, parentId?: string) => Promise<string>;
  onUpdateFolder?: (folderId: string, data: any) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
  onCreateCard?: (data: any) => Promise<any>;
  onUpdateCard?: (cardId: string, data: any) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;
  moveCardToFolder?: (cardId: string, targetFolderId: string) => Promise<void>;
  reorderCards?: (folderId: string, cardIds: string[]) => Promise<void>;
  favorites?: Array<{ type: 'folder' | 'card' | 'document'; id: string }>;
  onAddFavorite?: (item: { type: 'folder' | 'card' | 'document'; id: string }) => void;
  onRemoveFavorite?: (item: { type: 'folder' | 'card' | 'document'; id: string }) => void;
  isFiltering?: boolean;
}

const createDocumentId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

const ROOT_FOLDER_ID = '';
const DEFAULT_NEW_FOLDER_NAME = '新規フォルダ';
const DEFAULT_NEW_CARD_NAME = '新規カード';

const getFolderId = (folder: FolderTreeNode): string => String(folder?.id ?? folder?.folderId ?? '');
const getParentFolderId = (folder: FolderTreeNode): string | null => {
  const parent = folder?.parentFolderId ?? folder?.parent_folder_id ?? null;
  return parent == null ? null : String(parent);
};
const normalizeFolderId = (folderId: string | null | undefined): string => folderId ?? ROOT_FOLDER_ID;
const isSameFolder = (left: string | null | undefined, right: string | null | undefined) =>
  normalizeFolderId(left) === normalizeFolderId(right);
const getEntityTime = (value: any): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === 'function') return value.toDate()?.getTime?.() ?? 0;
  return 0;
};
const createOptimisticId = (prefix: 'folder' | 'card') =>
  `tmp-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const buildStoragePath = (uid: string, docId: string, ext: 'pdf' | 'pptx') =>
  `users/${uid}/documents/${docId}/source.${ext}`;
const isTextInputTarget = (target: HTMLElement | null) => {
  if (!target) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
};
const hasOpenModalDialog = () =>
  Boolean(
    document.querySelector('[role="dialog"][data-state="open"]') ||
    document.querySelector('[role="dialog"][aria-modal="true"]') ||
    document.querySelector('[role="alertdialog"][data-state="open"]') ||
    document.querySelector('[role="alertdialog"][aria-modal="true"]')
  );

interface ExplorerToolbarProps {
  targetFolderLabel: string;
  onCreateFolder: () => void;
  onCreateCard: () => void;
  onAddFile?: (() => void) | null;
  selectedFolderId?: string | null;
}

function ExplorerToolbar({
  targetFolderLabel,
  onCreateFolder,
  onCreateCard,
  onAddFile,
  selectedFolderId,
}: ExplorerToolbarProps) {
  const isAddFileDisabled = !selectedFolderId;
  return (
    <div className="px-2 py-2 border-b border-slate-100 bg-white/90 sticky top-0 z-10">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 truncate">
          作成先: {targetFolderLabel}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-7 px-2 inline-flex items-center gap-1 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onCreateFolder} className="gap-2">
              <Folder className="w-4 h-4" />
              新規フォルダ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateCard} className="gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              新規カード
            </DropdownMenuItem>
            {onAddFile && (
              <DropdownMenuItem 
                onClick={onAddFile} 
                className="gap-2"
                disabled={isAddFileDisabled}
              >
                <FileText className="w-4 h-4" />
                ファイル追加（PDF / PPTX）
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
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
  favorites,
  onAddFavorite,
  onRemoveFavorite,
  isFiltering = false,
}: FolderTreeWithCardsProps) {
  // フォルダ・カード共通の行スタイル（高さ・padding・背景の描画範囲を完全統一）
  // overflow-hidden を入れて「選択背景が行の縦幅を超えて見える」問題を確実に切る
  const ROW_BASE =
    "group flex items-center h-8 min-h-0 box-border pr-2 py-0 relative w-full text-left rounded-md overflow-hidden transition-colors";

  const { currentUser } = useAuth();
  const { uploadFile } = useReliableFileUpload();
  const { error: toastError } = useToast();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [fileDragFolderId, setFileDragFolderId] = useState<string | null>(null);
  const [optimisticFolders, setOptimisticFolders] = useState<FolderTreeNode[]>([]);
  const [optimisticCards, setOptimisticCards] = useState<Card[]>([]);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetFolderIdRef = useRef<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const editingNameRef = useRef('');
  const optimisticFolderNameRef = useRef<Map<string, string>>(new Map());
  const optimisticCardNameRef = useRef<Map<string, string>>(new Map());
  const renameCancelledRef = useRef(false);
  const inFlightRef = useRef(false);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

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

  const cardsForDnD = useMemo(
    () => treeCards.filter((card) => !(card as any).__optimistic),
    [treeCards]
  );

  const { onDragEnd } = useFolderDnD({
    cards: cardsForDnD,
    moveCardToFolder: moveCardToFolder || (async () => {}),
    reorderCards: reorderCards || (async () => {}),
  });

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
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const childFoldersByParentId = useMemo(() => {
    const map = new Map<string, FolderTreeNode[]>();
    for (const folder of treeFolders) {
      const isDeleted = folder.isDeleted ?? folder.is_deleted;
      const isHidden = folder.isHidden ?? folder.is_hidden;
      if (isDeleted || isHidden) continue;

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

  const getChildFolders = useCallback((parentId: string) => {
    return childFoldersByParentId.get(parentId) ?? [];
  }, [childFoldersByParentId]);

  const itemsByFolderId = useMemo(() => {
    const map = new Map<string, ExplorerItem[]>();
    const pushItem = (folderId: string | null | undefined, item: ExplorerItem) => {
      const key = normalizeFolderId(folderId);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    };

    for (const card of treeCards) {
      if (card.isDeleted) continue;
      pushItem(card.folderId, { type: 'card', data: card });
    }
    for (const doc of documents) {
      if (doc.isDeleted) continue;
      pushItem(doc.folderId, { type: 'document', data: doc });
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
  }, [treeCards, documents]);

  const getFolderItems = useCallback((folderId: string | null): ExplorerItem[] => {
    return itemsByFolderId.get(normalizeFolderId(folderId)) ?? [];
  }, [itemsByFolderId]);

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
      const childCount = children.reduce((acc, child) => acc + calcMatchCount(getFolderId(child)), 0);
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

  const isFileDragEvent = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return types.includes('Files');
  };

  const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  const extractPdfFiles = (fileList: FileList | null): File[] => {
    if (!fileList) return [];
    return Array.from(fileList).filter(file => {
      const name = file.name?.toLowerCase() ?? '';
      return file.type === 'application/pdf' || name.endsWith('.pdf');
    });
  };

  const extractPptxFiles = (fileList: FileList | null): File[] => {
    if (!fileList) return [];
    return Array.from(fileList).filter(file => {
      const name = file.name?.toLowerCase() ?? '';
      return file.type === PPTX_MIME || name.endsWith('.pptx');
    });
  };

  const getNextOrderIndex = useCallback((folderId: string | null) => {
    let maxOrder = -1;
    for (const card of treeCards) {
      if (!isSameFolder(card.folderId, folderId) || card.isDeleted) continue;
      const order = card.orderIndex ?? -1;
      if (order > maxOrder) maxOrder = order;
    }
    for (const doc of documents) {
      if (!isSameFolder(doc.folderId, folderId) || doc.isDeleted) continue;
      const order = doc.orderIndex ?? -1;
      if (order > maxOrder) maxOrder = order;
    }
    return maxOrder + 1;
  }, [treeCards, documents]);

  const handlePdfDropped = useCallback(async (folderId: string, files: File[]) => {
    if (!files.length) return;
    if (!currentUser) {
      toastError?.('PDFの追加にはログインが必要です');
      return;
    }

    const pdfFiles = files.filter(file => {
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
      } catch (localErr: any) {
        console.error('[FolderTreeWithCards] Failed to prepare local PDF source', {
          error: localErr,
          docId,
          fileName: file.name,
        });
        toastError?.(localErr?.message || 'PDFのローカル保存に失敗しました');
        continue;
      }

      try {
        const result = await uploadFile(
          file,
          () => storagePath,
          { type: 'pdf', folderId, docId }
        );

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
      } catch (err: any) {
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
      setExpandedFolders(prev => new Set(prev).add(folderId));
    }
  }, [currentUser, getNextOrderIndex, toastError, uploadFile]);

  const handlePptxDropped = useCallback(async (folderId: string, files: File[]) => {
    if (!files.length) return;
    if (!currentUser) {
      toastError?.('PPTXの追加にはログインが必要です');
      return;
    }

    const pptxFiles = files.filter(file => {
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
      } catch (localErr: any) {
        console.error('[FolderTreeWithCards] Failed to prepare local PPTX source', {
          error: localErr,
          docId,
          fileName: file.name,
        });
        toastError?.(localErr?.message || 'PPTXのローカル保存に失敗しました');
        continue;
      }

      try {
        const result = await uploadFile(
          file,
          () => storagePath,
          { type: 'pptx', folderId, docId }
        );

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
        } catch (err: any) {
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

    setExpandedFolders(prev => new Set(prev).add(folderId));
  }, [currentUser, getNextOrderIndex, toastError, uploadFile]);

  // Note: getRecursiveMatchCount removed; now using memoized matchCountMap

  const getUniqueFolderName = useCallback((parentId: string | null) => {
    const siblings = treeFolders.filter((folder) => {
      if ((folder.isDeleted ?? folder.is_deleted) === true) return false;
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
  }, [treeFolders]);

  const getUniqueCardName = useCallback((folderId: string | null) => {
    const names = new Set(
      treeCards
        .filter((card) => isSameFolder(card.folderId, folderId) && !card.isDeleted)
        .map((card) => String(card.title ?? '').trim())
        .filter(Boolean)
    );
    if (!names.has(DEFAULT_NEW_CARD_NAME)) return DEFAULT_NEW_CARD_NAME;

    let next = 2;
    while (names.has(`${DEFAULT_NEW_CARD_NAME} (${next})`)) {
      next += 1;
    }
    return `${DEFAULT_NEW_CARD_NAME} (${next})`;
  }, [treeCards]);

  const handleCreateFolderAction = async (parentId: string | null) => {
    if (!onCreateFolder) return;
    const name = getUniqueFolderName(parentId);
    const tempId = createOptimisticId('folder');
    optimisticFolderNameRef.current.set(tempId, name);
    const siblingCount = treeFolders.filter((folder) => {
      if ((folder.isDeleted ?? folder.is_deleted) === true) return false;
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
    setPendingScrollId(tempId);

    try {
      const createdFolderId = await onCreateFolder(name, parentId ?? undefined);
      if (!createdFolderId) {
        throw new Error('フォルダIDの取得に失敗しました');
      }
      const finalName = (
        editingIdRef.current === tempId
          ? editingNameRef.current.trim()
          : optimisticFolderNameRef.current.get(tempId)
      ) || name;
      setOptimisticFolders((prev) => prev.filter((folder) => getFolderId(folder) !== tempId));
      if (parentId) {
        setExpandedFolders((prev) => new Set(prev).add(parentId));
      }
      optimisticFolderNameRef.current.delete(tempId);
      if (editingIdRef.current === tempId) {
        closeRename();
      }
      // finalName が初期名と異なれば、サーバー側に同期
      if (finalName !== name) {
        void onUpdateFolder?.(createdFolderId, { folderName: finalName });
      }
      // スクロール表示のみ（編集開始はしない）
      setPendingScrollId(createdFolderId);
    } catch (err: any) {
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
    const title = getUniqueCardName(targetFolderId);
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
      const finalName = (
        editingIdRef.current === tempId
          ? editingNameRef.current.trim()
          : optimisticCardNameRef.current.get(tempId)
      ) || title;
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
    } catch (err: any) {
      setOptimisticCards((prev) => prev.filter((card) => card.id !== tempId));
      optimisticCardNameRef.current.delete(tempId);
      setPendingScrollId((prev) => (prev === tempId ? null : prev));
      if (editingIdRef.current === tempId) {
        closeRename();
      }
      toastError?.(err?.message || 'カードの作成に失敗しました');
    }
  };

  const handleToolbarAddFile = () => {
    const targetFolderId = selectedFolderId;
    if (!targetFolderId) {
      toastError?.('ファイル追加先のフォルダを選択してください');
      return;
    }
    uploadTargetFolderIdRef.current = targetFolderId;
    fileInputRef.current?.click();
  };

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
          setOptimisticFolders((prev) => prev.map((folder) => (
            getFolderId(folder) === id
              ? { ...folder, folderName: nextName, folder_name: nextName }
              : folder
          )));
          closeRename();
          return;
        }

        const isOptimisticCard = optimisticCards.some((card) => card.id === id);
        if (isOptimisticCard) {
          optimisticCardNameRef.current.set(id, nextName);
          setOptimisticCards((prev) => prev.map((card) => (
            card.id === id
              ? ({ ...card, title: nextName } as Card)
              : card
          )));
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
    } catch (err: any) {
      // 失敗時はエラー表示のみで、editingId は維持して再編集可能にする
      toastError?.(err?.message || '名前の変更に失敗しました');
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleDelete = async (id: string, type: 'folder' | 'card') => {
    const isOptimistic = type === 'folder'
      ? optimisticFolders.some((folder) => getFolderId(folder) === id)
      : optimisticCards.some((card) => card.id === id);
    if (isOptimistic) return;

    const confirmMessage = type === 'folder'
      ? 'このフォルダを削除しますか?'
      : 'このカードを削除しますか?';

    if (!confirm(confirmMessage)) return;

    if (type === 'folder') await onDeleteFolder?.(id);
    else await onDeleteCard?.(id);
  };

  const handleMoveCard = async (cardId: string) => {
    const targetFolderName = prompt('移動先のフォルダ名を入力してください(完全一致)');
    if (!targetFolderName) return;

    const targetFolder = treeFolders.find(f => (f.folderName || f.folder_name) === targetFolderName);

    if (targetFolder) {
      await onUpdateCard?.(cardId, { folderId: getFolderId(targetFolder) });
    } else {
      alert('フォルダが見つかりませんでした。');
    }
  };

  const handleArrowNavigation = (key: string, currentId: string, _hasItemSelection: boolean) => {
    const flatList: Array<{ id: string; type: 'folder' | 'card' | 'document'; parentId: string | null }> = [];

    const addFolderAndChildren = (folderId: string | null) => {
      const folderList = folderId === null ? rootFolders : getChildFolders(folderId);

      folderList.forEach(folder => {
        const id = getFolderId(folder);
        flatList.push({ id, type: 'folder', parentId: folderId });

        if (expandedFolders.has(id)) {
          addFolderAndChildren(id);
          getFolderItems(id).forEach(item => {
            flatList.push({ 
              id: item.data.id || (item.data as any).cardId || (item.data as any).documentId, 
              type: item.type as any, 
              parentId: id 
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

    const currentIndex = flatList.findIndex(item => item.id === currentId);
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
            id: folderItems[0].data.id || (folderItems[0].data as any).cardId || (folderItems[0].data as any).documentId 
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
      if (isTextInputTarget(target)) return;
      if (hasOpenModalDialog()) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void handleCreateFolderAction(selectedFolderId ?? null);
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
          const card = treeCards.find(c => c.id === selectedItem.id);
          name = card?.title || '無題のカード';
        } else if (selectedFolderId) {
          const folder = treeFolders.find(f => getFolderId(f) === selectedFolderId);
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
        else if (isDoc) { /* ドキュメント削除は未実装 */ }
        else void handleDelete(currentId, 'folder');
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
  ]);

  const renderFolder = (folder: FolderTreeNode, depth: number = 0) => {
    const folderId = getFolderId(folder);
    const folderName = folder.folderName ?? folder.folder_name ?? '(名称未設定)';
    const isExpanded = expandedFolders.has(folderId);
    const isSelected = selectedFolderId === folderId;
    const isEditing = editingId === folderId;
    const childFolders = getChildFolders(folderId);
    const isOptimisticFolder = Boolean(folder.__optimistic);
    const hasContextMenu = !isOptimisticFolder && (onCreateFolder || onUpdateFolder || onDeleteFolder);

    const isPinned = favorites?.some(f => f.type === 'folder' && f.id === folderId);
    const handleTogglePin = () => {
      if (isPinned) onRemoveFavorite?.({ type: 'folder', id: folderId });
      else onAddFavorite?.({ type: 'folder', id: folderId });
    };

    const matchCount = isFiltering ? (matchCountMap.get(folderId) ?? 0) : -1;
    const hasExpandableContent =
      childFolders.length > 0 ||
      (isFiltering ? matchCount > 0 : getFolderItems(folderId).length > 0);
    const isDimmed = isFiltering && matchCount === 0;
    const isFileDraggingOver = fileDragFolderId === folderId;

    return (
      <div key={folderId} className={cn(isDimmed && "opacity-50")}>
        <Droppable droppableId={DnDHelpers.createCardDroppableId(folderId)} isDropDisabled={isExpanded}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div
                ref={(node) => setRowRef(folderId, node)}
                className={cn(
                  ROW_BASE,
                  isSelected && "bg-primary-50",
                  "hover:bg-slate-100",
                  snapshot.isDraggingOver && "bg-blue-100 ring-1 ring-blue-300",
                  isFileDraggingOver && "bg-blue-50 ring-1 ring-blue-400"
                )}
                style={{
                  paddingLeft: `${depth * 16 + 8}px`,
                  height: 32,
                  minHeight: 32,
                  boxSizing: 'border-box',
                }}
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
              >
                <div
                  className="flex-1 flex items-center min-w-0 h-full cursor-pointer"
                  onClick={() => {
                    if (!isEditing) onFolderSelect(folderId);
                  }}
                  onDoubleClick={() => {
                    if (!isEditing && hasExpandableContent) toggleFolder(folderId);
                  }}
                >
                  <div
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditing && hasExpandableContent) toggleFolder(folderId);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    {hasExpandableContent ? (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )
                    ) : null}
                  </div>

                  <Folder className={cn("w-4 h-4 flex-shrink-0 mr-1", isPinned ? "text-amber-500 fill-amber-100" : "text-slate-400")} />

                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      aria-label="フォルダ名の編集"
                      className="text-sm bg-white border border-primary-300 rounded px-1 outline-none ring-1 ring-primary-100 z-10 h-6 w-full leading-5"
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        editingNameRef.current = e.target.value;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          renameCancelledRef.current = true;
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={() => void handleRenameConfirm()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-1 flex-1 overflow-hidden">
                      <span className={cn("text-sm truncate leading-5", isSelected ? "text-primary-700 font-medium" : "text-slate-700")}>
                        {folderName}
                      </span>
                      {isFiltering && matchCount === 0 && <span className="text-xs text-slate-400">(0)</span>}
                    </div>
                  )}
                </div>

                {hasContextMenu && !isEditing && (
                  <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
                    <ContextMenu
                      type="folder"
                      onCreateSubfolder={() => void handleCreateFolderAction(folderId)}
                      onCreateCard={() => void handleCreateCardAction(folderId)}
                      onRename={() => {
                        setEditingId(folderId);
                        setEditingName(folderName);
                      }}
                      onDelete={() => handleDelete(folderId, 'folder')}
                      isPinned={isPinned}
                      onTogglePin={handleTogglePin}
                    >
                      <button
                        type="button"
                        aria-label="フォルダメニューを開く"
                        className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </ContextMenu>
                  </div>
                )}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {isExpanded && (
          <div>
            {childFolders.map(childFolder => renderFolder(childFolder, depth + 1))}

            <Droppable droppableId={DnDHelpers.createCardListDroppableId(folderId)}>
              {(provided) => {
                const folderItems = getFolderItems(folderId);
                let cardIndexForFolder = 0;
                return (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-[2px] block")}>
                    {folderItems.map((item) => (
                      item.type === 'card'
                        ? renderCard(item.data, depth + 1, cardIndexForFolder++)
                        : renderDocument(item.data, depth + 1, 0)
                    ))}
                    {provided.placeholder}
                  </div>
                );
              }}
            </Droppable>
          </div>
        )}
      </div>
    );
  };

  /**
   * ✅追加: PDFドキュメントのレンダリング
   */
  const renderDocument = (doc: DocumentItem, depth: number, _index: number) => {
    const docId = doc.id;
    const title = doc.title || '無題のドキュメント';
    const isSelected = selectedItem?.type === 'document' && selectedItem.id === docId;
    const isPinned = favorites?.some(f => f.type === 'document' && f.id === docId);
    const handleTogglePin = () => {
      if (isPinned) onRemoveFavorite?.({ type: 'document', id: docId });
      else onAddFavorite?.({ type: 'document', id: docId });
    };
    
    return (
      <div
        key={docId}
        ref={(node) => setRowRef(docId, node)}
        className={cn(
          ROW_BASE,
          isSelected && "bg-primary-50",
          "hover:bg-slate-100 cursor-pointer"
        )}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          height: 32,
          minHeight: 32,
          boxSizing: 'border-box',
        }}
        onClick={() => {
          onItemSelect({ type: 'document', id: docId });
        }}
      >
        <div className="flex-1 flex items-center min-w-0 h-full">
          <FileText className="w-4 h-4 text-rose-500 mr-2 shrink-0" />
          <span className={cn(
            "text-sm truncate leading-5",
            isSelected ? "text-primary-700 font-medium" : "text-slate-700"
          )}>
            {title}
          </span>
          {doc.sizeBytes && (
            <span className="ml-2 text-[10px] text-slate-400 shrink-0">
              {(doc.sizeBytes / 1024).toFixed(1)}KB
            </span>
          )}
        </div>
        <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
          <DocumentRowMenu
            doc={doc}
            folders={treeFolders}
            cards={treeCards}
            documents={documents}
            onUpdateFolder={onUpdateFolder}
            isPinned={isPinned}
            onTogglePin={onAddFavorite || onRemoveFavorite ? handleTogglePin : undefined}
          >
            <button
              type="button"
              aria-label="ドキュメントメニューを開く"
              className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DocumentRowMenu>
        </div>
      </div>
    );
  };

  const renderCard = (card: Card, depth: number, index: number) => {
    const cardId = card.id;
    const cardTitle = card.title || '無題のカード';
    const isSelected = selectedItem?.type === 'card' && selectedItem.id === cardId;
    const isEditing = editingId === cardId;
    const isOptimisticCard = Boolean((card as any).__optimistic);
    const isDragDisabled = isOptimisticCard || isEditing;
    const hasContextMenu = !isOptimisticCard && (onUpdateCard || onDeleteCard);

    const isPinned = favorites?.some(f => f.type === 'card' && f.id === cardId);
    const handleTogglePin = () => {
      if (isPinned) onRemoveFavorite?.({ type: 'card', id: cardId });
      else onAddFavorite?.({ type: 'card', id: cardId });
    };

    return (
      <Draggable
        key={cardId}
        draggableId={DnDHelpers.createCardDraggableId(cardId)}
        index={index}
        isDragDisabled={isDragDisabled}
      >
        {(provided, snapshot) => (
          <div
            ref={(node) => {
              provided.innerRef(node);
              setRowRef(cardId, node);
            }}
            {...provided.draggableProps}
            {...(isDragDisabled ? {} : provided.dragHandleProps)}
            className={cn(
              ROW_BASE,
              isSelected && "bg-primary-50",
              "hover:bg-slate-100",
              snapshot.isDragging && "bg-white shadow-lg opacity-90 z-50 ring-1 ring-primary-200"
            )}
            style={{
              ...provided.draggableProps.style,
              paddingLeft: `${depth * 16 + 8}px`,
              height: 32,
              minHeight: 32,
              boxSizing: 'border-box',
            }}
          >
            <div
              className="flex-1 flex items-center min-w-0 h-full cursor-pointer"
              onClick={() => {
                if (!isEditing) onItemSelect({ type: 'card', id: cardId });
              }}
            >
              <div className="w-4 h-4 flex-shrink-0 mr-1" />
              <FileText className={cn("w-4 h-4 flex-shrink-0 mr-1", isPinned ? "text-amber-500 fill-amber-100" : "text-slate-400")} />

                {isEditing ? (
                <input
                  ref={editInputRef}
                  aria-label="カード名の編集"
                  className="text-sm bg-white border border-primary-300 rounded px-1 outline-none ring-1 ring-primary-100 h-6 w-full leading-5"
                  value={editingName}
                  onChange={(e) => {
                    setEditingName(e.target.value);
                    editingNameRef.current = e.target.value;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      renameCancelledRef.current = true;
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={() => void handleRenameConfirm()}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-1 flex-1 overflow-hidden">
                  <span className={cn("text-sm truncate leading-5", isSelected ? "text-primary-700 font-medium" : "text-slate-600")}>
                    {cardTitle}
                  </span>
                </div>
              )}
            </div>

            {hasContextMenu && !isEditing && (
              <div className="absolute right-1 top-0 h-full flex items-center pointer-events-none">
                <ContextMenu
                  type="card"
                  onRename={() => {
                    setEditingId(cardId);
                    setEditingName(cardTitle);
                  }}
                  onMove={() => handleMoveCard(cardId)}
                  onDelete={() => handleDelete(cardId, 'card')}
                  isPinned={isPinned}
                  onTogglePin={handleTogglePin}
                >
                  <button
                    type="button"
                    aria-label="カードメニューを開く"
                    className="h-6 w-6 p-0 grid place-items-center rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 outline-none pointer-events-auto transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </ContextMenu>
              </div>
            )}
          </div>
        )}
      </Draggable>
    );
  };

  const hasRootContent = rootFolders.length > 0 || rootItems.length > 0;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="">
        <ExplorerToolbar
          targetFolderLabel={selectedFolderName}
          onCreateFolder={() => void handleCreateFolderAction(selectedFolderId ?? null)}
          onCreateCard={() => void handleCreateCardAction(selectedFolderId ?? null)}
          onAddFile={handleToolbarAddFile}
          selectedFolderId={selectedFolderId}
        />

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
            {rootFolders.map(folder => renderFolder(folder, 0))}
            {rootItems.length > 0 && (
              <div className="mt-1">
                <div className="px-2 py-1 text-[11px] text-slate-400">ルート</div>
                <Droppable droppableId={DnDHelpers.createCardListDroppableId(ROOT_FOLDER_ID)}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn("min-h-[2px] block")}>
                      {(() => {
                        let rootCardIndex = 0;
                        return rootItems.map((item) => (
                          item.type === 'card'
                            ? renderCard(item.data, 0, rootCardIndex++)
                            : renderDocument(item.data, 0, 0)
                        ));
                      })()}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
