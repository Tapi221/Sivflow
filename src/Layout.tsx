import React, { useEffect, Suspense, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import SettingsDialog from '@/Components/settings/SettingsDialog';
import { SyncStatusIndicator } from '@/Components/sync/SyncStatusIndicator';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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
    { name: 'Dashboard', label: '学習', icon: Home },
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
    <div className="min-h-screen">
      <ThemeManager />

      {/* Desktop Sync Indicator (Fixed Top Right) */}
      <div className="hidden md:flex fixed top-4 right-4 z-50">
        {!['StudyMode'].includes(currentPageName) && (
            <SyncStatusIndicator 
                showText={true} 
                className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm px-3 py-1.5 rounded-full"
            />
        )}
      </div>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 select-none">
            <BookOpen className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-lg text-slate-800">単語カード</span>
          </Link>
          
           <div className="flex items-center gap-2">
            {!['StudyMode'].includes(currentPageName) && (
                <SyncStatusIndicator 
                    showText={false} // Compact for mobile
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
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="hidden md:flex fixed top-4 left-4 z-[45] w-12 h-12 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-slate-50 items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-600/30 hover:scale-105 transition-all active:scale-95"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-white border-r border-slate-50 flex-col z-40 shadow-sm transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-20 mb-2"></div> {/* Spacer for toggle button */}
        
        <nav className="flex-1 px-2.5 space-y-4">
          <Link
            to={createPageUrl('Dashboard')}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all select-none group ${
              currentPageName === 'Dashboard'
                ? 'text-primary-600 bg-primary-50' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-[11px] font-bold">学習</span>
          </Link>

          <Link
             to={createPageUrl('Folders')}
             className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all select-none group ${
              ['Folders', 'FolderView'].includes(currentPageName)
                ? 'text-primary-600 bg-primary-50' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             }`}
          >
            <Folder className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-[11px] font-bold">フォルダ</span>
          </Link>

          <Link
             to={createPageUrl('Gallery')}
             className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all select-none group ${
               currentPageName === 'Gallery'
                 ? 'text-primary-600 bg-primary-50'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             }`}
          >
            <Globe className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-[11px] font-bold">ギャラリー</span>
          </Link>

          <Link
             to={createPageUrl('Calendar')}
             className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all select-none group ${
               currentPageName === 'Calendar'
                 ? 'text-primary-600 bg-primary-50'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             }`}
          >
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-[11px] font-bold">予定表</span>
          </Link>

          <Link
             to={createPageUrl('Statistics')}
             className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all select-none group ${
               currentPageName === 'Statistics'
                 ? 'text-primary-600 bg-primary-50'
                 : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
             }`}
          >
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-[11px] font-bold">統計</span>
          </Link>
        </nav>
        
        {/* Sidebar Footer (Sync + User) */}
        <div 
          className="p-4 border-t border-slate-100 flex flex-col items-center gap-4"
          onMouseEnter={() => setIsUserNameHovered(true)}
          onMouseLeave={() => setIsUserNameHovered(false)}
        >
            {/* User Icon */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{ backgroundColor: avatarBg }}
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
                <span style={{ color: avatarText }} className="text-sm font-bold group-hover:scale-110 transition-transform">
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
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-md shadow-lg border border-slate-100 text-[10px] text-slate-600 font-bold z-50 whitespace-pre-wrap text-center min-w-[max-content] max-w-[150px]"
                        style={{ width: 'max-content' }}
                    >
                        {settings?.displayName || 'UserName'}
                    </span>
                )}
            </div>
        </div>
      </aside>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      
      {/* Mobile Bottom Navigation - Keep simple for now but match style light */}
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
        <div className="flex items-center justify-around py-2">
            {navItems.filter(item => item.name !== 'WorldMap').map(item => (
                <Link 
                    key={item.name}
                    to={createPageUrl(item.name)} 
                    className={`flex flex-col items-center gap-1 px-3 py-1 select-none transition-colors ${
                        currentPageName === item.name
                            ? 'text-primary-600' 
                            : 'text-slate-400'
                    }`}
                >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
            ))}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className={`pt-14 md:pt-0 pb-24 md:pb-10 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'md:ml-24' : 'md:ml-0'
      }`}>
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
