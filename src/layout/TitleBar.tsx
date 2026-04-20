import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { APP_CHROME } from "@/config/appChrome";
import {
  buildRouteBreadcrumbs,
  mergeTitleBarBreadcrumbs,
} from "@/features/breadcrumbs/builders";
import { useHasDesktopBridge } from "@/hooks/platform/useHasDesktopBridge";
import { cn } from "@/lib/utils";
import { windowControls } from "@/platform/capabilities/windowControls";
import { APP_DESKTOP_TOP_INSET_PX } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import {
  dispatchCardSetViewWindowEvent,
  subscribeCardSetViewWindowEvent,
} from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const useBreadcrumbs = () => {
  const { pathname, search } = useLocation();

  return useMemo(
    () => buildRouteBreadcrumbs({ pathname, search }),
    [pathname, search],
  );
};

type WindowControlButtonProps = {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  noDragStyle?: React.CSSProperties;
  children: React.ReactNode;
};

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

const HomeBreadcrumbIcon: React.FC = () => (
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

export const TitleBar: React.FC = () => {
  const [bridgeIsMaximized, setBridgeIsMaximized] = useState(false);
  const [isCardSetViewEditing, setIsCardSetViewEditing] = useState(false);
  const navigate = useNavigate();
  const hasDesktopBridge = useHasDesktopBridge();
  const presentationTarget = usePresentationTarget();
  const isDesktopPresentation = presentationTarget === "desktop";
  const { pathname } = useLocation();
  const crumbs = useBreadcrumbs();
  const { extraCrumbs } = useBreadcrumbContext();
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

  const allCrumbs = useMemo(
    () =>
      mergeTitleBarBreadcrumbs({
        pathname,
        baseCrumbs: crumbs,
        extraCrumbs,
      }),
    [crumbs, extraCrumbs, pathname],
  );

  if (!isDesktopPresentation) return null;

  const dragStyle = hasDesktopBridge
    ? ({ WebkitAppRegion: "drag" } as React.CSSProperties)
    : undefined;
  const noDragStyle = hasDesktopBridge
    ? ({ WebkitAppRegion: "no-drag" } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={cn(
        "surface-glass-base surface-glass-titlebar",
        "flex w-full shrink-0 select-none items-center justify-between",
        "border-x-0 border-t-0 rounded-none text-sm titlebar-text",
      )}
      style={{
        ...dragStyle,
        zIndex: 9999,
        height: `${APP_DESKTOP_TOP_INSET_PX}px`,
      }}
    >
      <div
        className={cn(
          "flex h-full min-w-0 items-center px-4",
          shouldShowBrandLabel && "gap-2",
        )}
        style={noDragStyle}
      >
        {shouldShowBrandLabel ? (
          <span className="titlebar-text-strong shrink-0 text-xs font-semibold tracking-wide">
            {APP_CHROME.brandLabel}
          </span>
        ) : null}

        <nav className="titlebar-text flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs">
          {allCrumbs.map((crumb, index) => {
            const isClickable = Boolean(crumb.to);
            const isHomeCrumb = index === 0 && crumb.label === "ホーム";
            const breadcrumbContent = isHomeCrumb ? (
              <>
                <HomeBreadcrumbIcon />
                <span className="sr-only">{crumb.label}</span>
              </>
            ) : (
              crumb.label
            );

            const handleBreadcrumbClick = (
              event: React.MouseEvent<HTMLButtonElement>,
            ) => {
              event.preventDefault();
              event.stopPropagation();

              if (!crumb.to) {
                return;
              }

              navigate(crumb.to);
            };

            return (
              <React.Fragment
                key={`${crumb.label}:${crumb.to ?? "no-to"}:${
                  "folderId" in crumb
                    ? (crumb.folderId ?? "no-folder")
                    : "no-folder"
                }:${index}`}
              >
                {index > 0 && (
                  <span className="titlebar-divider select-none">/</span>
                )}

                {isClickable ? (
                  <button
                    type="button"
                    className="titlebar-hover titlebar-text inline-flex items-center truncate rounded-sm px-1 py-0.5 transition-colors"
                    style={noDragStyle}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={handleBreadcrumbClick}
                    title={crumb.label}
                  >
                    {breadcrumbContent}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "titlebar-text-strong truncate font-medium",
                      isHomeCrumb && "inline-flex items-center",
                    )}
                    title={crumb.label}
                  >
                    {breadcrumbContent}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
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
