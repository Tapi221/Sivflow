import { useState, useCallback } from "react";

export const useActiveTab = (initialTabId?: string) => {
  const [activeTabId, setActiveTabId] = useState<string | null>(
    initialTabId ?? null,
  );

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const clearActiveTab = useCallback(() => {
    setActiveTabId(null);
  }, []);

  return {
    activeTabId,
    setActiveTab,
    clearActiveTab,
  };
};
