import {
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { TagFilterPopover } from "@/components/explorer/TagFilterPopover";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useTags } from "@/hooks/settings/useTags";

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
  className?: string;
  onClick?: () => void;
  children: ReactNode;
};

const ExplorerToolbarButton = ({
  title,
  disabled = false,
  className,
  onClick,
  children,
}: ExplorerToolbarButtonProps) => {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px]",
        "border-0 bg-transparent text-[#777671] outline-none transition-colors",
        disabled
          ? "cursor-default text-[#b8b7b0]"
          : "hover:bg-[#eeece4] hover:text-[#24231f]",
        className,
      )}
    >
      {children}
    </button>
  );
};

const ChevronLeftIcon = () => (
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
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
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
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
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
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
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
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
  <svg
    width="15"
    height="15"
    viewBox="0 0 20 17"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1.5 4.25C1.5 3.42 2.17 2.75 3 2.75H7.25C7.79 2.75 8.29 3.04 8.56 3.5L9.25 4.7H17C17.83 4.7 18.5 5.37 18.5 6.2V13.6C18.5 14.43 17.83 15.1 17 15.1H3C2.17 15.1 1.5 14.43 1.5 13.6V4.25Z"
      fill="#f0efe9"
      stroke="#8b8a84"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M2.4 6.6H17.6"
      stroke="#fbfaf6"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

const ExplorerToolbar = () => {
  const { tags } = useTags();
  const openGlobalSearch = useGlobalSearchStore((state) => state.open);
  const allTags = useMemo(
    () =>
      tags
        .map((tag) => tag.name)
        .sort((left, right) => left.localeCompare(right, "ja")),
    [tags],
  );

  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center gap-1 border-b border-[#dddcd5]",
        "bg-[rgba(246,246,244,0.98)] px-2 text-[#24231f]",
      )}
    >
      <ExplorerToolbarButton title="戻る" disabled>
        <ChevronLeftIcon />
      </ExplorerToolbarButton>
      <ExplorerToolbarButton title="進む" disabled>
        <ChevronRightIcon />
      </ExplorerToolbarButton>
      <ExplorerToolbarButton title="上へ" disabled>
        <ArrowUpIcon />
      </ExplorerToolbarButton>

      <div className="mx-1 h-[18px] w-px shrink-0 bg-[#dddcd5]" />

      <div
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px]",
          "border border-[#dddcd5] bg-[rgba(255,255,255,0.9)] px-3",
        )}
      >
        <HomeIcon />
        <span className="text-[12px] text-[#777671]">ホーム</span>
        <span className="text-[12px] text-[#b8b7b0]">›</span>
        <FolderIcon />
        <span className="min-w-0 truncate text-[12px] font-medium text-[#24231f]">
          エクスプローラー
        </span>
      </div>

      <div className="mx-1 h-[18px] w-px shrink-0 bg-[#dddcd5]" />

      <ExplorerToolbarButton title="更新">
        <RefreshIcon />
      </ExplorerToolbarButton>

      <TagFilterPopover
        allTags={allTags}
        className={cn(
          "h-7 w-7 shrink-0 rounded-[5px] border-0 bg-transparent px-0 py-0",
          "text-[#777671] hover:bg-[#eeece4] hover:text-[#24231f]",
        )}
      />

      <ExplorerToolbarButton
        title="検索"
        onClick={() => {
          openGlobalSearch();
        }}
      >
        <SearchIcon />
      </ExplorerToolbarButton>
    </div>
  );
};

const ExplorerStatusBar = () => {
  return (
    <div
      className={cn(
        "flex h-7 shrink-0 items-center gap-3 border-t border-[#dddcd5]",
        "bg-[rgba(246,246,244,0.98)] px-3 text-[11px] text-[#777671]",
      )}
    >
      <span>エクスプローラー</span>
      <span className="text-[#c8c7bf]">│</span>
      <span>フォルダとカードを管理</span>
      <span className="ml-auto text-[#9b9a94]">Manifolia</span>
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
        "rounded-none border-0 bg-[var(--app-bg)] shadow-none",
        className,
      )}
    >
      {tabs}

      {showExplorerChrome ? <ExplorerToolbar /> : null}

      <div
        className={cn(
          "relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden",
          "bg-[rgba(255,255,255,0.96)]",
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
