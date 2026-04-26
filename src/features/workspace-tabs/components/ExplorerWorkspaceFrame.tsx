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
};

const EXPLORER_COLUMN_PATH_CHANGE_EVENT =
  "manifolia:explorer-column-path-change";

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
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px]",
          "border-0 bg-transparent text-[#777671] outline-none transition-colors",
          disabled
            ? "cursor-default text-[#b8b7b0]"
            : "hover:bg-[#eeece4] hover:text-[#24231f]",
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

const ExplorerPathBar = () => {
  const navigate = useNavigate();
  const extraCrumbs = useBreadcrumbExtraCrumbs();
  const [columnPathCrumbs, setColumnPathCrumbs] = useState<BreadcrumbCrumb[]>(
    readInitialExplorerColumnPathCrumbs,
  );

  useEffect(() => {
    const handleColumnPathChange = ((event: Event) => {
      const detail = (event as CustomEvent<ExplorerColumnPathEventDetail>)
        .detail;
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

  const visibleExtraCrumbs =
    extraCrumbs.length > 0 ? extraCrumbs : columnPathCrumbs;

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
    void navigate(crumb.to);
  };

  return (
    <div
      className={cn(
        "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[6px]",
        "border border-[#d6d4cb] bg-[rgba(255,255,255,0.92)] px-3",
        "shadow-[inset_0_1px_2px_rgba(86,72,74,0.16)]",
      )}
    >
      {pathCrumbs.map((crumb, index) => {
        const isLast = index === pathCrumbs.length - 1;
        const isClickable = Boolean(crumb.to);

        return (
          <Fragment key={`${crumb.label}:${crumb.to ?? "current"}:${index}`}>
            {index > 0 ? (
              <span className="text-[12px] text-[#b8b7b0]">›</span>
            ) : null}

            {index === 0 ? <HomeIcon /> : null}
            {index === 1 ? <ExplorerChromeFolderIcon /> : null}

            {isClickable ? (
              <button
                type="button"
                onClick={() => handleCrumbClick(crumb)}
                className={cn(
                  "min-w-0 truncate rounded-[4px] text-left text-[12px]",
                  "text-[#777671] hover:text-[#24231f]",
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
                  isLast
                    ? "font-medium text-[#24231f]"
                    : "text-[#777671]",
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

      <ExplorerPathBar />

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
