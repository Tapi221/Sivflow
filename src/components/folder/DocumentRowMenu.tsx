import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ExternalLink, Pencil, Trash2, Pin } from "@/ui/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getLocalDb } from "@/services/localDB";
import platform from "@/platform";
import { cn } from "@/lib/utils";
import type { Card, DocumentItem } from "@/types";

type NotePdfMeta = {
  id: string;
  name: string;
  remoteUrl: string | null;
  storagePath: string | null;
  contentType: string;
  size: number;
};

type FolderLike = {
  id?: string;
  folderId?: string;
  folderName?: string;
  folder_name?: string;
  isDeleted?: boolean;
  is_deleted?: boolean;
  notePdfs?: NotePdfMeta[];
  note_pdfs?: NotePdfMeta[];
};

interface DocumentRowMenuProps {
  doc: DocumentItem;
  folders: unknown[];
  cards: Card[];
  documents: DocumentItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdateFolder?: (folderId: string, data: unknown) => Promise<void>;
  isPinned?: boolean;
  onTogglePin?: () => void;
  children: React.ReactNode;
}

const asFolderLike = (value: unknown): FolderLike | null => {
  if (!value || typeof value !== "object") return null;
  return value as FolderLike;
};

const getFolderId = (folder: unknown): string | null => {
  const f = asFolderLike(folder);
  return f?.id ?? f?.folderId ?? null;
};

const getFolderName = (folder: unknown): string => {
  const f = asFolderLike(folder);
  return f?.folderName ?? f?.folder_name ?? "";
};

const getFolderNotePdfs = (folder: unknown): NotePdfMeta[] => {
  const f = asFolderLike(folder);
  const value = f?.notePdfs ?? f?.note_pdfs ?? [];
  return Array.isArray(value) ? (value as NotePdfMeta[]) : [];
};

const isSoftDeleted = (
  item?: { isDeleted?: boolean; is_deleted?: boolean } | null,
) => Boolean(item?.isDeleted ?? item?.is_deleted);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

