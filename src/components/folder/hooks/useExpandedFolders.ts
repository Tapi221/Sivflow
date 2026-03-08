import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "folder_expandedFolders";

function loadFromStorage(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? new Set<string>(JSON.parse(saved) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function useExpandedFolders() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    loadFromStorage,
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(expandedFolders)),
    );
  }, [expandedFolders]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const expandFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  }, []);

  return { expandedFolders, setExpandedFolders, toggleFolder, expandFolder };
}




