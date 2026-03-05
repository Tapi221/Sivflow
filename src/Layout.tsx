import React, { useEffect, Suspense } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import { cn } from "@/lib/utils";
import { UI_TYPO } from "@/styles/tokens/typography";
import { useSettingsQueryParam } from "@/hooks/useSettingsQueryParam";
import { useKatexLoader } from "@/hooks/useKatexLoader";

import { ThemeManager } from "@/components/common/ThemeManager";
import { SecurityAlertBanner } from "./components/security/SecurityAlertBanner";
import { LocalDBStatusBanner } from "./components/security/LocalDBStatusBanner";

// ... (existing imports)

export default function Layout() {
  // ... (existing logic)

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(location.pathname);
  const isCardEditRoute = /^\/cardedit(?:\/|$)/i.test(location.pathname);

  // ページ遷移時にスクロール位置をリセット
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  // 安全策: Folders以外ではページスクロール固定クラスを必ず解除する
  useEffect(() => {
    if (!isFoldersRoute) {
      document.documentElement.classList.remove("no-page-scroll");
    }
  }, [isFoldersRoute, location.pathname]);

  const { isSettingsOpen, settingsTab, setIsSettingsOpen } =
    useSettingsQueryParam(searchParams, setSearchParams);

  // Determine currentPageName from location pathname
  const currentPageName = React.useMemo(() => {
    const path = location.pathname.substring(1); // remove leading slash
    if (path === "") return "Folders";
    if (path === "study") return "StudyMode";
    if (path === "uncertain") return "UncertainMode";
    if (path === "today-study") return "TodayStudy";
    if (path === "gallery") return "Gallery";
    if (path === "calendar") return "Calendar";
    // Default capitalize for others which match component names largely
    return path.charAt(0).toUpperCase() + path.slice(1);
  }, [location.pathname]);

  useKatexLoader();

  const isStudyModePage = currentPageName === "StudyMode";

  return (
    <div
      className={cn(
        "relative flex h-[100dvh] w-full flex-col overflow-hidden",
        UI_TYPO,
      )}
    >
      <ThemeManager />

      {/* Desktop Sync Indicator (Fixed Top Right) */}
      <div className="hidden md:flex fixed top-1 right-2 z-50">
        {!["StudyMode"].includes(currentPageName) && <SyncStatusIndicator />}
      </div>

      {/* Mobile Header intentionally disabled */}

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        initialTab={settingsTab ?? "account"}
      />

      {/* Main Content */}
      <main
        className={cn(
          "md:ml-0 flex min-h-0 flex-1 flex-col transition-[margin] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        )}
      >
        <LocalDBStatusBanner />
        <SecurityAlertBanner />
        <div
          className={cn(
            "flex-1 min-h-0",
            isFoldersRoute || isCardEditRoute || isStudyModePage
              ? "overflow-hidden"
              : "overflow-y-auto",
            isFoldersRoute || isCardEditRoute || isStudyModePage ? "" : "pb-10",
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
        <p className="text-primary-600 font-bold tracking-[0.3em] text-[10px] opacity-40">
          LOADING
        </p>
      </div>
    </div>
  );
}
