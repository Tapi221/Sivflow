import { TREE_VIEW_SIDEBAR_TOGGLE_EVENT } from "@/components/folder/hooks/useTreeViewSidebar";
import { MetaPanelToggleIcon } from "@/components/card/shell/MetaPanelToggleIcon";
import { floatingPanelPresets } from "@/components/ui/menu-styles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { APP_CHROME } from "@/config/appChrome";
import { useBreadcrumbExtraCrumbs } from "@/contexts/BreadcrumbContext";
import {
  buildRouteBreadcrumbs,
  mergeTitleBarBreadcrumbs,
} from "@/features/breadcrumbs/builders";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import {
  dispatchCardSetViewWindowEvent,
  subscribeCardSetViewWindowEvent,
} from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { useHasDesktopBridge } from "@/hooks/platform/useHasDesktopBridge";
import { cn } from "@/lib/utils";
import { windowControls } from "@/platform/capabilities/windowControls";
import { APP_DESKTOP_TOP_INSET_PX } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_SECTIONS } from "./sidebarNavigation";

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

const HOME_MENU_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);
const HOME_MENU_PANEL_PRESET = floatingPanelPresets.menu;
const HOME_MENU_WIDTH_CLASS = "w-[208px]";
const HOME_MENU_ITEM_CLASS = "h-8";

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
    xmlns="http://www.w3.org/2000/svg"
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

const SectionListIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="12"
      rx="1.75"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M10 6V18"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      cx="11"
      cy="11"
      r="6.25"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M16 16L20 20"
      stroke="currentColor"
      strokeWidth="1.8"
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
    xmlns="http://www.w3.org/2000/svg"
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

const HomeIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="shrink-0"
  >
    <path
      d="M3 10.25L12 3L21 10.25"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.25 9.5V19.5H18.75V9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TitleBarToolbarButton: React.FC<{
  title: string;
  onClick?: () => void;
  noDragStyle?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ title, onClick, noDragStyle, children }) => {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseDown={(event) => event.stopPropagation()}
      style={noDragStyle}
      className="titlebar-hover titlebar-text inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
    >
      {children}
    </button>
  );
};

const focusFirstSearchField = () => {
  if (typeof document === "undefined") {
    return;
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      [
        'input[type="search"]',
        'input[placeholder*="検索"]',
        'input[aria-label*="検索"]',
        'textarea[placeholder*="検索"]',
        'textarea[aria-label*="検索"]',
      ].join(","),
    ),
  );

  const target = candidates.find((element) => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      !element.hasAttribute("disabled") &&
      element.offsetParent !== null
    );
  });

  if (!target) {
    return;
  }

  target.focus();
  if ("select" in target) {
    target.select();
  }
};

