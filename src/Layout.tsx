import React, { useEffect, Suspense, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SettingsDialog from '@/components/settings/SettingsDialog';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { cn } from '@/lib/utils';
import { UI_TYPO } from '@/styles/typography';
// Added hooks for review count
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';

import {
  Folder, 
  BookOpen, 
  Calendar, 
  Menu,
  Settings
} from 'lucide-react';
import ImagesIcon from 'lucide-react/dist/esm/icons/images';
import { useAuth } from '@/contexts/AuthContext';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsQueryParam } from '@/hooks/useSettingsQueryParam';
import { useSidebarOverlay } from '@/hooks/useSidebarOverlay';
import { useReviewCount } from '@/hooks/useReviewCount';
import { useKatexLoader } from '@/hooks/useKatexLoader';
import { getAvatarColors, getInitials } from '@/utils/avatarUtils';

import { useHeaderCompact } from '@/hooks/useHeaderCompact';

import { ThemeManager } from '@/components/common/ThemeManager';
import { SecurityAlertBanner } from './components/security/SecurityAlertBanner';
import { LocalDBStatusBanner } from './components/security/LocalDBStatusBanner';

// ... (existing imports)

export default function Layout() {
  // ... (existing logic)

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(location.pathname);
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(location.pathname);
  const hasFoldersDetailQuery = Boolean(
    searchParams.get('folderId') || searchParams.get('cardId') || searchParams.get('docId')
  );

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
  
  const { isSettingsOpen, settingsTab, setIsSettingsOpen } = useSettingsQueryParam(searchParams, setSearchParams);
  const [imgError, setImgError] = useState(false);
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();

  // Reset imgError when remoteUrl changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [settings?.profileImage, settings?.profileImage?.remoteUrl, settings?.profileImage?.updatedAt]);

  // ヘッダー縮小状態の管理（モバイルのみ）
  const isHeaderCompact = useHeaderCompact(32, 8);

  // --- Review Count Logic ---
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { reviewCount } = useReviewCount({
    settings,
    cards,
    cardsLoading,
    folders,
    foldersLoading,
  });
  
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

  useKatexLoader();

  const isStudyModePage = currentPageName === 'StudyMode';
  const isCardEditPage = currentPageName === 'CardEdit';
  const canUseSidebarNav = !isStudyModePage && !isCardEditPage;
  const canUseSidebarNavUi = canUseSidebarNav && !isSettingsOpen;
  const shouldHideGlobalSidebarToggle = isFoldersRoute && hasFoldersDetailQuery;
  const {
    isSidebarOpen,
    handleSidebarToggle,
    closeSidebar,
    sidebarToggleButtonRef,
    sidebarPanelRef,
    firstSidebarNavLinkRef,
  } = useSidebarOverlay({
    canUseSidebarNavUi,
    locationPathname: location.pathname,
    isSettingsOpen,
  });
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
  }, [handleSidebarToggle, isSidebarOpen]);
  const showMobileHeader = currentPageName === 'Dashboard';
  const overlayNavItemBaseClass =
    "group relative w-full h-12 rounded-xl px-3 flex items-center justify-start gap-3 text-left select-none text-slate-600 transition-all duration-200 hover:bg-slate-100/80 hover:text-slate-800";
  const overlayNavItemActiveClass =
    "bg-gradient-to-r from-primary-50/90 to-sky-50/90 text-slate-900 font-semibold shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]";

  // Helper for dynamic colors
  const { bg: avatarBg, text: avatarText } = React.useMemo(() => 
    getAvatarColors(settings?.displayName), 
    [settings?.displayName]
  );
  const profileRemoteUrl = settings?.profileImage?.remoteUrl ?? null;
  const profileImageIsBlob = typeof profileRemoteUrl === 'string' && profileRemoteUrl.startsWith('blob:');
  const hasValidProfileImage = !!profileRemoteUrl && !profileImageIsBlob && !imgError;

  return (
    <div className={cn("relative flex h-[100dvh] w-full flex-col overflow-hidden", UI_TYPO)}>
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
      {canUseSidebarNavUi && !isSidebarOpen && !shouldHideGlobalSidebarToggle && (
      <button
        ref={sidebarToggleButtonRef}
        onClick={() => handleSidebarToggle(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar-overlay"
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
               ['Folders'].includes(currentPageName)
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

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} initialTab={settingsTab ?? 'account'} />



      {/* Main Content */}
      <main className={cn(
        "md:ml-0 flex min-h-0 flex-1 flex-col transition-[margin] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      )}>
        <LocalDBStatusBanner />
        <SecurityAlertBanner />
        <div
          className={cn(
            "flex-1 min-h-0",
            isFoldersRoute || isCardEditRoute || isStudyModePage
              ? "overflow-hidden"
              : "overflow-y-auto",
            isFoldersRoute || isCardEditRoute || isStudyModePage
              ? ""
              : showMobileHeader
                ? "pt-14 md:pt-0 pb-10"
                : "pb-10"
          )}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </div>
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
