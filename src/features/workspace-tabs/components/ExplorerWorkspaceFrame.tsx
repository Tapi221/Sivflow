import {
  Fragment,
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LayoutPanel } from "@/components/explorer/LayoutPanel";
import { TagFilterPopover } from "@/components/explorer/TagFilterPopover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { floatingPanelPresets } from "@/components/ui/menu-styles";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useExplorerSettingsOpener } from "@/features/explorer/adapters/web/useExplorerSettingsOpener";
import { useTags } from "@/hooks/settings/useTags";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { useBreadcrumbExtraCrumbs } from "@/contexts/BreadcrumbContext";
import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import { useNavigate } from "react-router-dom";

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

type ExplorerColumnPathWindow = Window & {
  __manifoliaExplorerColumnPathCrumbs?: BreadcrumbCrumb[];
};

type ExplorerColumnPathEventDetail = {
  crumbs?: BreadcrumbCrumb[];
  active?: boolean;
};

type ExplorerColumnPathNavigateEventDetail = {
  folderId?: string | null;
};

const EXPLORER_COLUMN_PATH_CHANGE_EVENT =
  "manifolia:explorer-column-path-change";
const EXPLORER_COLUMN_PATH_NAVIGATE_EVENT =
  "manifolia:explorer-column-path-navigate";

const EXPLORER_HOME_CRUMB: BreadcrumbCrumb = {
  label: "ホーム",
  to: "/folders?home=1",
};

const EXPLORER_ROOT_CRUMB: BreadcrumbCrumb = {
  label: "エクスプローラー",
  to: "/folders?view=section-list",
};

const readInitialExplorerColumnPathCrumbs = (): BreadcrumbCrumb[] => {
  if (typeof window === "undefined") return [];

  return (
    (window as ExplorerColumnPathWindow).__manifoliaExplorerColumnPathCrumbs ??
    []
  );
};

const hasInitialExplorerColumnPathState = (): boolean => {
  if (typeof window === "undefined") return false;

  return Object.prototype.hasOwnProperty.call(
    window,
    "__manifoliaExplorerColumnPathCrumbs",
  );
};

const dispatchExplorerColumnPathNavigate = (folderId: string | null) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ExplorerColumnPathNavigateEventDetail>(
      EXPLORER_COLUMN_PATH_NAVIGATE_EVENT,
      {
        detail: { folderId },
      },
    ),
  );
};

const ExplorerToolbarButton = forwardRef<
  HTMLButtonElement,
  ExplorerToolbarButtonProps &
    Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      "title" | "disabled" | "onClick" | "children" | "className"
    >
