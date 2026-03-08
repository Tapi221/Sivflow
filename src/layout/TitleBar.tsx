import React, { useEffect, useState } from "react";
import { isDesktopRuntime } from "@/platform/runtime";
import { cn } from "@/lib/utils";

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

  return (
    <div
      className={cn(
        "flex h-[36px] w-full shrink-0 select-none items-center justify-between border-b border-gray-200/60 bg-[#F8FAFB] text-sm text-gray-700",
      )}
      style={{ WebkitAppRegion: "drag", zIndex: 9999 } as React.CSSProperties}
    >
      <div className="flex h-full items-center px-4">
        {/* レトロ・ミニマルなタイトル */}
        <span className="font-semibold tracking-wide text-gray-500 text-xs mt-[1px]">
          Manifolia.
        </span>
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
