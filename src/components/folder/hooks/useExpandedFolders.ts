import { useCallback, useEffect, useState } from "react";
import { WEB_STORAGE_KEYS } from "@constants/web/storage";

const loadFromStorage = (storageKey: string) => {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? new Set<string>(JSON.parse(saved) as string[]) : new Set();
  } catch {
    return new Set();
  }
};

export const useExpandedFolders = (
  storageKey: string = WEB_STORAGE_KEYS.expandedFolders,
) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() =>
    loadFromStorage(storageKey),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(expandedFolders)),
    );
  }, [expandedFolders, storageKey]);

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
};
