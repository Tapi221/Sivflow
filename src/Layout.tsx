import React, { useEffect, Suspense } from 'react';
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
  Settings
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useSettingsQueryParam } from '@/hooks/useSettingsQueryParam';
import { useReviewCount } from '@/hooks/useReviewCount';
import { useKatexLoader } from '@/hooks/useKatexLoader';

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
  const { settings } = useUserSettings();

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
    if (path === '') return 'Folders';
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
  const showMobileHeader = currentPageName === 'Folders';

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
          <Link to={createPageUrl('Folders')} className="flex items-center gap-2 select-none">
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
