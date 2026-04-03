import { useState, useCallback, useRef } from "react";

export const useExplorerDialogs = () => {
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
  const setEditingIdSynced = useCallback((id: string | null) => {
    setEditingId(id);
    editingIdRef.current = id;
  }, []);

  const setEditingNameSynced = useCallback((name: string) => {
    setEditingName(name);
    editingNameRef.current = name;
  }, []);

  // row menu
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

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
    // bulk tag
    bulkTagFolderId,
    setBulkTagFolderId,
  };
};
