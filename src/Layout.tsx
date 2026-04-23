import React, { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import SettingsDialog from "@/components/settings/SettingsDialog";
import { cn } from "@/lib/utils";
import { UI_TYPO } from "@/styles/tokens/typography";
import { useSettingsQueryParam } from "@/hooks/settings/useSettingsQueryParam";
import { useKatexLoader } from "@/hooks/platform/useKatexLoader";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { getAppTopInsetPx } from "@/platform/presentation/shellMetrics";
import { SecurityAlertBanner } from "./components/security/SecurityAlertBanner";
import { LocalDBStatusBanner } from "./components/security/LocalDBStatusBanner";
import { AppLayout } from "./layout/AppLayout";
import { TitleBar } from "./layout/TitleBar";

const Layout = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFoldersRoute = /^\/folders(?:\/|$)/i.test(location.pathname);
  const presentationTarget = usePresentationTarget();
  const isDesktopPresentation = presentationTarget === "desktop";
  const appTopInsetPx = getAppTopInsetPx({ presentationTarget });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  const { isSettingsOpen, settingsTab, setIsSettingsOpen } =
    useSettingsQueryParam(searchParams, setSearchParams);

  useKatexLoader();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const shouldLockPageScroll = isDesktopPresentation && isFoldersRoute;

    document.documentElement.classList.toggle(
      "no-page-scroll",
      shouldLockPageScroll,
    );

    return () => {
      if (!shouldLockPageScroll) return;
      document.documentElement.classList.remove("no-page-scroll");
    };
  }, [isDesktopPresentation, isFoldersRoute]);

  return (
    <div
      className={cn(
        "relative flex flex-col h-[100dvh] w-full overflow-hidden",
        UI_TYPO,
      )}
      data-presentation-target={presentationTarget}
      style={
        {
          "--app-top-inset": `${appTopInsetPx}px`,
          backgroundColor: "var(--app-bg)",
        } as React.CSSProperties
      }
    >
      <TitleBar />

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        initialTab={settingsTab ?? "study"}
      />

      <LocalDBStatusBanner />
      <SecurityAlertBanner />

      <AppLayout />
    </div>
  );
};

export default Layout;
