import React, { useEffect, Suspense, useState, useMemo } from 'react';
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
  BarChart3, 
  Trash2,
  HelpCircle,
  Menu,
  User,
  Settings
} from 'lucide-react';
import Globe from 'lucide-react/dist/esm/icons/globe';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { createPageUrl } from '@/utils';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getAvatarColors, getInitials } from '@/utils/avatarUtils';
import { useProfileImageMonitor } from '@/hooks/useProfileImageMonitor';

import { ThemeManager } from '@/Components/common/ThemeManager';
import { SecurityAlertBanner } from './Components/security/SecurityAlertBanner';

// ... (existing imports)

export default function Layout() {
  // ... (existing logic)


  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
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
  
  const isSettingsOpen = searchParams.get('settings') === 'true';
  const setIsSettingsOpen = (open: boolean) => {
    const newParams = new URLSearchParams(searchParams);
    if (open) {
        newParams.set('settings', 'true');
    } else {
        newParams.delete('settings');
    }
    setSearchParams(newParams, { replace: true });
  };
  const [isUserNameHovered, setIsUserNameHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const location = useLocation();
  const { currentUser } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  
  // Activate auto-repair monitor
  useProfileImageMonitor();


  // --- Review Count Logic ---
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();

  const reviewCount = useMemo(() => {
    if (!cards || !folders || cardsLoading || foldersLoading) return 0;

    // Filter out deleted cards and hidden folders
    const validFolderIds = new Set(folders.map(f => f.id || f.folderId));
    const hiddenFolderIds = new Set(folders.filter(f => f.isHidden).map(f => f.id || f.folderId));
    
    const activeCards = cards.filter(card => {
        if (card.isDeleted) return false;
        const cardFolderId = card.folderId;
        if (cardFolderId && !validFolderIds.has(cardFolderId)) return false;
        if (cardFolderId && hiddenFolderIds.has(cardFolderId)) return false;
        return true;
    });

    const todayCards = activeCards.filter(card => {
        if (card.isDraft) return false;
        if (!card.nextReviewDate) return false;
        
        let reviewDate = card.nextReviewDate;
        if (typeof reviewDate?.toDate === 'function') {
        reviewDate = reviewDate.toDate();
        } else if (!(reviewDate instanceof Date)) {
        reviewDate = new Date(reviewDate);
        }
        
        if (isNaN(reviewDate.getTime())) return false;

        const today = new Date();
        // Reset time components for accurate date comparison
        const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const autoCarryOver = settings?.autoCarryOver ?? true;

        if (autoCarryOver) {
            // Include past due dates
            return rDate <= tDate;
        } else {
            // Only strictly today
            return rDate.getTime() === tDate.getTime();
        }
    });

    return todayCards.length;
  }, [cards, folders, cardsLoading, foldersLoading, settings?.autoCarryOver]);
  
  // Determine currentPageName from location pathname
  const currentPageName = React.useMemo(() => {
    const path = location.pathname.substring(1); // remove leading slash
    if (path === '') return 'Dashboard';
    // Handle paths with params or sub-paths if necessary, currently simple matching
    const knownPages = ['Dashboard', 'Folders', 'FolderView', 'CardEdit', 'CardView', 'study', 'uncertain', 'calendar', 'statistics', 'trash', 'WorldMap'];
    // Simple mapping: capitalize first letter or match known names
    // For now, let's try to match exact route names used in navItems
    if (path === 'study') return 'StudyMode';
    if (path === 'uncertain') return 'UncertainMode';
    
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
    { name: 'WorldMap', label: 'マップ', icon: MapIcon },
    { name: 'Gallery', label: 'ギャラリー', icon: Globe },
    { name: 'Calendar', label: '予定表', icon: Calendar },
    { name: 'Statistics', label: '統計', icon: BarChart3 },
  ];
  
  // Hide navigation on certain pages
  const hideNav = ['CardEdit', 'CardView'].includes(currentPageName);
  // Helper for dynamic colors
  const { bg: avatarBg, text: avatarText } = React.useMemo(() => 
    getAvatarColors(settings?.displayName), 
    [settings?.displayName]
  );

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
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 select-none">
            <BookOpen className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-lg text-slate-800">単語カード</span>
            {reviewCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {reviewCount > 99 ? '99+' : reviewCount}
                </span>
            )}
          </Link>
          
           <div className="flex items-center gap-2">
            {!['StudyMode'].includes(currentPageName) && (
                <SyncStatusIndicator 
                    dropdownAlign="end"
                />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Desktop Toggle Button */}
      <button
        onClick={() => handleSidebarToggle(!isSidebarOpen)}
        title={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        className="hidden md:flex fixed top-1 left-1.5 z-[45] w-9 h-9 bg-white rounded-xl shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] border border-slate-100 items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-600/30 hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:scale-95"
      >
        <Menu className={cn(
            "w-6 h-6 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            isSidebarOpen ? "rotate-0" : "rotate-180"
        )} />
      </button>
      
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 w-[72px] flex-col z-40 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'bg-white border-r border-slate-50 shadow-sm'
        )}
      >
        <div className="h-10 mb-2"></div> {/* Spacer for toggle button */}
        
        <nav className="flex-1 px-3 space-y-5">
          <Link
            to={createPageUrl('Dashboard')}
            onClick={() => handleSidebarToggle(false)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl transition-all select-none group hover:scale-105 active:scale-95 relative",
              currentPageName === 'Dashboard'
                ? 'text-primary-600 bg-primary-50 shadow-sm ring-1 ring-primary-100'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            )}
          >
            <div className="relative">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:rotate-12" />
                {reviewCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm">
                        {reviewCount > 99 ? '99+' : reviewCount}
                    </span>
                )}
            </div>
            <span className="text-[10px] md:text-[11px] font-bold">学習</span>
          </Link>

          <Link
             to={createPageUrl('Folders')}
             onClick={() => handleSidebarToggle(false)}
             className={cn(
               "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl transition-all select-none group hover:scale-105 active:scale-95",
               ['Folders', 'FolderView'].includes(currentPageName)
                 ? 'text-primary-600 bg-primary-50 shadow-sm ring-1 ring-primary-100' 
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             )}
          >
            <Folder className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:-rotate-12" />
            <span className="text-[10px] md:text-[11px] font-bold">フォルダ</span>
          </Link>

          <Link
             to={createPageUrl('Gallery')}
             onClick={() => handleSidebarToggle(false)}
             className={cn(
               "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl transition-all select-none group hover:scale-105 active:scale-95",
               currentPageName === 'Gallery'
                 ? 'text-primary-600 bg-primary-50 shadow-sm ring-1 ring-primary-100'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             )}
          >
            <Globe className="w-5 h-5 md:w-6 md:h-6 animate-spin-slow [animation-play-state:paused] group-hover:[animation-play-state:running]" />
            <span className="text-[10px] md:text-[11px] font-bold whitespace-nowrap">ギャラリー</span>
          </Link>

          <Link
             to={createPageUrl('Calendar')}
             onClick={() => handleSidebarToggle(false)}
             className={cn(
               "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl transition-all select-none group hover:scale-105 active:scale-95",
               currentPageName === 'Calendar'
                 ? 'text-primary-600 bg-primary-50 shadow-sm ring-1 ring-primary-100'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             )}
          >
            <Calendar className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:bounce-slow" />
            <span className="text-[10px] md:text-[11px] font-bold">予定表</span>
          </Link>

          <Link
             to={createPageUrl('Statistics')}
             onClick={() => handleSidebarToggle(false)}
             className={cn(
               "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl transition-all select-none group hover:scale-105 active:scale-95",
               currentPageName === 'Statistics'
                 ? 'text-primary-600 bg-primary-50 shadow-sm ring-1 ring-primary-100'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             )}
          >
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110" />
            <span className="text-[10px] md:text-[11px] font-bold">統計</span>
          </Link>
        </nav>
        
        {/* Sidebar Footer (Sync + User) */}
        <div 
          className={cn(
            "p-4 flex flex-col items-center gap-4",
            ['Folders', 'FolderView'].includes(currentPageName)
              ? 'border-t border-white/40'
              : 'border-t border-slate-100'
          )}
          onMouseEnter={() => setIsUserNameHovered(true)}
          onMouseLeave={() => setIsUserNameHovered(false)}
        >
            {/* User Icon */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{ '--avatar-bg': avatarBg, backgroundColor: 'var(--avatar-bg)' } as React.CSSProperties}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:ring-2 hover:ring-primary-600/30 transition-all select-none group overflow-hidden shadow-sm"
            >
              {(settings?.profileImage?.remoteUrl || settings?.profileImage?.localUrl) && !imgError ? (
                <img 
                  src={settings.profileImage.remoteUrl || settings.profileImage.localUrl} 
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
                  className="text-sm font-bold group-hover:scale-110 transition-transform"
                >
                  {getInitials(settings?.displayName)}
                </span>
              )}
            </button>
            <div className="relative w-full flex justify-center">
                {/* Placeholder for layout stability */}
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-full px-1 opacity-100">
                    {(settings?.displayName || 'UserName').length > 5 
                        ? `${(settings?.displayName || 'UserName').slice(0, 5)}...` 
                        : (settings?.displayName || 'UserName')}
                </span>

                {/* Absolute Full Text Overlay on Hover */}
                {isUserNameHovered && (settings?.displayName || 'UserName').length > 5 && (
                    <span 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-md shadow-lg border border-slate-100 text-[10px] text-slate-600 font-bold z-50 whitespace-pre-wrap text-center min-w-[max-content] max-w-[150px] w-max"
                    >
                        {settings?.displayName || 'UserName'}
                    </span>
                )}
            </div>
        </div>
      </aside>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} initialTab="account" />
      
      {/* Mobile Bottom Navigation - Keep simple for now but match style light */}
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
        <div className="flex items-center justify-around py-2">
            {navItems.filter(item => item.name !== 'WorldMap').map(item => (
                <Link 
                    key={item.name}
                    to={createPageUrl(item.name)} 
                    className={`flex flex-col items-center gap-1 px-3 py-1 select-none transition-colors relative ${
                        currentPageName === item.name
                            ? 'text-primary-600' 
                            : 'text-slate-400'
                    }`}
                >
                    <div className="relative">
                        <item.icon className="w-5 h-5" />
                        {item.badge && item.badge > 0 && (
                             <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full min-w-[14px] text-center border border-white">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
            ))}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className={cn(
        "transition-[margin] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        // Remove all padding for Folders page (work view)
        location.pathname.includes('/Folders') ? '' : 'pt-14 md:pt-0 pb-24 md:pb-10',
        isSidebarOpen ? 'md:ml-[72px]' : 'md:ml-0'
      )}>
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
