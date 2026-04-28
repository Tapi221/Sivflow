import { useCallback, useMemo, useRef, useState } from "react";
import { UiIcon } from "@/ui/UiIcon";
import type { UiIconProps } from "@/ui/UiIcon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExplorerMenuPanel } from "@/components/folder/components/menus/ExplorerMenuPanel";
import { buildExplorerCreateMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { ExplorerChromePinIcon } from "@/components/explorer/icons";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";

interface ExplorerSidebarHeaderProps {
  allTags: string[];
  onOpenBookmarks?: () => void | Promise<void>;
  onOpenOutline?: () => void | Promise<void>;
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onCreateCard?: () => void | Promise<void>;
  onAddDocument?: () => void | Promise<void>;
  onBulkImport?: () => void | Promise<void>;
  canCreateCardSet?: boolean;
  canCreateCard?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  preferDirectRootFolderCreate?: boolean;
  compact?: boolean;
}

const EllipsisIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.8} {...props}>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </UiIcon>
);

const ChevronDownIcon = ({ size = 15, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.8} {...props}>
    <path
      d="M7 9.5L12 14.5L17 9.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </UiIcon>
);

const ClockIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.65} {...props}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 7.5V12.2L15.2 14.1" strokeLinecap="round" />
  </UiIcon>
);

const ManifoliaLeafMark = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 48 48"
    className="h-8 w-8 shrink-0"
    fill="none"
  >
    <path
      d="M24.1 8.2C18 12.8 15.6 18.9 17.2 25.1C20.6 23.7 23.3 21.5 25.2 18.4C27 15.4 26.7 11.9 24.1 8.2Z"
      fill="url(#manifoliaLeafTop)"
    />
    <path
      d="M12.1 18.1C20.6 18.5 26.8 23.1 30.3 31.7C22.7 32.1 16.8 29.2 12.9 22.9C12.2 21.7 11.9 20.1 12.1 18.1Z"
      fill="url(#manifoliaLeafLeft)"
    />
    <path
      d="M35.9 18.1C27.4 18.5 21.2 23.1 17.7 31.7C25.3 32.1 31.2 29.2 35.1 22.9C35.8 21.7 36.1 20.1 35.9 18.1Z"
      fill="url(#manifoliaLeafRight)"
    />
    <path
      d="M24 8.2V35"
      stroke="rgba(63,106,78,0.36)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <defs>
      <linearGradient
        id="manifoliaLeafTop"
        x1="19"
        y1="9"
        x2="29"
        y2="27"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#c9d3ad" />
        <stop offset="1" stopColor="#879766" />
      </linearGradient>
      <linearGradient
        id="manifoliaLeafLeft"
        x1="12"
        y1="18"
        x2="30"
        y2="32"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#6c8d72" />
        <stop offset="1" stopColor="#355f46" />
      </linearGradient>
      <linearGradient
        id="manifoliaLeafRight"
        x1="36"
        y1="18"
        x2="18"
        y2="32"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#93aa80" />
        <stop offset="1" stopColor="#426d52" />
      </linearGradient>
    </defs>
  </svg>
);

const iconButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-transparent bg-transparent text-[var(--mf-explorer-text-muted)] transition-colors hover:border-[var(--mf-explorer-border-soft)] hover:bg-[var(--mf-explorer-control-hover)] hover:text-[var(--mf-explorer-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mf-explorer-focus-ring)]";

export const ExplorerSidebarHeader = ({
  allTags: _allTags,
  onCreateRootFolder,
  onCreateCardSet,
  onCreateCard,
  onAddDocument,
  onBulkImport,
  canCreateCardSet = false,
  canCreateCard = false,
  canAddDocuments = false,
  canBulkImport = false,
  preferDirectRootFolderCreate: _preferDirectRootFolderCreate = false,
  compact = false,
}: ExplorerSidebarHeaderProps) => {
  const suppressCloseAutoFocusRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isFolderListSectionCollapsed = useExplorerStore(
    (state) => state.isFolderListSectionCollapsed,
  );
  const toggleFolderListSectionCollapsed = useExplorerStore(
    (state) => state.toggleFolderListSectionCollapsed,
  );

  const handleCreateRootFolder = useCallback(() => {
    if (isFolderListSectionCollapsed) {
      toggleFolderListSectionCollapsed();
    }

    void onCreateRootFolder?.();
  }, [
    isFolderListSectionCollapsed,
    onCreateRootFolder,
    toggleFolderListSectionCollapsed,
  ]);

  const rootFolderCreateAction = onCreateRootFolder
    ? handleCreateRootFolder
    : undefined;

  const menuActions = useMemo(
    () =>
      buildExplorerCreateMenuActions({
        canCreateCardSet,
        canCreateCard,
        canAddDocuments,
        canBulkImport,
        onCreateRootFolder: rootFolderCreateAction,
        onCreateCardSet,
        onCreateCard,
        onAddDocument,
        onBulkImport,
      }),
    [
      canAddDocuments,
      canBulkImport,
      canCreateCard,
      canCreateCardSet,
      rootFolderCreateAction,
      onAddDocument,
      onBulkImport,
      onCreateCard,
      onCreateCardSet,
    ],
  );

  return (
    <div
      className={cn(
        "explorer-sidebar-brand-header shrink-0 border-b border-[var(--mf-explorer-border-soft)]",
        compact ? "px-4 pb-3 pt-4" : "px-5 pb-4 pt-5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="explorer-sidebar-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]">
          <ManifoliaLeafMark />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-[21px] font-semibold leading-7 tracking-[0.01em] text-[var(--mf-explorer-logo-text)]">
            Manifolia
          </div>
        </div>

        <DropdownMenu
          modal={false}
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open && !suppressCloseAutoFocusRef.current) {
              suppressCloseAutoFocusRef.current = false;
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="操作メニュー"
              aria-label="操作メニューを開く"
              className={iconButtonClassName}
            >
              <EllipsisIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>

          <ExplorerMenuPanel
            actions={menuActions}
            align="end"
            variant="create"
            closeMenu={() => {
              suppressCloseAutoFocusRef.current = true;
              setMenuOpen(false);
            }}
            onCloseAutoFocus={(event) => {
              if (!suppressCloseAutoFocusRef.current) return;
              suppressCloseAutoFocusRef.current = false;
              event.preventDefault();
            }}
          />
        </DropdownMenu>
      </div>

      <div className="mt-5 flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[var(--mf-explorer-brand-soft)] text-[var(--mf-explorer-brand)]">
          <ClockIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold leading-5 text-[var(--mf-explorer-text)]">
            クイックアクセス
          </div>
        </div>

        <button
          type="button"
          title="ピン留め"
          aria-label="ピン留め"
          className={cn(
            iconButtonClassName,
            "[--explorer-chrome-pin-stroke:var(--mf-explorer-text-muted)] hover:[--explorer-chrome-pin-stroke:var(--mf-explorer-brand)]",
          )}
        >
          <ExplorerChromePinIcon className="h-4 w-4" />
        </button>

        <ChevronDownIcon className="h-4 w-4 text-[var(--mf-explorer-text-faint)]" />
      </div>
    </div>
  );
};
