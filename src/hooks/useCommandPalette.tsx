/**
 * コマンドパレット（Quick Open / Global Search）の状態管理とショートカット
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface CommandPaletteContextType {
  // Quick Open (Ctrl+P)
  isQuickOpenOpen: boolean;
  openQuickOpen: () => void;
  closeQuickOpen: () => void;
  
  // Global Search (Ctrl+Shift+F)
  isGlobalSearchOpen: boolean;
  openGlobalSearch: (initialQuery?: string, initialTagFilter?: string) => void;
  closeGlobalSearch: () => void;
  globalSearchInitialQuery: string;
  globalSearchInitialTagFilter: string;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isQuickOpenOpen, setQuickOpenOpen] = useState(false);
  const [isGlobalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
  const [globalSearchInitialTagFilter, setGlobalSearchInitialTagFilter] = useState('');

  const openQuickOpen = useCallback(() => {
    setGlobalSearchOpen(false);
    setQuickOpenOpen(true);
  }, []);

  const closeQuickOpen = useCallback(() => {
    setQuickOpenOpen(false);
  }, []);

  const openGlobalSearch = useCallback((initialQuery?: string, initialTagFilter?: string) => {
    setQuickOpenOpen(false);
    setGlobalSearchInitialQuery(initialQuery || '');
    setGlobalSearchInitialTagFilter(initialTagFilter || '');
    setGlobalSearchOpen(true);
  }, []);

  const closeGlobalSearch = useCallback(() => {
    setGlobalSearchOpen(false);
    setGlobalSearchInitialQuery('');
    setGlobalSearchInitialTagFilter('');
  }, []);

  // グローバルショートカットの監視
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // 入力フィールド中は無効（ただしダイアログが開いている場合は処理）
      const isInputFocused = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      
      // Ctrl/Cmd + P: Quick Open
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p' && !event.shiftKey) {
        // ダイアログが開いている場合は閉じる、そうでなければ開く
        if (isQuickOpenOpen) {
          event.preventDefault();
          closeQuickOpen();
          return;
        }
        
        // 入力フィールド中でなければ開く
        if (!isInputFocused) {
          event.preventDefault();
          openQuickOpen();
          return;
        }
      }
      
      // Ctrl/Cmd + Shift + F: Global Search
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        // ダイアログが開いている場合は閉じる、そうでなければ開く
        if (isGlobalSearchOpen) {
          event.preventDefault();
          closeGlobalSearch();
          return;
        }
        
        // 入力フィールド中でなければ開く
        if (!isInputFocused) {
          event.preventDefault();
          openGlobalSearch();
          return;
        }
      }
      
      // Escape: 開いているダイアログを閉じる
      if (event.key === 'Escape') {
        if (isQuickOpenOpen) {
          closeQuickOpen();
          return;
        }
        if (isGlobalSearchOpen) {
          closeGlobalSearch();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickOpenOpen, isGlobalSearchOpen, openQuickOpen, closeQuickOpen, openGlobalSearch, closeGlobalSearch]);

  const value: CommandPaletteContextType = {
    isQuickOpenOpen,
    openQuickOpen,
    closeQuickOpen,
    isGlobalSearchOpen,
    openGlobalSearch,
    closeGlobalSearch,
    globalSearchInitialQuery,
    globalSearchInitialTagFilter,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}
