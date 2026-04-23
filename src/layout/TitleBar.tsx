import { TREE_VIEW_SIDEBAR_TOGGLE_EVENT } from "@/components/folder/hooks/useTreeViewSidebar";
import { MetaPanelToggleIcon } from "@/components/card/shell/MetaPanelToggleIcon";
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

const CalendarIcon: React.FC = () => (
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
      y="5"
      width="16"
      height="15"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8 3V7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M16 3V7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M4 9H20"
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
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="8"
      stroke="currentColor"
      strokeWidth="1.8"
    />
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

const ForwardIcon: React.FC = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
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

const TitleBarPrimaryActions: React.FC<{
  noDragStyle?: React.CSSProperties;
}> = ({ noDragStyle }) => {
  const navigate = useNavigate();

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 pr-2.5"
      style={noDragStyle}
    >
      <TitleBarToolbarButton
        title="サイドバーを開閉"
        onClick={() => {
          window.dispatchEvent(new Event(TREE_VIEW_SIDEBAR_TOGGLE_EVENT));
        }}
        noDragStyle={noDragStyle}
      >
        <SectionListIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton
        title="メニュー"
        disabled
        noDragStyle={noDragStyle}
      >
        <MenuIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton
        title="検索"
        onClick={focusFirstSearchField}
        noDragStyle={noDragStyle}
      >
        <SearchIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton title="カレンダー" noDragStyle={noDragStyle}>
        <CalendarIcon />
      </TitleBarToolbarButton>

      <TitleBarToolbarButton title="グローバル" disabled noDragStyle={noDragStyle}>
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