import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import {
  buildRouteBreadcrumbs,
  mergeTitleBarBreadcrumbs,
} from "@/features/breadcrumbs/builders";
import { cn } from "@/lib/utils";
import { isDesktopRuntime } from "@/platform/runtime";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const useBreadcrumbs = () => {
  const { pathname, search } = useLocation();

  return useMemo(
    () => buildRouteBreadcrumbs({ pathname, search }),
    [pathname, search],
  );
};

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCardSetViewEditing, setIsCardSetViewEditing] = useState(false);
  const isDesktop = isDesktopRuntime();
  const { pathname, search } = useLocation();
  const crumbs = useBreadcrumbs();
  const { extraCrumbs, notifyFolderSelect } = useBreadcrumbContext();
  const isCardSetViewPage = pathname.toLowerCase().startsWith("/cardsetview");

  const shouldUseGlassBreadcrumb = useMemo(() => {
    if (!isCardSetViewPage) return false;

    const searchParams = new URLSearchParams(search);
    return Boolean(searchParams.get("cardSetId"));
  }, [isCardSetViewPage, search]);

  useEffect(() => {
    if (!isDesktop) return;

    window.desktop?.window.isMaximized().then(setIsMaximized);

    const cleanup = window.desktop?.window.onMaximizedStateChange(
      (maximized) => {
        setIsMaximized(maximized);
      },
    );

    return () => {
      if (cleanup) cleanup();
    };
  }, [isDesktop]);

  useEffect(() => {
    const onEditingChange = (event: Event) => {
      const next = (event as CustomEvent<boolean>).detail;
      setIsCardSetViewEditing(Boolean(next));
    };
    window.addEventListener("cardsetview:editing-change", onEditingChange);
    return () =>
      window.removeEventListener("cardsetview:editing-change", onEditingChange);
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

  if (!isDesktop) return null;

  return (
 <div
  className="flex h-[36px] w-full shrink-0 select-none items-center justify-between border-b border-white/20 bg-white/30 text-sm text-gray-700 backdrop-blur-xl supports-[backdrop-filter]:bg-white/20"
  style={{ WebkitAppRegion: "drag", zIndex: 9999 } as React.CSSProperties}
>
      <div
        className="flex h-full min-w-0 items-center gap-2 px-4"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <span className="mr-2 shrink-0 text-xs font-semibold tracking-wide text-gray-500">
          Manifolia
        </span>

        <nav
          className={cn(
            "flex min-w-0 items-center gap-1 overflow-hidden text-xs text-gray-400 transition-all",
            shouldUseGlassBreadcrumb &&
              "surface-floating-strong h-[28px] rounded-full px-3 text-gray-500",
          )}
        >
          {allCrumbs.map((crumb, index) => {
            const hasFolderId = "folderId" in crumb;
            const isSectionListCrumb = crumb.to === "/folders" && !hasFolderId;
            const isHomeCrumb = index === 0;
            const isClickable = Boolean(crumb.to);

            return (
              <React.Fragment
                key={`${crumb.label}:${crumb.to ?? "no-to"}:${
                  "folderId" in crumb
                    ? (crumb.folderId ?? "no-folder")
                    : "no-folder"
                }:${index}`}
              >
                {index > 0 && (
                  <span
                    className={cn(
                      "select-none",
                      shouldUseGlassBreadcrumb
                        ? "text-gray-300/90"
                        : "text-gray-300",
                    )}
                  >
                    /
                  </span>
                )}

                {isClickable ? (
                  <Link
                    to={crumb.to!}
                    className={cn(
                      "truncate transition-colors",
                      shouldUseGlassBreadcrumb
                        ? "hover:text-gray-700"
                        : "hover:text-gray-600",
                    )}
                    onClick={() => {
                      if (hasFolderId) {
                        notifyFolderSelect(crumb.folderId ?? null);
                        return;
                      }
                      if (isHomeCrumb) {
                        notifyFolderSelect(null);
                        return;
                      }
                      if (isSectionListCrumb) {
                        notifyFolderSelect(null);
                      }
                    }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "truncate font-medium",
                      shouldUseGlassBreadcrumb
                        ? "text-gray-700"
                        : "text-gray-600",
                    )}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div
        className="flex h-full items-center text-gray-500"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {isCardSetViewPage && (
          <>
            {isCardSetViewEditing && (
              <button
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
        <button
          onClick={() => window.desktop?.window.minimize()}
          className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-black/5"
          title="最小化"
          tabIndex={-1}
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
        </button>

        <button
          onClick={() => window.desktop?.window.maximizeToggle()}
          className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-black/5"
          title={isMaximized ? "元に戻す" : "最大化"}
          tabIndex={-1}
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
        </button>

        <button
          onClick={() => window.desktop?.window.close()}
          className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-[#E81123] hover:text-white"
          title="閉じる"
          tabIndex={-1}
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
        </button>
      </div>
    </div>
  );
};
