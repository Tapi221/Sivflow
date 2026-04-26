import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ExplorerWorkspaceFrameProps = {
  children: ReactNode;
  tabs: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  showExplorerChrome?: boolean;
};

type ExplorerToolbarButtonProps = {
  title: string;
  disabled?: boolean;
  children: ReactNode;
};

const ExplorerToolbarButton = ({
  title,
  disabled = false,
  children,
}: ExplorerToolbarButtonProps) => {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px]",
        "border-0 bg-transparent text-[#6b6b6b] outline-none transition-colors",
        disabled
          ? "cursor-default text-[#b8b8b8]"
          : "hover:bg-[#f0f0f0] hover:text-[#1a1a1a]",
      )}
    >
      {children}
    </button>
  );
};

const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 5L8 12L15 19"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 5L16 12L9 19"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 19V5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <path
      d="M6 11L12 5L18 11"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 12A8 8 0 1 1 17.66 6.34"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 4V10H14"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M16 16L20 20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const HomeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 10.5L12 4L20 10.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 10V19H17.5V10"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const FolderIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 17" fill="none" aria-hidden="true">
    <path
      d="M1.5 4.25C1.5 3.42 2.17 2.75 3 2.75H7.25C7.79 2.75 8.29 3.04 8.56 3.5L9.25 4.7H17C17.83 4.7 18.5 5.37 18.5 6.2V13.6C18.5 14.43 17.83 15.1 17 15.1H3C2.17 15.1 1.5 14.43 1.5 13.6V4.25Z"
      fill="#e4e4e4"
      stroke="#8b8b8b"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M2.4 6.6H17.6"
      stroke="#f8f8f8"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

const ExplorerToolbar = () => {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-[#e0e0e0] bg-white px-2 text-[#1a1a1a]">
      <ExplorerToolbarButton title="戻る" disabled>
        <ChevronLeftIcon />
      </ExplorerToolbarButton>
      <ExplorerToolbarButton title="進む" disabled>
        <ChevronRightIcon />
      </ExplorerToolbarButton>
      <ExplorerToolbarButton title="上へ" disabled>
        <ArrowUpIcon />
      </ExplorerToolbarButton>

      <div className="mx-1 h-[18px] w-px shrink-0 bg-[#e0e0e0]" />

      <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px] border border-[#e0e0e0] bg-[#fafafa] px-3">
        <HomeIcon />
        <span className="text-[12px] text-[#6b6b6b]">ホーム</span>
        <span className="text-[12px] text-[#b0b0b0]">›</span>
        <FolderIcon />
        <span className="min-w-0 truncate text-[12px] font-medium text-[#1a1a1a]">
          エクスプローラー
        </span>
      </div>

      <div className="mx-1 h-[18px] w-px shrink-0 bg-[#e0e0e0]" />

      <ExplorerToolbarButton title="更新">
        <RefreshIcon />
      </ExplorerToolbarButton>
      <ExplorerToolbarButton title="検索">
        <SearchIcon />
      </ExplorerToolbarButton>
    </div>
  );
};

const ExplorerStatusBar = () => {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-[#e0e0e0] bg-white px-3 text-[11px] text-[#6b6b6b]">
      <span>エクスプローラー</span>
      <span className="text-[#d0d0d0]">│</span>
      <span>フォルダとカードを管理</span>
      <span className="ml-auto text-[#9e9e9e]">Manifolia</span>
    </div>
  );
};

export const ExplorerWorkspaceFrame = ({
  children,
  tabs,
  className,
  bodyClassName,
  style,
  showExplorerChrome = true,
}: ExplorerWorkspaceFrameProps) => {
  return (
    <section
      style={style}
      className={cn(
        "relative flex h-full min-h-0 min-w-0 max-w-none flex-col overflow-hidden",
        "rounded-none border-0 bg-transparent shadow-none",
        className,
      )}
    >
      {tabs}

      {showExplorerChrome ? <ExplorerToolbar /> : null}

      <div
        className={cn(
          "relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-white",
          "[&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none",
          bodyClassName,
        )}
      >
        {children}
      </div>

      {showExplorerChrome ? <ExplorerStatusBar /> : null}
    </section>
  );
};
