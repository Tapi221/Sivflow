import React, { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";
import { cn } from "@/lib/utils";
import { UI_TYPO } from "@/styles/tokens/typography";
import { useSettingsQueryParam } from "@/hooks/settings/useSettingsQueryParam";
import { useKatexLoader } from "@/hooks/platform/useKatexLoader";
import { SecurityAlertBanner } from "./components/security/SecurityAlertBanner";
import { LocalDBStatusBanner } from "./components/security/LocalDBStatusBanner";
import { AppLayout } from "./layout/AppLayout";
import { TitleBar } from "./layout/TitleBar";
import { isDesktopRuntime } from "@/platform/runtime";

const Layout = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    if (!isFoldersRoute) {
      document.documentElement.classList.remove("no-page-scroll");
    }
  }, [isFoldersRoute, location.pathname]);

  const { isSettingsOpen, settingsTab, setIsSettingsOpen } =
    useSettingsQueryParam(searchParams, setSearchParams);

  const isStudyModePage = /^\/study(?:\/|$)/i.test(location.pathname);

  useKatexLoader();

  const isDesktop = isDesktopRuntime();

  return (
    <div
      className={cn(
        "relative flex h-[100dvh] w-full overflow-hidden",
        UI_TYPO,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[9999]">
        <div className="pointer-events-auto">
          <TitleBar />
        </div>
      </div>

      <div
        className={cn(
          "hidden md:flex fixed right-2 z-50",
          isDesktop ? "top-10" : "top-1",
        )}
      >
        {!isStudyModePage && <SyncStatusIndicator />}
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        initialTab={settingsTab ?? "study"}
      />

      <LocalDBStatusBanner />
      <SecurityAlertBanner />

      <div className="min-h-0 flex-1">
        <AppLayout />
      </div>
    </div>
  );
};

export default Layout;