>(
  (
    { title, disabled = false, className, onClick, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={disabled ? undefined : onClick}
        className={cn(
          "explorer-chrome-toolbar-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px]",
          "border border-transparent bg-transparent text-[var(--mf-explorer-text-muted)] outline-none transition-colors",
          disabled
            ? "cursor-default text-[var(--mf-explorer-text-faint)]"
            : "hover:border-[var(--mf-explorer-border-soft)] hover:bg-[var(--mf-explorer-control-hover)] hover:text-[var(--mf-explorer-text)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ExplorerToolbarButton.displayName = "ExplorerToolbarButton";

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

const SortIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 19V5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9L8 5L12 9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 5V19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15L16 19L20 15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ColumnsIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="3.75"
      y="4.75"
      width="16.5"
      height="14.5"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M10 7V17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M14 7V17"
      stroke="currentColor"
      strokeWidth="1.5"
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

const SettingsIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 0 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 0 1 10.08 21V20.91A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.18 19.73L7.12 19.79A2 2 0 0 1 4.29 16.96L4.35 16.9A1.65 1.65 0 0 0 4.68 15.08A1.65 1.65 0 0 0 3.17 14H3A2 2 0 0 1 3 10H3.09A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.21 7.12A2 2 0 0 1 7.04 4.29L7.1 4.35A1.65 1.65 0 0 0 8.92 4.68A1.65 1.65 0 0 0 10 3.17V3A2 2 0 0 1 14 3V3.09A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.82 4.27L16.88 4.21A2 2 0 0 1 19.71 7.04L19.65 7.1A1.65 1.65 0 0 0 19.32 8.92A1.65 1.65 0 0 0 20.83 10H21A2 2 0 0 1 21 14H20.91A1.65 1.65 0 0 0 19.4 15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ExplorerPathBar = () => {
  const navigate = useNavigate();
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const [columnPathCrumbs, setColumnPathCrumbs] = useState<BreadcrumbCrumb[]>(
    readInitialExplorerColumnPathCrumbs,
  );
  const [isColumnPathActive, setIsColumnPathActive] = useState<boolean>(
    hasInitialExplorerColumnPathState,
  );

  useEffect(() => {
    const handleColumnPathChange = ((event: Event) => {
      const detail = (event as CustomEvent<ExplorerColumnPathEventDetail>)
        .detail;

      if (detail?.active === false) {
        setIsColumnPathActive(false);
        setColumnPathCrumbs([]);
        return;
      }

      setIsColumnPathActive(true);
      setColumnPathCrumbs(detail?.crumbs ?? []);
    }) as EventListener;

    window.addEventListener(
      EXPLORER_COLUMN_PATH_CHANGE_EVENT,
      handleColumnPathChange,
    );

    return () => {
      window.removeEventListener(
        EXPLORER_COLUMN_PATH_CHANGE_EVENT,
        handleColumnPathChange,
      );
    };
  }, []);

  const visibleExtraCrumbs = isColumnPathActive
    ? columnPathCrumbs
    : extraCrumbs;

  const pathCrumbs = useMemo(() => {
    const normalizedExtraCrumbs = visibleExtraCrumbs.map((crumb, index) =>
      index === visibleExtraCrumbs.length - 1
        ? { ...crumb, to: undefined }
        : crumb,
    );

    const rootCrumb =
      normalizedExtraCrumbs.length > 0
        ? EXPLORER_ROOT_CRUMB
        : { ...EXPLORER_ROOT_CRUMB, to: undefined };

    return [EXPLORER_HOME_CRUMB, rootCrumb, ...normalizedExtraCrumbs];
  }, [visibleExtraCrumbs]);

  const handleCrumbClick = (crumb: BreadcrumbCrumb) => {
    if (!crumb.to) return;

    const crumbWithFolderId = crumb as BreadcrumbCrumb & {
      folderId?: string | null;
    };

    if (typeof crumbWithFolderId.folderId === "string") {
      dispatchExplorerColumnPathNavigate(crumbWithFolderId.folderId);
      return;
    }

    if (crumb.to === EXPLORER_ROOT_CRUMB.to) {
      dispatchExplorerColumnPathNavigate(null);
      return;
    }

    void navigate(crumb.to);
  };

  return (
    <div
      className={cn(
        "explorer-chrome-pathbar flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[14px]",
        "border border-[var(--mf-explorer-border)] bg-[var(--mf-explorer-control-bg)] px-3",
        "shadow-[var(--mf-explorer-control-shadow)]",
      )}
    >
      {pathCrumbs.map((crumb, index) => {
        const isLast = index === pathCrumbs.length - 1;
        const isClickable = Boolean(crumb.to);

        return (
          <Fragment key={`${crumb.label}:${crumb.to ?? "current"}:${index}`}>
            {index > 0 ? (
              <span className="text-[12px] text-[var(--mf-explorer-text-faint)]">›</span>
            ) : null}

            {index === 0 ? <HomeIcon /> : null}
            {index === 1 ? <ExplorerChromeFolderIcon /> : null}

            {isClickable ? (
              <button
                type="button"
                onClick={() => handleCrumbClick(crumb)}
                className={cn(
                  "min-w-0 truncate rounded-[4px] text-left text-[12px]",
                  "text-[var(--mf-explorer-text-muted)] hover:text-[var(--mf-explorer-text)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                title={crumb.label}
              >
                {crumb.label}
              </button>
            ) : (
              <span
                className={cn(
                  "min-w-0 truncate text-[12px]",
                  isLast ? "font-semibold text-[var(--mf-explorer-text)]" : "text-[var(--mf-explorer-text-muted)]",
                )}
                title={crumb.label}
              >
                {crumb.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

const ExplorerToolbar = () => {
  const { tags } = useTags();
  const openGlobalSearch = useGlobalSearchStore((state) => state.open);
  const panelPreset = floatingPanelPresets.filter;
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
        "explorer-chrome-toolbar flex h-[58px] shrink-0 items-center gap-2 border-b border-[var(--mf-explorer-border)]",
        "bg-[var(--mf-explorer-toolbar-bg)] px-4 text-[var(--mf-explorer-text)]",
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

      <div className="mx-1 h-[18px] w-px shrink-0 bg-[var(--mf-explorer-border)]" />

      <ExplorerPathBar />

      <div className="mx-1 h-[18px] w-px shrink-0 bg-[var(--mf-explorer-border)]" />

      <ExplorerToolbarButton title="更新">
        <RefreshIcon />
      </ExplorerToolbarButton>

      <TagFilterPopover
        allTags={allTags}
        className={cn(
          "explorer-chrome-toolbar-button h-8 w-8 shrink-0 rounded-[11px] border border-transparent bg-transparent px-0 py-0",
          "text-[var(--mf-explorer-text-muted)] hover:border-[var(--mf-explorer-border-soft)] hover:bg-[var(--mf-explorer-control-hover)] hover:text-[var(--mf-explorer-text)]",
        )}
      />

      <ExplorerToolbarButton title="並び替え">
        <SortIcon />
      </ExplorerToolbarButton>

      <Popover>
        <PopoverTrigger asChild>
          <ExplorerToolbarButton title="表示切替">
            <ColumnsIcon />
          </ExplorerToolbarButton>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className={cn(panelPreset.className, "w-[300px]")}
          surface={panelPreset.surface}
        >
          <LayoutPanel />
        </PopoverContent>
      </Popover>

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
  const openSettings = useExplorerSettingsOpener();

  return (
    <div
      className={cn(
        "explorer-chrome-statusbar flex h-8 shrink-0 items-center gap-3 border-t border-[var(--mf-explorer-border)]",
        "bg-[var(--mf-explorer-status-bg)] px-4 text-[11px] text-[var(--mf-explorer-text-muted)]",
      )}
    >
      <span>エクスプローラー</span>
      <span className="text-[var(--mf-explorer-border-strong)]">│</span>
      <span>フォルダとカードを管理</span>

      <ExplorerToolbarButton
        title="設定"
        onClick={openSettings}
        className="ml-auto -mr-1 h-6 w-6"
      >
        <SettingsIcon />
      </ExplorerToolbarButton>
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
        "rounded-none border-0 shadow-none",
        showExplorerChrome
          ? "explorer-chrome-shell bg-[var(--mf-explorer-app-bg)]"
          : "bg-[var(--app-bg)]",
        className,
      )}
    >
      {showExplorerChrome ? (
        <div className="explorer-chrome-main-topbar pointer-events-none absolute right-0 top-0 z-40 flex min-w-0 flex-col">
          <div className="pointer-events-auto min-w-0">{tabs}</div>
          <div className="pointer-events-auto min-w-0">
            <ExplorerToolbar />
          </div>
        </div>
      ) : (
        tabs
      )}

      <div
        className={cn(
          "relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden",
          showExplorerChrome
            ? "explorer-chrome-body bg-[var(--mf-explorer-app-bg)]"
            : "bg-transparent",
          bodyClassName,
        )}
      >
        {children}
      </div>

      {showExplorerChrome ? <ExplorerStatusBar /> : null}
    </section>
  );
};