export function DocumentRowMenu({
  doc,
  folders,
  cards,
  documents,
  open,
  onOpenChange,
  onUpdateFolder,
  isPinned = false,
  onTogglePin,
  children,
}: DocumentRowMenuProps) {
  const { currentUser } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isControlled = typeof open === "boolean";
  const menuOpen = isControlled ? open : internalOpen;

  const setMenuOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const enabledFolders = useMemo(
    () => folders.filter((folder) => !isSoftDeleted(asFolderLike(folder))),
    [folders],
  );

  const getNextOrderIndex = (folderId: string) => {
    let maxOrder = -1;

    for (const card of cards) {
      if (card.folderId !== folderId || isSoftDeleted(card)) continue;
      const order = card.orderIndex ?? -1;
      if (order > maxOrder) maxOrder = order;
    }

    for (const document of documents) {
      if (
        document.folderId !== folderId ||
        isSoftDeleted(document) ||
        document.id === doc.id
      ) {
        continue;
      }
      const order = document.orderIndex ?? -1;
      if (order > maxOrder) maxOrder = order;
    }

    return maxOrder + 1;
  };

  const getDocDisplayName = () => {
    const legacy = doc as DocumentItem & { name?: string };
    return doc.title || doc.fileName || legacy.name || "無題のドキュメント";
  };

  const buildNotePdfMeta = (name: string): NotePdfMeta => ({
    id: doc.id,
    name,
    remoteUrl: doc.remoteUrl ?? doc.localUrl ?? doc.downloadUrl ?? null,
    storagePath: doc.storagePath ?? null,
    contentType: doc.mimeType ?? "application/pdf",
    size: doc.sizeBytes ?? 0,
  });

  const updateNotePdfName = async (folderId: string, name: string) => {
    if (!onUpdateFolder) return;
    const folder = enabledFolders.find((f) => getFolderId(f) === folderId);
    if (!folder) return;

    const existing = getFolderNotePdfs(folder);
    const next = existing.map((pdf) =>
      pdf.id === doc.id ? { ...pdf, name } : pdf,
    );

    await onUpdateFolder(folderId, { notePdfs: next, note_pdfs: next });
  };

  const removeNotePdfFromFolder = async (folderId: string) => {
    if (!onUpdateFolder) return;
    const folder = enabledFolders.find((f) => getFolderId(f) === folderId);
    if (!folder) return;

    const existing = getFolderNotePdfs(folder);
    const next = existing.filter((pdf) => pdf.id !== doc.id);
    if (next.length === existing.length) return;

    await onUpdateFolder(folderId, { notePdfs: next, note_pdfs: next });
  };

  const addNotePdfToFolder = async (folderId: string, name: string) => {
    if (!onUpdateFolder) return;
    const folder = enabledFolders.find((f) => getFolderId(f) === folderId);
    if (!folder) return;

    const existing = getFolderNotePdfs(folder);
    const next = [...existing, buildNotePdfMeta(name)];

    await onUpdateFolder(folderId, { notePdfs: next, note_pdfs: next });
  };

  const handleRename = async () => {
    setMenuOpen(false);

    const currentName = getDocDisplayName();
    const nextName = window.prompt(
      "新しいドキュメント名を入力してください",
      currentName,
    );
    if (!nextName || !nextName.trim() || nextName.trim() === currentName) {
      return;
    }

    if (!currentUser) {
      toastError("認証が必要です");
      return;
    }

    try {
      const db = await getLocalDb(currentUser.uid);
      await db.updateItem("documents", doc.id, {
        title: nextName.trim(),
        updatedAt: new Date(),
      });
      await updateNotePdfName(doc.folderId, nextName.trim());
      toastSuccess?.("ドキュメント名を更新しました");
    } catch (err: unknown) {
      console.error("[DocumentRowMenu] rename failed", err);
      toastError(getErrorMessage(err, "ドキュメント名の変更に失敗しました"));
    }
  };

  const handleMove = async () => {
    setMenuOpen(false);

    const targetFolderName = window.prompt(
      "移動先のフォルダ名を入力してください(完全一致)",
    );
    if (!targetFolderName) return;

    const targetFolder = enabledFolders.find(
      (folder) => getFolderName(folder) === targetFolderName,
    );
    if (!targetFolder) {
      window.alert("フォルダが見つかりませんでした。");
      return;
    }

    const targetFolderId = getFolderId(targetFolder);
    if (!targetFolderId || targetFolderId === doc.folderId) return;

    if (!currentUser) {
      toastError("認証が必要です");
      return;
    }

    try {
      const db = await getLocalDb(currentUser.uid);
      const nextOrderIndex = getNextOrderIndex(targetFolderId);

      await db.updateItem("documents", doc.id, {
        folderId: targetFolderId,
        orderIndex: nextOrderIndex,
        updatedAt: new Date(),
      });

      const name = getDocDisplayName();
      await removeNotePdfFromFolder(doc.folderId);
      await addNotePdfToFolder(targetFolderId, name);
      toastSuccess?.("ドキュメントを移動しました");
    } catch (err: unknown) {
      console.error("[DocumentRowMenu] move failed", err);
      toastError(getErrorMessage(err, "ドキュメントの移動に失敗しました"));
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);

    if (!window.confirm("このドキュメントを削除しますか?")) return;

    if (!currentUser) {
      toastError("認証が必要です");
      return;
    }

    try {
      const db = await getLocalDb(currentUser.uid);
      await db.softDelete("documents", doc.id);
      await removeNotePdfFromFolder(doc.folderId);
    } catch (err: unknown) {
      console.error("[DocumentRowMenu] delete failed", err);
      toastError(getErrorMessage(err, "ドキュメントの削除に失敗しました"));
    }
  };

  const handleOpenNewTab = () => {
    setMenuOpen(false);

    const url = doc.remoteUrl ?? doc.localUrl ?? doc.downloadUrl;
    if (url) {
      void platform.shell.openExternal(url);
    } else {
      toastError("PDFのURLが見つかりません");
    }
  };

  const handleTogglePinClick = () => {
    setMenuOpen(false);
    onTogglePin?.();
  };

  const menuItemClassName =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[#202123] hover:bg-slate-100";
  const destructiveMenuItemClassName =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <div
        onClick={() => setMenuOpen(!menuOpen)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setMenuOpen(!menuOpen);
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {children}
      </div>

      {menuOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-black/10 bg-white p-1 shadow-lg"
          role="menu"
        >
          {onTogglePin && (
            <button
              type="button"
              onClick={handleTogglePinClick}
              className={menuItemClassName}
            >
              <Pin className={cn("h-4 w-4", isPinned && "text-amber-500")} />
              {isPinned ? "ピン留めを外す" : "ピン留めに追加"}
            </button>
          )}

          <button
            type="button"
            onClick={handleRename}
            className={menuItemClassName}
          >
            <Pencil className="h-4 w-4" />
            名前を変更
          </button>

          <button
            type="button"
            onClick={handleMove}
            className={menuItemClassName}
          >
            <ArrowRight className="h-4 w-4" />
            移動
          </button>

          <div className="my-1 h-px bg-black/10" />

          <button
            type="button"
            onClick={handleOpenNewTab}
            className={menuItemClassName}
          >
            <ExternalLink className="h-4 w-4" />
            新しいタブで開く
          </button>

          <div className="my-1 h-px bg-black/10" />

          <button
            type="button"
            onClick={handleDelete}
            className={destructiveMenuItemClassName}
          >
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
}
