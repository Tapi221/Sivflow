import React, { useEffect, useState, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { isDesktopRuntime } from "@/platform/runtime";
import { cn } from "@/lib/utils";

const PAGE_LABELS: Record<string, string> = {
  folders: "フォルダ",
  calendar: "カレンダー",
  gallery: "ギャラリー",
  trash: "ゴミ箱",
  study: "学習モード",
  cardedit: "カード編集",
  cardview: "カード閲覧",
  "one-qa-mode": "一問一答",
  "pair-mode": "ペアモード",
  "four-choice-mode": "四択モード",
};

function useBreadcrumbs() {
  const { pathname } = useLocation();
  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "ホーム", to: "/folders" as string | undefined }];
    segments.forEach((seg, i) => {
      const label = PAGE_LABELS[seg.toLowerCase()] ?? seg;
      const to = "/" + segments.slice(0, i + 1).join("/");
      crumbs.push({ label, to });
    });
    if (crumbs.length > 1) {
      crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label, to: undefined };
    }
    return crumbs;
  }, [pathname]);
}

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isDesktop = isDesktopRuntime();

  useEffect(() => {
    if (!isDesktop) return;

    // 初期状態の取得
    window.desktop?.window.isMaximized().then(setIsMaximized);

    // 最大化状態の変更を監視
    const cleanup = window.desktop?.window.onMaximizedStateChange((maximized) => {
      setIsMaximized(maximized);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isDesktop]);

  if (!isDesktop) return null;

  const crumbs = useBreadcrumbs();

  return (
    <div
      className={cn(
        "flex h-[36px] w-full shrink-0 select-none items-center justify-between border-b border-gray-200/60 bg-[#F8FAFB] text-sm text-gray-700",
      )}
      style={{ WebkitAppRegion: "drag", zIndex: 9999 } as React.CSSProperties}
    >
      <div className="flex h-full items-center gap-1 px-4" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <span className="font-semibold tracking-wide text-gray-500 text-xs mr-3">
          Manifolia.
        </span>
        <nav className="flex items-center gap-1 text-xs text-gray-400">
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-gray-300 select-none">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-gray-600 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-600 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div
        className="flex h-full items-center text-gray-500"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => window.desktop?.window.minimize()}
          className="flex h-full w-[46px] items-center justify-center hover:bg-black/5 transition-colors"
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
            <path d="M1 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => window.desktop?.window.maximizeToggle()}
          className="flex h-full w-[46px] items-center justify-center hover:bg-black/5 transition-colors"
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
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
        <button
          onClick={() => window.desktop?.window.close()}
          className="flex h-full w-[46px] items-center justify-center hover:bg-[#E81123] hover:text-white transition-colors"
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
