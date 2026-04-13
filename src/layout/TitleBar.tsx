import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import {
  buildRouteBreadcrumbs,
  mergeTitleBarBreadcrumbs,
} from "@/features/breadcrumbs/builders";
import { useHasDesktopBridge } from "@/hooks/platform/useHasDesktopBridge";
import { cn } from "@/lib/utils";
import { windowControls } from "@/platform/capabilities/windowControls";
import { APP_DESKTOP_TOP_INSET_PX } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
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
  children: React.ReactNode;
};

const WindowControlButton: React.FC<WindowControlButtonProps> = ({
  title,
  onClick,
  disabled = false,
  danger = false,
  children,
}) => {
  const disabledClassName = disabled
    ? "cursor-default opacity-60 hover:bg-transparent hover:text-current"
    : danger
      ? "hover:bg-[#E81123] hover:text-white"
      : "hover:bg-black/5";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex h-full w-[46px] items-center justify-center transition-colors",
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

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCardSetViewEditing, setIsCardSetViewEditing] = useState(false);
  const navigate = useNavigate();
  const hasDesktopBridge = useHasDesktopBridge();
  const presentationTarget = usePresentationTarget();
  const isDesktopPresentation = presentationTarget === "desktop";
  const { pathname } = useLocation();
  const crumbs = useBreadcrumbs();
  const { extraCrumbs, notifyFolderSelect } = useBreadcrumbContext();
  const isCardSetViewPage = pathname.toLowerCase().startsWith("/cardsetview");

  useEffect(() => {
    if (!hasDesktopBridge) {
      setIsMaximized(false);
      return;
    }

    void windowControls.isMaximized().then(setIsMaximized);

    const cleanup = windowControls.onMaximizedStateChange(
      (maximized: boolean) => {
        setIsMaximized(maximized);
      },
    );

    return () => {
      cleanup();
    };
  }, [hasDesktopBridge]);

  useEffect(() => {
    const onEditingChange = (event: Event) => {
      const next = (event as CustomEvent<boolean>).detail;
      setIsCardSetViewEditing(Boolean(next));
    };

    window.addEventListener("cardsetview:editing-change", onEditingChange);

    return () => {
      window.removeEventListener(
        "cardsetview:editing-change",
        onEditingChange,
      );
    };
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
        "border-x-0 border-t-0 rounded-none text-sm text-slate-700",
      )}
      style={{
        ...dragStyle,
        zIndex: 9999,
        height: `${APP_DESKTOP_TOP_INSET_PX}px`,
      }}
    >
      <div
        className="flex h-full min-w-0 items-center gap-2 px-4"
        style={noDragStyle}
      >
        <span className="mr-2 shrink-0 text-xs font-semibold tracking-wide text-slate-600">
          Manifolia
        </span>

        <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-xs text-slate-500">
          {allCrumbs.map((crumb, index) => {
            const hasFolderId = "folderId" in crumb;
            const isSectionListCrumb = crumb.to === "/folders" && !hasFolderId;
            const isHomeCrumb = index === 0;
            const isClickable = Boolean(crumb.to);

            const handleBreadcrumbClick = (
              event: React.MouseEvent<HTMLButtonElement>,
            ) => {
              event.preventDefault();
              event.stopPropagation();

              if (!crumb.to) {
                return;
              }

              if (isHomeCrumb) {
                navigate(crumb.to);
                return;
              }

              if (hasFolderId) {
                notifyFolderSelect(crumb.folderId ?? null);
              } else if (isSectionListCrumb) {
                notifyFolderSelect(null);
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
                  <span className="select-none text-slate-300">/</span>
                )}

                {isClickable ? (
                  <button
                    type="button"
                    className="truncate transition-colors hover:text-slate-700"
                    style={noDragStyle}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={handleBreadcrumbClick}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="truncate font-medium text-slate-700">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div
        className="flex h-full items-center text-slate-500"
        style={noDragStyle}
      >
        {isCardSetViewPage && (
          <>
            {isCardSetViewEditing && (
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("cardsetview:create-card-request"),
                  )
                }
                className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-black/5"
                title="新規カードを追加"
                aria-label="新規カードを追加"
                tabIndex={-1}
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

            {isCardSetViewEditing && (
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("cardsetview:save-request"),
                  )
                }
                className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-black/5"
                title="保存"
                aria-label="保存"
                tabIndex={-1}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 4H17L20 7V20H5V4Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 4V10H16V4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 20V14H15V20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("cardsetview:toggle-editing-request"),
                )
              }
              className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-black/5"
              title={
                isCardSetViewEditing
                  ? "閲覧モードに切り替え"
                  : "編集モードに切り替え"
              }
              tabIndex={-1}
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