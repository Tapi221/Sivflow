import { useState, useCallback, useRef } from "react";

export function useExplorerDialogs() {
  // rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editingIdRef = useRef<string | null>(null);
  const editingNameRef = useRef("");
  const renameCancelledRef = useRef(false);

  const closeRename = useCallback(() => {
    setEditingId(null);
    setEditingName("");
    editingIdRef.current = null;
    editingNameRef.current = "";
    renameCancelledRef.current = false;
  }, []);

  // sync refs with state
  const setEditingIdSynced = useCallback(
    (id: string | null) => {
      setEditingId(id);
      editingIdRef.current = id;
    },
    [],
  );

  const setEditingNameSynced = useCallback((name: string) => {
    setEditingName(name);
    editingNameRef.current = name;
  }, []);

  // row menu
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  // delete folder dialog
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [deleteTargetFolderId, setDeleteTargetFolderId] = useState<
    string | null
  >(null);

  const openDeleteFolderDialog = useCallback((folderId: string) => {
    setDeleteTargetFolderId(folderId);
    setDeleteFolderDialogOpen(true);
  }, []);

  const handleDeleteFolderDialogOpenChange = useCallback((nextOpen: boolean) => {
    setDeleteFolderDialogOpen(nextOpen);
    if (!nextOpen) setDeleteTargetFolderId(null);
  }, []);

  // bulk tag
  const [bulkTagFolderId, setBulkTagFolderId] = useState<string | null>(null);

  return {
    // rename
    editingId,
    setEditingId,
    editingName,
    setEditingName,
    editingIdRef,
    editingNameRef,
    renameCancelledRef,
    closeRename,
    setEditingIdSynced,
    setEditingNameSynced,
    // row menu
    openRowMenuId,
    setOpenRowMenuId,
    // delete folder
    deleteFolderDialogOpen,
    deleteTargetFolderId,
    openDeleteFolderDialog,
    handleDeleteFolderDialogOpenChange,
    // bulk tag
    bulkTagFolderId,
    setBulkTagFolderId,
  };
}




