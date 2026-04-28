import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { APP_CHROME } from "@/config/appChrome";
import { useBreadcrumbExtraCrumbs } from "@/contexts/BreadcrumbContext";
import {
  buildRouteBreadcrumbs,
  mergeTitleBarBreadcrumbs,
} from "@/features/breadcrumbs/builders";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import { useHasDesktopBridge } from "@/hooks/platform/useHasDesktopBridge";
import { cn } from "@/lib/utils";
import { windowControls } from "@/platform/capabilities/windowControls";
import { APP_DESKTOP_TOP_INSET_PX } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { auth } from "@/services/firebase";
import { signOut } from "firebase/auth";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

type WindowControlButtonProps = {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  noDragStyle?: React.CSSProperties;
  children: React.ReactNode;
};

type TitleBarBreadcrumbsProps = {
  pathname: string;
  baseCrumbs: BreadcrumbCrumb[];
  extraCrumbs: BreadcrumbCrumb[];
  noDragStyle?: React.CSSProperties;
};

type AppRegionStyle = React.CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

const TITLE_BAR_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "drag",
};

const TITLE_BAR_NO_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "no-drag",
};

const TITLE_BAR_BREADCRUMB_ITEM_CLASS = "titlebar-breadcrumb-item truncate";

const TITLE_BAR_MENU_ITEM_CLASS =
  "flex h-8 cursor-pointer select-none items-center gap-2 rounded-[5px] px-2 text-[13px] text-[#1a1a18] outline-none hover:bg-[#f1efe8] focus:bg-[#f1efe8] active:bg-[#eae8e0] [&>svg]:shrink-0 [&>svg]:text-[#888780]";

const WindowControlButton: React.FC<WindowControlButtonProps> = ({
  title,
  onClick,
  disabled = false,
  danger = false,
  noDragStyle,
  children,
}) => {
  const disabledClassName = disabled
    ? "cursor-default opacity-60 hover:bg-transparent hover:text-current"
    : danger
      ? "hover:bg-[#E81123] hover:text-white"
      : "titlebar-hover";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseDown={(event) => event.stopPropagation()}
      disabled={disabled}
      style={noDragStyle}
      className={cn(
        "titlebar-text flex h-full w-[46px] items-center justify-center transition-colors",
        disabledClassName,
      )}
      title={title}
      aria-label={title}
      aria-disabled={disabled}
      tabIndex={disabled ? undefined : -1}
    >
      {children}
    </button>
  );
};

const MenuIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 7H20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M4 12H20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M4 17H20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const GlobeIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M4.5 12H19.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M12 4C14.2 6.1 15.5 8.95 15.5 12C15.5 15.05 14.2 17.9 12 20C9.8 17.9 8.5 15.05 8.5 12C8.5 8.95 9.8 6.1 12 4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsMenuIcon: React.FC = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 0 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 0 1 10.08 21V20.91A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.18 19.73L7.12 19.79A2 2 0 0 1 4.29 16.96L4.35 16.9A1.65 1.65 0 0 0 4.68 15.08A1.65 1.65 0 0 0 3.17 14H3A2 2 0 0 1 3 10H3.09A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.21 7.12A2 2 0 0 1 7.04 4.29L7.1 4.35A1.65 1.65 0 0 0 8.92 4.68A1.65 1.65 0 0 0 10 3.17V3A2 2 0 0 1 14 3V3.09A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.82 4.27L16.88 4.21A2 2 0 0 1 19.71 7.04L19.65 7.1A1.65 1.65 0 0 0 19.32 8.92A1.65 1.65 0 0 0 20.83 10H21A2 2 0 0 1 21 14H20.91A1.65 1.65 0 0 0 19.4 15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashMenuIcon: React.FC = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 6H21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M19 6L18 20A2 2 0 0 1 16 22H8A2 2 0 0 1 6 20L5 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 11V17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M14 11V17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9 6V4A1 1 0 0 1 10 3H14A1 1 0 0 1 15 4V6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutMenuIcon: React.FC = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M9 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 17L21 12L16 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 12H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M15 5L8 12L15 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ForwardIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M9 5L16 12L9 19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MinimizeIcon: React.FC = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M1 5H9"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const MaximizeIcon: React.FC = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="1"
      width="8"
      height="8"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const RestoreIcon: React.FC = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M3 1H9V7" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1 3H7V9H1V3Z" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M1 1L9 9M9 1L1 9"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const TitleBarToolbarButton: React.FC<{
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  noDragStyle?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ title, onClick, disabled = false, noDragStyle, children }) => {
  const disabledClassName = disabled
    ? "cursor-default opacity-60 hover:bg-transparent hover:text-current"
    : "titlebar-hover";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={disabled ? undefined : onClick}
      onMouseDown={(event) => event.stopPropagation()}
      disabled={disabled}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      style={noDragStyle}
      className={cn(
        "titlebar-text inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors [&>svg]:scale-[1.06]",
        disabledClassName,
      )}
    >
      {children}
    </button>
  );
};