const TitleBarHomeMenuButton: React.FC<{
  noDragStyle?: React.CSSProperties;
}> = ({ noDragStyle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);

  const isHomeOnlyMode =
    location.pathname.toLowerCase() === "/folders" &&
    new URLSearchParams(location.search).get("home") === "1";

  useEffect(() => {
    setIsHomeMenuOpen(false);
  }, [location.pathname, location.search]);

  const handleOpenSettings = () => {
    const next = new URLSearchParams(location.search);
    next.set("settings", "true");
    next.set("settingsTab", "study");
    void navigate({ search: `?${next.toString()}` });
  };

  const isHomeMenuItemActive = (to: string) => {
    if (to === "/folders") {
      return location.pathname.toLowerCase() === "/folders" && !isHomeOnlyMode;
    }
    return location.pathname.toLowerCase() === to.toLowerCase();
  };

  return (
    <Popover open={isHomeMenuOpen} onOpenChange={setIsHomeMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="ホームメニューを開く"
          aria-label="ホームメニューを開く"
          aria-haspopup="menu"
          aria-expanded={isHomeMenuOpen}
          onMouseDown={(event) => event.stopPropagation()}
          style={noDragStyle}
          className="titlebar-hover titlebar-text inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        >
          <HomeIcon />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className={cn(
          HOME_MENU_PANEL_PRESET.className,
          HOME_MENU_WIDTH_CLASS,
          "rounded-2xl p-1 shadow-[0_8px_24px_rgba(15,23,42,0.10)]",
        )}
        surface={HOME_MENU_PANEL_PRESET.surface}
        style={noDragStyle}
      >
        <div className="flex flex-col gap-0">
          {HOME_MENU_ITEMS.map((item) => {
            const active = isHomeMenuItemActive(item.to);

            return (
              <button
                key={item.to}
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => {
                  setIsHomeMenuOpen(false);
                  void navigate(item.to);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium transition-colors",
                  HOME_MENU_ITEM_CLASS,
                  active
                    ? "bg-[rgba(55,53,47,0.08)] text-[rgba(55,53,47,0.96)]"
                    : "text-[rgba(55,53,47,0.78)] hover:bg-[rgba(55,53,47,0.045)] hover:text-[rgba(55,53,47,0.96)]",
                )}
              >
                <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center text-[rgba(55,53,47,0.68)]">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="my-1 border-t border-[rgba(55,53,47,0.07)]" />

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => {
            setIsHomeMenuOpen(false);
            handleOpenSettings();
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-medium text-[rgba(55,53,47,0.78)] transition-colors hover:bg-[rgba(55,53,47,0.045)] hover:text-[rgba(55,53,47,0.96)]",
            HOME_MENU_ITEM_CLASS,
          )}
        >
          <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center text-[rgba(55,53,47,0.68)]">
            <TitleBarMenuSettingsIcon />
          </span>
          <span className="truncate">設定</span>
        </button>
      </PopoverContent>
    </Popover>
  );
};

const TitleBarPrimaryActions: React.FC<{
  noDragStyle?: React.CSSProperties;
}> = ({ noDragStyle }) => {
  const navigate = useNavigate();

  return (
    <div className="flex shrink-0 items-center gap-1 pr-2" style={noDragStyle}>
      <TitleBarToolbarButton
        title="サイドバーを開閉"
        onClick={() => {
          window.dispatchEvent(new Event(TREE_VIEW_SIDEBAR_TOGGLE_EVENT));
        }}
        noDragStyle={noDragStyle}
      >
        <MenuIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton
        title="フォルダー一覧へ移動"
        onClick={() => {
          void navigate("/folders?view=section-list");
        }}
        noDragStyle={noDragStyle}
      >
        <SectionListIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton
        title="検索欄へ移動"
        onClick={focusFirstSearchField}
        noDragStyle={noDragStyle}
      >
        <SearchIcon />
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

      <TitleBarHomeMenuButton noDragStyle={noDragStyle} />
    </div>
  );
};

const TitleBarMenuSettingsIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.364 3.636L11.3 4.7M4.7 11.3L3.636 12.364M12.364 12.364L11.3 11.3M4.7 4.7L3.636 3.636"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

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

      if (!crumb.to) {
        return;
      }

      void navigate(crumb.to);
    };

    const visibleCrumbs = allCrumbs.filter((crumb, index) => {
      const isLeadingHomeCrumb = index === 0 && crumb.label === "ホーム";
      if (!isLeadingHomeCrumb) {
        return true;
      }
      return allCrumbs.length <= 1;
    });

    return (
      <nav className="titlebar-text flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs">
        {visibleCrumbs.map((crumb, index) => {
          const isClickable = Boolean(crumb.to);
          const breadcrumbContent = crumb.label;

          return (
            <React.Fragment
              key={`${crumb.label}:${crumb.to ?? "no-to"}:${crumb.folderId ?? "no-folder"}:${index}`}
            >
              {index > 0 && (
                <span className="titlebar-divider select-none">/</span>
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
                  onClick={(event) => handleBreadcrumbNavigateClick(event, crumb)}
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

export const TitleBar: React.FC = () => {
  const [bridgeIsMaximized, setBridgeIsMaximized] = useState(false);
  const [isCardSetViewEditing, setIsCardSetViewEditing] = useState(false);
  const [isCardSetViewMetaOpen, setIsCardSetViewMetaOpen] = useState(false);
  const hasDesktopBridge = useHasDesktopBridge();
  const presentationTarget = usePresentationTarget();
  const isDesktopPresentation = presentationTarget === "desktop";
  const { pathname, search } = useLocation();
  const baseCrumbs = useMemo(
    () => buildRouteBreadcrumbs({ pathname, search }),
    [pathname, search],
  );
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const isCardSetViewPage = pathname.toLowerCase().startsWith("/cardsetview");
  const shouldShowBrandLabel = APP_CHROME.desktopTitleBar.showBrandLabel;

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

  const isMaximized = hasDesktopBridge && bridgeIsMaximized;

  useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.editingChange,
      (isEditing) => {
        setIsCardSetViewEditing(Boolean(isEditing));
      },
    );
  }, []);

  useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.metaOpenChange,
      (isOpen) => {
        setIsCardSetViewMetaOpen(Boolean(isOpen));
      },
    );
  }, []);

  if (!isDesktopPresentation) return null;

  const dragStyle = hasDesktopBridge ? TITLE_BAR_DRAG_STYLE : undefined;
  const noDragStyle = hasDesktopBridge ? TITLE_BAR_NO_DRAG_STYLE : undefined;

  return (
    <div
      className={cn(
        "surface-flat-titlebar",
        "flex w-full shrink-0 select-none items-center justify-between",
        "border-x-0 border-t-0 rounded-none border-b border-[rgba(229,229,227,0.9)] bg-transparent px-4 text-sm titlebar-text",
      )}
      style={{
        ...dragStyle,
        zIndex: 20,
        height: `${APP_DESKTOP_TOP_INSET_PX}px`,
      }}
    >
      <div
        className={cn(
          "flex h-full min-w-0 items-center px-2",
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

      <div
        className="titlebar-text flex h-full items-center"
        style={noDragStyle}
      >
        {isCardSetViewPage && (
          <>
            {isCardSetViewEditing && (
              <button
                type="button"
                onClick={() =>
                  dispatchCardSetViewWindowEvent(
                    CARD_SET_VIEW_EVENTS.createCardRequest,
                    undefined,
                  )
                }
                className="titlebar-hover titlebar-text flex h-full w-[46px] items-center justify-center transition-colors"
                title="新規カードを追加"
                aria-label="新規カードを追加"
                tabIndex={-1}
                style={noDragStyle}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 4H15C16.1046 4 17 4.89543 17 6V18C17 19.1046 16.1046 20 15 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 9V15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 12H15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17 8H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18.5 6.5V9.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                dispatchCardSetViewWindowEvent(
                  CARD_SET_VIEW_EVENTS.toggleEditingRequest,
                  undefined,
                )
              }
              className="titlebar-hover titlebar-text flex h-full w-[46px] items-center justify-center transition-colors"
              title={
                isCardSetViewEditing
                  ? "閲覧モードに切り替え"
                  : "編集モードに切り替え"
              }
              tabIndex={-1}
              style={noDragStyle}
            >
              {isCardSetViewEditing ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 12C2 12 5.8 6 12 6C18.2 6 22 12 22 12C22 12 18.2 18 12 18C5.8 18 2 12 2 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 20H21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16.5 3.5C17.3284 2.67157 18.6716 2.67157 19.5 3.5C20.3284 4.32843 20.3284 5.67157 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                dispatchCardSetViewWindowEvent(
                  CARD_SET_VIEW_EVENTS.toggleMetaPanelRequest,
                  undefined,
                )
              }
              className="titlebar-hover titlebar-text flex h-full w-[46px] items-center justify-center transition-colors"
              title={
                isCardSetViewMetaOpen
                  ? "メタパネルを閉じる"
                  : "メタパネルを開く"
              }
              aria-label={
                isCardSetViewMetaOpen
                  ? "メタパネルを閉じる"
                  : "メタパネルを開く"
              }
              tabIndex={-1}
              style={noDragStyle}
            >
              <MetaPanelToggleIcon
                open={isCardSetViewMetaOpen}
                width="14"
                height="14"
              />
            </button>
          </>
        )}

        <WindowControlButton
          title={hasDesktopBridge ? "最小化" : "ブラウザでは最小化できません"}
          onClick={() => void windowControls.minimize()}
          disabled={!hasDesktopBridge}
          noDragStyle={noDragStyle}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 5H9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </WindowControlButton>

        <WindowControlButton
          title={
            hasDesktopBridge
              ? isMaximized
                ? "元に戻す"
                : "最大化"
              : "ブラウザではウィンドウ制御できません"
          }
          onClick={() => void windowControls.maximizeToggle()}
          disabled={!hasDesktopBridge}
          noDragStyle={noDragStyle}
        >
          {isMaximized ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 1H9V7" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 3H7V9H1V3Z" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
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
          )}
        </WindowControlButton>

        <WindowControlButton
          title={
            hasDesktopBridge ? "閉じる" : "ブラウザでは閉じる操作を提供しません"
          }
          onClick={() => void windowControls.close()}
          disabled={!hasDesktopBridge}
          noDragStyle={noDragStyle}
          danger
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </WindowControlButton>
      </div>
    </div>
  );
};
