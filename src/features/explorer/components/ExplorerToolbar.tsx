import {
  Fragment,
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { TagFilterPopover } from "@/components/explorer/TagFilterPopover";
import { floatingPanelPresets } from "@/components/ui/menu-styles";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBreadcrumbExtraCrumbs } from "@/contexts/BreadcrumbContext";

import type { BreadcrumbCrumb } from "@/features/breadcrumbs/types";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";

type ExplorerToolbarButtonProps = {
  title: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
};

type ExplorerToolbarSearchButtonProps = {
  onClick: () => void;
};

type ExplorerToolbarMenuItemProps = {
  label: string;
  description?: string;
  onClick?: () => void;
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
      ButtonHTMLAttributes<HTMLButtonElement>,
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
          "explorer-chrome-toolbar-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent bg-transparent text-muted-foreground outline-none transition-colors",
          disabled
            ? "cursor-default opacity-50"
            : "hover:bg-accent hover:text-foreground",
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

const MoreHorizontalIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="5" cy="12" r="1.45" fill="currentColor" />
    <circle cx="12" cy="12" r="1.45" fill="currentColor" />
    <circle cx="19" cy="12" r="1.45" fill="currentColor" />
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

const ExplorerToolbarSearchButton = ({
  onClick,
}: ExplorerToolbarSearchButtonProps) => {
  return (
    <button
      type="button"
      title="検索"
      aria-label="検索"
      onClick={onClick}
      className={cn(
        "explorer-chrome-toolbar-search inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-[12px] text-muted-foreground shadow-sm outline-none transition-colors",
        "hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <SearchIcon />
      <span className="min-w-0 truncate">検索</span>
    </button>
  );
};

const ExplorerToolbarMenuItem = ({
  label,
  description,
  onClick,
}: ExplorerToolbarMenuItemProps) => {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 flex-col rounded-[10px] px-3 py-2 text-left outline-none transition-colors",
        "text-foreground hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={onClick}
    >
      <span className="truncate text-[12px] font-semibold leading-4">
        {label}
      </span>
      {description ? (
        <span className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </button>
  );
};

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
        "explorer-chrome-pathbar flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 shadow-sm",
      )}
    >
      {pathCrumbs.map((crumb, index) => {
        const isLast = index === pathCrumbs.length - 1;
        const isClickable = Boolean(crumb.to);

        return (
          <Fragment key={`${crumb.label}:${crumb.to ?? "current"}:${index}`}>
            {index > 0 ? (
              <span className="text-[12px] text-muted-foreground">›</span>
            ) : null}

            {index === 0 ? <HomeIcon /> : null}
            {index === 1 ? <ExplorerChromeFolderIcon /> : null}

            {isClickable ? (
              <button
                type="button"
                onClick={() => handleCrumbClick(crumb)}
                className={cn(
                  "min-w-0 truncate rounded-[4px] text-left text-[12px]",
                  "text-muted-foreground hover:text-foreground",
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
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
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

export const ExplorerToolbar = () => {
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
        "explorer-chrome-toolbar flex h-[60px] shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 text-foreground backdrop-blur",
      )}
    >
      <div className="explorer-chrome-toolbar-nav flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-1.5 py-1">
        <ExplorerToolbarButton title="戻る" disabled>
          <ChevronLeftIcon />
        </ExplorerToolbarButton>
        <ExplorerToolbarButton title="進む" disabled>
          <ChevronRightIcon />
        </ExplorerToolbarButton>
        <ExplorerToolbarButton title="上へ" disabled>
          <ArrowUpIcon />
        </ExplorerToolbarButton>
      </div>

      <ExplorerPathBar />

      <ExplorerToolbarSearchButton onClick={openGlobalSearch} />

      <div className="explorer-chrome-toolbar-actions flex shrink-0 items-center gap-1">
        <ExplorerToolbarButton title="更新">
          <RefreshIcon />
        </ExplorerToolbarButton>

        <TagFilterPopover
          allTags={allTags}
          className={cn(
            "explorer-chrome-toolbar-button h-9 w-9 shrink-0 rounded-xl border border-transparent bg-transparent px-0 py-0",
            "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        />

        <ExplorerToolbarButton title="並び替え">
          <SortIcon />
        </ExplorerToolbarButton>

        <Popover>
          <PopoverTrigger asChild>
            <ExplorerToolbarButton title="その他">
              <MoreHorizontalIcon />
            </ExplorerToolbarButton>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className={cn(panelPreset.className, "w-[230px] p-1.5")}
            surface={panelPreset.surface}
          >
            <div className="space-y-1">
              <ExplorerToolbarMenuItem
                label="検索を開く"
                description="フォルダ・カード・PDFを横断検索"
                onClick={openGlobalSearch}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