const TitleBarPrimaryActions: React.FC<{
  noDragStyle?: React.CSSProperties;
}> = ({ noDragStyle }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openSettings = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("settings", "true");
    setSearchParams(nextParams, { replace: true });
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 pr-2.5"
      style={noDragStyle}
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            title="メニュー"
            aria-label="メニュー"
            onMouseDown={(event) => event.stopPropagation()}
            style={noDragStyle}
            className={cn(
              "titlebar-text inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors [&>svg]:scale-[1.06]",
              "titlebar-hover",
            )}
          >
            <MenuIcon />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            style={noDragStyle}
            className={cn(
              "z-[9999] w-[148px] rounded-[10px] border border-[var(--floating-menu-border)] bg-white p-[3px]",
              "shadow-[0_4px_20px_rgba(0,0,0,0.09),0_1px_3px_rgba(0,0,0,0.05)]",
            )}
          >
            <DropdownMenu.Item
              onSelect={openSettings}
              className={TITLE_BAR_MENU_ITEM_CLASS}
            >
              <SettingsMenuIcon />
              <span>設定</span>
              <span className="ml-auto flex items-center text-[11px] text-[#b8b7b0]">
                Ctrl+,
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
              }}
              className={TITLE_BAR_MENU_ITEM_CLASS}
            >
              <GlobeIcon />
              <span>言語</span>
              <span className="ml-auto flex items-center text-[13px] leading-none text-[#b8b7b0]">
                ›
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={() => {
                void navigate("/trash");
              }}
              className={TITLE_BAR_MENU_ITEM_CLASS}
            >
              <TrashMenuIcon />
              <span>ごみ箱</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-[3px] h-px bg-[#e5e4dd]" />

            <DropdownMenu.Item
              onSelect={() => {
                void handleLogout();
              }}
              className={TITLE_BAR_MENU_ITEM_CLASS}
            >
              <LogoutMenuIcon />
              <span>ログアウト</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <TitleBarToolbarButton
        title="グローバル"
        disabled
        noDragStyle={noDragStyle}
      >
        <GlobeIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton
        title="戻る"
        onClick={() => {
          void navigate(-1);
        }}
        noDragStyle={noDragStyle}
      >
        <BackIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton
        title="進む"
        onClick={() => {
          void navigate(1);
        }}
        noDragStyle={noDragStyle}
      >
        <ForwardIcon />
      </TitleBarToolbarButton>
    </div>
  );
};

