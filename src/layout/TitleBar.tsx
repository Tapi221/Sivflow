import React, { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { isDesktopRuntime } from "@/platform/runtime";
import { cn } from "@/lib/utils";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";

const PAGE_LABELS: Record<string, string> = {
  folders: "セクション一覧",
  calendar: "カレンダー",
  gallery: "ギャラリー",
  trash: "ゴミ箱",
  study: "学習モード",
  cardedit: "カード編集",
  cardview: "カード閲覧",
  "one-qa-mode": "一問一答",
  "pair-mode": "ペアモード",
  "four-choice-mode": "四択モード",
  directory: "ディレクトリ",
};

function useBreadcrumbs() {
  const { pathname, search } = useLocation();

  return useMemo(() => {
    const searchParams = new URLSearchParams(search);
    const isHomeOnlyMode =
      pathname.toLowerCase() === "/folders" && searchParams.get("home") === "1";
    if (isHomeOnlyMode) {
      return [{ label: "ホーム", to: undefined }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "ホーム", to: "/folders?home=1" as string | undefined }];

    segments.forEach((seg, i) => {
      const label = PAGE_LABELS[seg.toLowerCase()] ?? seg;
      const to = "/" + segments.slice(0, i + 1).join("/");
      crumbs.push({ label, to });
    });

    if (crumbs.length > 1) {
      crumbs[crumbs.length - 1] = {
        label: crumbs[crumbs.length - 1].label,
        to: undefined,
      };
    }

    return crumbs;
  }, [pathname, search]);
}

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCardViewEditing, setIsCardViewEditing] = useState(false);
  const isDesktop = isDesktopRuntime();
  const { pathname } = useLocation();
  const crumbs = useBreadcrumbs();
  const { extraCrumbs, notifyFolderSelect } = useBreadcrumbContext();
  const isCardViewPage = pathname.toLowerCase().startsWith("/cardview");

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
      setIsCardViewEditing(Boolean(next));
    };
    window.addEventListener("cardview:editing-change", onEditingChange);
    return () =>
      window.removeEventListener("cardview:editing-change", onEditingChange);
  }, []);

  // URL ベースのクラムにフォルダ/カード/ドキュメントのクラムを結合する。
  // extraCrumbs がある場合は末尾クラムに to を復元して続きを表示する。
  const allCrumbs = useMemo(() => {
    if (extraCrumbs.length === 0) return crumbs;

    const baseCrumbs =
      pathname.toLowerCase().startsWith("/cardview") && crumbs.length > 1
        ? [crumbs[0], { label: "セクション一覧", to: "/folders" }]
        : crumbs;

    const base = baseCrumbs.map((c, i) =>
      i === baseCrumbs.length - 1 ? { ...c, to: "/folders" } : c,
    );

    const extra = extraCrumbs.map((c, i) =>
      i === extraCrumbs.length - 1 ? { ...c, to: undefined } : c,
    );

    return [...base, ...extra];
  }, [crumbs, extraCrumbs, pathname]);

  if (!isDesktop) return null;

  return (
    <div
      className={cn(
        "flex h-[36px] w-full shrink-0 select-none items-center justify-between border-b border-gray-200/60 bg-[#F8FAFB] text-sm text-gray-700",
      )}
      style={{ WebkitAppRegion: "drag", zIndex: 9999 } as React.CSSProperties}
    >
      <div
        className="flex h-full items-center gap-1 px-4"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <span className="mr-3 text-xs font-semibold tracking-wide text-gray-500">
          Manifolia
        </span>

        <nav className="flex items-center gap-1 overflow-hidden text-xs text-gray-400">
          {allCrumbs.map((crumb, i) => {
            const hasFolderId = "folderId" in crumb;
            const isSectionListCrumb = crumb.to === "/folders" && !hasFolderId;
            const isHomeCrumb = i === 0;
            const isClickable = Boolean(crumb.to);

            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="select-none text-gray-300">/</span>}

                {isClickable ? (
                  <Link
                    to={crumb.to!}
                    className="transition-colors hover:text-gray-600"
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
                  <span className="font-medium text-gray-600">
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
        {isCardViewPage && (
          <>
            {isCardViewEditing && (
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("cardview:create-card-request"),
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
            {isCardViewEditing && (
              <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("cardview:save-request"))
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
                  new CustomEvent("cardview:toggle-editing-request"),
                )
              }
              className="flex h-full w-[46px] items-center justify-center transition-colors hover:bg-black/5"
              title={
                isCardViewEditing
                  ? "閲覧モードに切り替え"
                  : "編集モードに切り替え"
              }
              tabIndex={-1}
            >
              {isCardViewEditing ? (
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



