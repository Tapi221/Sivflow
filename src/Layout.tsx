import React, { useEffect, Suspense, useState, useMemo, useRef, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import SettingsDialog from '@/Components/settings/SettingsDialog';
import { SyncStatusIndicator } from '@/Components/sync/SyncStatusIndicator';
import { cn } from '@/lib/utils';
// Added hooks for review count
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { 
  Home, 
  Folder, 
  BookOpen, 
  Calendar, 
  Trash2,
  HelpCircle,
  Menu,
  User,
  Settings
} from 'lucide-react';
import Globe from 'lucide-react/dist/esm/icons/globe';
import ImagesIcon from 'lucide-react/dist/esm/icons/images';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getAvatarColors, getInitials } from '@/utils/avatarUtils';

import { useHeaderCompact } from '@/hooks/useHeaderCompact';

import { ThemeManager } from '@/Components/common/ThemeManager';
import { SecurityAlertBanner } from './Components/security/SecurityAlertBanner';
import { LocalDBStatusBanner } from './Components/security/LocalDBStatusBanner';

// ... (existing imports)

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object') {
    const seconds =
      typeof value.seconds === 'number'
        ? value.seconds
        : typeof value._seconds === 'number'
          ? value._seconds
          : null;
    const nanoseconds =
      typeof value.nanoseconds === 'number'
        ? value.nanoseconds
        : typeof value._nanoseconds === 'number'
          ? value._nanoseconds
          : 0;
    if (seconds !== null) {
      const d = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const isCardDeleted = (card: any) =>
  Boolean(card?.isDeleted ?? card?.is_deleted ?? card?.deleted ?? card?.deletedAt ?? card?.deleted_at);

const isCardDraft = (card: any) => Boolean(card?.isDraft ?? card?.is_draft);
const isCardSilent = (card: any) => Boolean(card?.isSilent ?? card?.is_silent);

export default function Layout() {
  // ... (existing logic)

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(location.pathname);
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(location.pathname);

  // ページ遷移時にスクロール位置をリセット
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  // 安全策: Folders以外ではページスクロール固定クラスを必ず解除する
  useEffect(() => {
    if (!isFoldersRoute) {
      document.documentElement.classList.remove('no-page-scroll');
    }
  }, [isFoldersRoute, location.pathname]);
  
  // サイドバーの状態をlocalStorageで永続化
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  
  // サイドバーの状態が変更されたらlocalStorageに保存
  const handleSidebarToggle = (open: boolean) => {
    setIsSidebarOpen(open);
    localStorage.setItem('sidebarOpen', String(open));
  };
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    localStorage.setItem('sidebarOpen', 'false');
  }, []);
  
  const isSettingsOpen = searchParams.get('settings') === 'true';
  const setIsSettingsOpen = (open: boolean) => {
    if (open && typeof document !== 'undefined') {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }
    }
    const newParams = new URLSearchParams(searchParams);
    if (open) {
        newParams.set('settings', 'true');
    } else {
        newParams.delete('settings');
    }
    setSearchParams(newParams, { replace: true });
  };
  const [imgError, setImgError] = useState(false);
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();
  const sidebarToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const sidebarPanelRef = useRef<HTMLElement | null>(null);
  const firstSidebarNavLinkRef = useRef<HTMLAnchorElement | null>(null);
  const wasSidebarOpenRef = useRef(isSidebarOpen);
  const previousPathnameRef = useRef(location.pathname);
  const previousBodyOverflowRef = useRef('');
  const previousHtmlOverflowRef = useRef('');

  // Reset imgError when remoteUrl changes
  useEffect(() => {
    setImgError(false);
  }, [settings?.profileImage?.remoteUrl]);

  // Debug: Log profileImage changes (検証用)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Settings] loaded profileImage', settings?.profileImage);
      const remoteUrl = settings?.profileImage?.remoteUrl;
      if (typeof remoteUrl === 'string' && remoteUrl.startsWith('blob:')) {
        console.warn('[Layout] blob remoteUrl detected on render:', remoteUrl);
      }
    }
  }, [settings?.profileImage?.remoteUrl, settings?.profileImage?.updatedAt]);

  // ヘッダー縮小状態の管理（モバイルのみ）
  const isHeaderCompact = useHeaderCompact(32, 8);

  // --- Review Count Logic ---
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const folderMap = useMemo(() => {
    const map = new Map<string, any>();
    folders.forEach((folder: any) => {
      const id = folder?.id ?? folder?.folderId;
      if (id) map.set(String(id), folder);
    });
    return map;
  }, [folders]);

  const reviewCount = useMemo(() => {
    if (!cards || cardsLoading || foldersLoading) return 0;

    const autoCarryOver = settings?.autoCarryOver ?? true;
    const today = new Date();
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return cards.filter((card: any) => {
      if (isCardDeleted(card) || isCardDraft(card) || isCardSilent(card)) return false;

      const dateValue = card?.next_review_date ?? card?.nextReviewDate;
      const reviewDate = toDate(dateValue);
      if (!reviewDate) return false;

      const folderId = card?.folderId ?? card?.folder_id;
      if (folderId !== null && folderId !== undefined && folderId !== '') {
        const normalizedFolderId = String(folderId);
        const folder = folderMap.get(normalizedFolderId);
        if (!folder) return false;
        if (folder?.isDeleted ?? folder?.is_deleted) return false;
      }

      const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      if (autoCarryOver) {
        return rDate <= tDate;
      }
      return rDate.getTime() === tDate.getTime();
    }).length;
  }, [cards, cardsLoading, folderMap, foldersLoading, settings?.autoCarryOver]);
  
  // Determine currentPageName from location pathname
  const currentPageName = React.useMemo(() => {
    const path = location.pathname.substring(1); // remove leading slash
    if (path === '') return 'Dashboard';
    if (path === 'study') return 'StudyMode';
    if (path === 'uncertain') return 'UncertainMode';
    if (path === 'today-study') return 'TodayStudy';
    if (path === 'gallery') return 'Gallery';
    if (path === 'calendar') return 'Calendar';
    // Default capitalize for others which match component names largely
    return path.charAt(0).toUpperCase() + path.slice(1);
  }, [location.pathname]);

  // Sidebar toggle shortcut (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        handleSidebarToggle(!isSidebarOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Handle KaTeX loading
  useEffect(() => {
    if ((window as any).katex) return;
    
    // Load KaTeX CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
    
    // Load KaTeX JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.async = true;
    document.head.appendChild(script);
    
    script.onload = () => {
      const autoRender = document.createElement('script');
      autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
      autoRender.async = true;
      document.head.appendChild(autoRender);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const navItems = [
    { name: 'Dashboard', label: '学習', icon: Home, badge: reviewCount > 0 ? reviewCount : null },
    { name: 'Folders', label: 'フォルダ', icon: Folder },
    { name: 'Gallery', label: 'ギャラリー', icon: Globe },
    { name: 'Calendar', label: '予定表', icon: Calendar },
  ];
  
  const isStudyModePage = currentPageName === 'StudyMode';
  const isCardEditPage = currentPageName === 'CardEdit';
  const canUseSidebarNav = !isStudyModePage && !isCardEditPage;
  const canUseSidebarNavUi = canUseSidebarNav && !isSettingsOpen;
  const showMobileHeader = currentPageName === 'Dashboard';
  const overlayNavItemBaseClass =
    "group relative w-full h-12 rounded-xl px-3 flex items-center justify-start gap-3 text-left select-none text-slate-600 transition-all duration-200 hover:bg-slate-100/80 hover:text-slate-800";
  const overlayNavItemActiveClass =
    "bg-gradient-to-r from-primary-50/90 to-sky-50/90 text-slate-900 font-semibold shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]";

  useEffect(() => {
    if (!canUseSidebarNavUi) return;
    if (typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (isSidebarOpen) {
      previousBodyOverflowRef.current = body.style.overflow;
      previousHtmlOverflowRef.current = html.style.overflow;
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        if (firstSidebarNavLinkRef.current) {
          firstSidebarNavLinkRef.current.focus();
          return;
        }
        sidebarPanelRef.current?.focus();
      });
    } else {
      body.style.overflow = previousBodyOverflowRef.current;
      html.style.overflow = previousHtmlOverflowRef.current;

      if (wasSidebarOpenRef.current) {
        sidebarToggleButtonRef.current?.focus();
      }
    }

    wasSidebarOpenRef.current = isSidebarOpen;

    return () => {
      body.style.overflow = previousBodyOverflowRef.current;
      html.style.overflow = previousHtmlOverflowRef.current;
    };
  }, [canUseSidebarNavUi, isSidebarOpen]);

  useEffect(() => {
    if (!canUseSidebarNavUi || !isSidebarOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      closeSidebar();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [canUseSidebarNavUi, closeSidebar, isSidebarOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    closeSidebar();
  }, [closeSidebar, isSettingsOpen]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = location.pathname;
    if (previousPathname === location.pathname) return;
    const timerId = window.setTimeout(() => {
      closeSidebar();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [closeSidebar, location.pathname]);

  // Helper for dynamic colors
  const { bg: avatarBg, text: avatarText } = React.useMemo(() => 
    getAvatarColors(settings?.displayName), 
    [settings?.displayName]
  );
  const profileRemoteUrl = settings?.profileImage?.remoteUrl ?? null;
  const profileImageIsBlob = typeof profileRemoteUrl === 'string' && profileRemoteUrl.startsWith('blob:');
  const hasValidProfileImage = !!profileRemoteUrl && !profileImageIsBlob && !imgError;

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden relative">
      <ThemeManager />

      {/* Desktop Sync Indicator (Fixed Top Right) */}
      <div className="hidden md:flex fixed top-1 right-2 z-50">
        {!['StudyMode'].includes(currentPageName) && (
            <SyncStatusIndicator />
        )}
      </div>

      {/* Mobile Header */}
      {showMobileHeader && (
      <header 
        data-compact={isHeaderCompact}
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm",
          "transition-[height,padding] duration-200 ease-out",
          "motion-reduce:transition-none",
          isHeaderCompact ? "h-12" : "h-14"
        )}
      >
        <div className={cn(
          "flex items-center justify-between transition-[padding] duration-200 ease-out motion-reduce:transition-none",
          isHeaderCompact ? "px-3 h-12" : "px-4 h-14"
        )}>
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 select-none">
            <BookOpen className={cn(
              "text-primary-600 transition-all duration-200 ease-out motion-reduce:transition-none",
              isHeaderCompact ? "w-5 h-5" : "w-6 h-6"
            )} />
            <span className={cn(
              "font-bold text-slate-800 transition-all duration-200 ease-out motion-reduce:transition-none",
              isHeaderCompact ? "text-base" : "text-lg"
            )}>manifolmia</span>
            {reviewCount > 0 && (
                <span className={cn(
                  "bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  "transition-all duration-200 ease-out motion-reduce:transition-none",
                  isHeaderCompact && "scale-90"
                )}>
                    {reviewCount > 99 ? '99+' : reviewCount}
                </span>
            )}
          </Link>
          
           <div className="flex items-center gap-2">
            {!['StudyMode'].includes(currentPageName) && (
                <SyncStatusIndicator 
                    dropdownAlign="end"
                    compact={isHeaderCompact}
                />
            )}
            {/* フォルダ一覧へのリンク（モバイル） */}
            <Button
              variant="ghost"
              size={isHeaderCompact ? "sm" : "icon"}
              className={cn(
                "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                "transition-all duration-200 ease-out motion-reduce:transition-none",
                isHeaderCompact ? "w-8 h-8" : "w-10 h-10",
                location.pathname.toLowerCase().includes('folder') && "text-primary-600 bg-primary-50"
              )}
              onClick={() => navigate(createPageUrl('Folders'))}
              aria-label="フォルダ一覧"
            >
              <Folder className={cn(
                "transition-all duration-200 ease-out motion-reduce:transition-none",
                isHeaderCompact ? "w-4 h-4" : "w-5 h-5"
              )} />
            </Button>
            <Button 
              variant="ghost" 
              size={isHeaderCompact ? "sm" : "icon"}
              className={cn(
                "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                "transition-all duration-200 ease-out motion-reduce:transition-none",
                isHeaderCompact ? "ml-0.5 w-8 h-8" : "ml-1 w-10 h-10"
              )}
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className={cn(
                "transition-all duration-200 ease-out motion-reduce:transition-none",
                isHeaderCompact ? "w-4 h-4" : "w-5 h-5"
              )} />
            </Button>
          </div>

        </div>
      </header>
      )}
      
      {/* Global Toggle Button (Desktop + Mobile) */}
      {canUseSidebarNavUi && !isSidebarOpen && (
      <button
        ref={sidebarToggleButtonRef}
        onClick={() => handleSidebarToggle(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar-overlay"
        title={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        className="flex fixed top-1 left-1.5 z-[65] w-6 h-6 bg-white rounded-md shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-slate-100 items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-600/30 hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:scale-95"
      >
        <Menu className={cn(
            "w-3.5 h-3.5 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            isSidebarOpen ? "rotate-0" : "rotate-180"
        )} />
      </button>
      )}
      
      {/* Sidebar Backdrop */}
      {canUseSidebarNavUi && (
      <button
        type="button"
        aria-label="サイドバーを閉じる"
        onClick={closeSidebar}
        className={cn(
          "block fixed inset-0 z-[50] bg-black/40 transition-opacity duration-300",
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />
      )}

      {/* Sidebar Panel */}
      {canUseSidebarNavUi && (
      <aside 
        id="app-sidebar-overlay"
        ref={sidebarPanelRef}
        tabIndex={-1}
        aria-hidden={!isSidebarOpen}
        className={cn(
          "flex fixed left-0 top-0 bottom-0 w-[260px] sm:w-[280px] md:w-[300px] max-w-[80vw] flex-col z-[60] transition-transform duration-300 ease-out bg-gradient-to-b from-white to-slate-50/70",
          isSidebarOpen
            ? "translate-x-0 pointer-events-auto border-r border-slate-200 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45),0_10px_24px_-12px_rgba(15,23,42,0.25),inset_-1px_0_0_rgba(255,255,255,0.85)]"
            : "-translate-x-full pointer-events-none border-r border-transparent shadow-none"
        )}
      >
        <div className="shrink-0 px-4 pt-12 pb-2">
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 transition-colors text-left"
          >
            <span
              style={{ '--avatar-bg': avatarBg, backgroundColor: 'var(--avatar-bg)' } as React.CSSProperties}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm"
            >
              {hasValidProfileImage ? (
                <img
                  src={profileRemoteUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('[Layout] Profile image load failed:', e.currentTarget.src);
                    setImgError(true);
                  }}
                />
              ) : (
                <span
                  style={{ '--avatar-text': avatarText, color: 'var(--avatar-text)' } as React.CSSProperties}
                  className="text-sm font-bold"
                >
                  {getInitials(settings?.displayName)}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-700 truncate">
                {settings?.displayName || 'UserName'}
              </span>
              <span className="block text-xs text-slate-400 truncate">
                {currentUser?.email || 'プロフィール設定'}
              </span>
            </span>
          </button>
          <div className="mt-2 border-b border-slate-100" />
        </div>

        <nav className="flex-1 overflow-auto px-3 pt-2 pb-3 space-y-1.5">
          <Link
            ref={firstSidebarNavLinkRef}
            to={createPageUrl('Dashboard')}
            onClick={closeSidebar}
            className={cn(
              overlayNavItemBaseClass,
              currentPageName === 'Dashboard'
                ? overlayNavItemActiveClass
                : ''
            )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white">
              <BookOpen className="h-5 w-5 shrink-0" />
            </span>
            <span className="truncate text-sm">学習</span>
            {reviewCount > 0 ? (
              <span className="ml-auto shrink-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {reviewCount > 99 ? '99+' : reviewCount}
              </span>
            ) : (
              <span className="ml-auto shrink-0" />
            )}
          </Link>

          <Link
             to={createPageUrl('Folders')}
             onClick={closeSidebar}
             className={cn(
               overlayNavItemBaseClass,
               ['Folders', 'FolderView'].includes(currentPageName)
                 ? overlayNavItemActiveClass
                 : ''
             )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white">
              <Folder className="h-5 w-5 shrink-0" />
            </span>
            <span className="truncate text-sm">フォルダ</span>
            <span className="ml-auto shrink-0" />
          </Link>



          <Link
             to={createPageUrl('Gallery')}
             onClick={closeSidebar}
             className={cn(
               overlayNavItemBaseClass,
               currentPageName === 'Gallery'
                 ? overlayNavItemActiveClass
                 : ''
             )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white">
              <ImagesIcon className="h-5 w-5 shrink-0" />
            </span>
            <span className="truncate text-sm">ギャラリー</span>
            <span className="ml-auto shrink-0" />
          </Link>

          <Link
             to={createPageUrl('Calendar')}
             onClick={closeSidebar}
             className={cn(
               overlayNavItemBaseClass,
               currentPageName === 'Calendar'
                 ? overlayNavItemActiveClass
                 : ''
             )}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white">
              <Calendar className="h-5 w-5 shrink-0" />
            </span>
            <span className="truncate text-sm">予定表</span>
            <span className="ml-auto shrink-0" />
          </Link>

        </nav>
      </aside>
      )}

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} initialTab="account" />



      {/* Main Content */}
      <main className={cn(
        "transition-[margin] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        // Remove all padding for Folders page (work view)
        isFoldersRoute || isCardEditRoute || isStudyModePage
          ? ''
          : showMobileHeader
            ? 'pt-14 md:pt-0 pb-10'
            : 'pb-10',
        'md:ml-0'
      )}>
        <LocalDBStatusBanner />
        <SecurityAlertBanner />
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="h-full min-h-[50vh] flex items-center justify-center bg-transparent animate-in fade-in duration-500">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-primary-600/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-primary-600 font-bold tracking-[0.3em] text-[10px] opacity-40">LOADING</p>
      </div>
    </div>
  );
}