const TitleBarBreadcrumbs = React.memo(
  ({
    pathname,
    baseCrumbs,
    extraCrumbs,
    noDragStyle,
  }: TitleBarBreadcrumbsProps) => {
    const navigate = useNavigate();

    const allCrumbs = useMemo(
      () =>
        mergeTitleBarBreadcrumbs({
          pathname,
          baseCrumbs,
          extraCrumbs,
        }),
      [baseCrumbs, extraCrumbs, pathname],
    );

    const handleBreadcrumbNavigateClick = (
      event: React.MouseEvent<HTMLButtonElement>,
      crumb: BreadcrumbCrumb,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (!crumb.to) return;
      void navigate(crumb.to);
    };

    const visibleCrumbs = allCrumbs.filter((crumb, index) => {
      const isLeadingHomeCrumb = index === 0 && crumb.label === "ホーム";
      if (!isLeadingHomeCrumb) return true;
      return allCrumbs.length <= 1;
    });

    return (
      <nav className="titlebar-text flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-[13px] leading-5">
        {visibleCrumbs.map((crumb, index) => {
          const isClickable = Boolean(crumb.to);
          const breadcrumbContent = crumb.label;

          return (
            <React.Fragment
              key={`${crumb.label}:${crumb.to ?? "no-to"}:${crumb.folderId ?? "no-folder"}:${index}`}
            >
              {index > 0 && (
                <span className="titlebar-divider mx-0.5 select-none opacity-45">
                  /
                </span>
              )}

              {isClickable ? (
                <button
                  type="button"
                  className={cn(
                    TITLE_BAR_BREADCRUMB_ITEM_CLASS,
                    "titlebar-hover titlebar-breadcrumb-link",
                  )}
                  style={noDragStyle}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) =>
                    handleBreadcrumbNavigateClick(event, crumb)
                  }
                  title={crumb.label}
                >
                  {breadcrumbContent}
                </button>
              ) : (
                <span
                  className={cn(
                    TITLE_BAR_BREADCRUMB_ITEM_CLASS,
                    "titlebar-breadcrumb-current",
                  )}
                  title={crumb.label}
                  aria-current="page"
                >
                  {breadcrumbContent}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  },
);

TitleBarBreadcrumbs.displayName = "TitleBarBreadcrumbs";

const WindowControlGroup: React.FC<{
  hasDesktopBridge: boolean;
  isMaximized: boolean;
  noDragStyle?: React.CSSProperties;
}> = ({ hasDesktopBridge, isMaximized, noDragStyle }) => {
  return (
    <div className="titlebar-text flex h-full items-center" style={noDragStyle}>
      <WindowControlButton
        title={hasDesktopBridge ? "最小化" : "ブラウザでは最小化できません"}
        onClick={() => void windowControls.minimize()}
        disabled={!hasDesktopBridge}
        noDragStyle={noDragStyle}
      >
        <MinimizeIcon />
      </WindowControlButton>

      <WindowControlButton
        title={
          hasDesktopBridge
            ? isMaximized
              ? "元に戻す"
              : "最大化"
            : "ブラウザでは最大化できません"
        }
        onClick={() => void windowControls.maximizeToggle()}
        disabled={!hasDesktopBridge}
        noDragStyle={noDragStyle}
      >
        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
      </WindowControlButton>

      <WindowControlButton
        title={hasDesktopBridge ? "閉じる" : "ブラウザでは閉じられません"}
        onClick={() => void windowControls.close()}
        disabled={!hasDesktopBridge}
        danger
        noDragStyle={noDragStyle}
      >
        <CloseIcon />
      </WindowControlButton>
    </div>
  );
};

export const TitleBar: React.FC = () => {
  const [bridgeIsMaximized, setBridgeIsMaximized] = useState(false);
  const hasDesktopBridge = useHasDesktopBridge();
  const presentationTarget = usePresentationTarget();
  const isDesktopPresentation = presentationTarget === "desktop";
  const { pathname, search } = useLocation();
  const baseCrumbs = useMemo(
    () => buildRouteBreadcrumbs({ pathname, search }),
    [pathname, search],
  );
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const shouldShowBrandLabel = APP_CHROME.desktopTitleBar.showBrandLabel;
  const isFoldersPage = pathname.toLowerCase().startsWith("/folders");

  useEffect(() => {
    if (!hasDesktopBridge) return;

    void windowControls.isMaximized().then(setBridgeIsMaximized);

    const cleanup = windowControls.onMaximizedStateChange(
      (maximized: boolean) => {
        setBridgeIsMaximized(maximized);
      },
    );

    return () => {
      cleanup();
    };
  }, [hasDesktopBridge]);

  if (!isDesktopPresentation) return null;

  const isMaximized = hasDesktopBridge && bridgeIsMaximized;
  const dragStyle = hasDesktopBridge ? TITLE_BAR_DRAG_STYLE : undefined;
  const noDragStyle = hasDesktopBridge ? TITLE_BAR_NO_DRAG_STYLE : undefined;

  if (isFoldersPage) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 z-50 flex shrink-0 select-none items-center justify-end bg-transparent pr-3 text-sm titlebar-text",
        )}
        style={{
          height: `${APP_DESKTOP_TOP_INSET_PX}px`,
        }}
      >
        <div
          className="pointer-events-auto flex h-full items-center"
          style={noDragStyle}
        >
          <TitleBarPrimaryActions noDragStyle={noDragStyle} />
          <WindowControlGroup
            hasDesktopBridge={hasDesktopBridge}
            isMaximized={isMaximized}
            noDragStyle={noDragStyle}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "surface-flat-titlebar",
        "flex w-full shrink-0 select-none items-center justify-between bg-transparent px-4 text-sm titlebar-text",
      )}
      style={{
        ...dragStyle,
        zIndex: 20,
        height: `${APP_DESKTOP_TOP_INSET_PX}px`,
      }}
    >
      <div
        className={cn(
          "flex h-full min-w-0 items-center pl-2 pr-3",
          shouldShowBrandLabel && "gap-2",
        )}
        style={noDragStyle}
      >
        <TitleBarPrimaryActions noDragStyle={noDragStyle} />

        {shouldShowBrandLabel ? (
          <span className="titlebar-text-strong shrink-0 text-xs font-semibold tracking-wide">
            {APP_CHROME.brandLabel}
          </span>
        ) : null}

        <TitleBarBreadcrumbs
          pathname={pathname}
          baseCrumbs={baseCrumbs}
          extraCrumbs={extraCrumbs}
          noDragStyle={noDragStyle}
        />
      </div>

      <WindowControlGroup
        hasDesktopBridge={hasDesktopBridge}
        isMaximized={isMaximized}
        noDragStyle={noDragStyle}
      />
    </div>
  );
};
