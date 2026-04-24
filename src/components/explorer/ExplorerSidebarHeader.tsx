import { useMemo, useRef, useState } from "react";
import { Plus } from "@/ui/icons";
import { UiIcon } from "@/ui/UiIcon";
import type { UiIconProps } from "@/ui/UiIcon";
import { TagFilterPopover } from "./TagFilterPopover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExplorerMenuPanel } from "@/components/folder/components/menus/ExplorerMenuPanel";
import { buildExplorerCreateMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";

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
}

const BookmarkIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <path d="M7 4.75h10a1 1 0 0 1 1 1V20l-6-3.5L6 20V5.75a1 1 0 0 1 1-1Z" />
  </UiIcon>
);

const OutlineIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
    <path d="M9 7h10" />
    <path d="M9 12h10" />
    <path d="M9 17h10" />
  </UiIcon>
);

const SettingsIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
    <path
      d={[
        "M19.43 12.98a7.95 7.95 0 0 0 .05-.98 7.95 7.95 0 0 0-.05-.98",
        "l2.02-1.58-1.92-3.32-2.38.96a7.5 7.5 0 0 0-1.7-.98L15.08 3.5h-3.84",
        "l-.37 2.6a7.5 7.5 0 0 0-1.7.98l-2.38-.96-1.92 3.32 2.02 1.58",
        "a7.95 7.95 0 0 0-.05.98c0 .33.02.66.05.98l-2.02 1.58 1.92 3.32 2.38-.96",
        "c.52.4 1.09.73 1.7.98l.37 2.6h3.84l.37-2.6a7.5 7.5 0 0 0 1.7-.98",
        "l2.38.96 1.92-3.32-2.02-1.58Z",
      ].join(" ")}
    />
  </UiIcon>
);

const iconButtonClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)] transition-colors hover:bg-[#f9fafb] hover:text-[#4b5563]";

const passiveIconClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)]";

export const ExplorerSidebarHeader = ({
  allTags,
  onOpenBookmarks,
  onOpenOutline,
  onCreateRootFolder,
  onCreateCardSet,
  onCreateCard,
  onAddDocument,
  onBulkImport,
  canCreateCardSet = false,
  canCreateCard = false,
  canAddDocuments = false,
  canBulkImport = false,
  preferDirectRootFolderCreate = false,
}: ExplorerSidebarHeaderProps) => {
  const suppressCloseAutoFocusRef = useRef(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const createMenuActions = useMemo(
    () =>
      buildExplorerCreateMenuActions({
        canCreateCardSet,
        canCreateCard,
        canAddDocuments,
        canBulkImport,
        onCreateRootFolder,
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
      onAddDocument,
      onBulkImport,
      onCreateCard,
      onCreateCardSet,
      onCreateRootFolder,
    ],
  );

  const shouldUseDirectRootFolderCreate =
    preferDirectRootFolderCreate &&
    Boolean(onCreateRootFolder) &&
    !canCreateCardSet &&
    !canCreateCard &&
    !canAddDocuments &&
    !canBulkImport;

  return (
    <div
      className="flex items-center justify-end px-2.5 pt-1.5 pb-1"
      style={{ minHeight: 34 }}
    >
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="ブックマーク"
          aria-label="ブックマークを開く"
          className={iconButtonClassName}
          onClick={() => {
            void onOpenBookmarks?.();
          }}
        >
          <BookmarkIcon className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          title="アウトライン"
          aria-label="アウトラインを開く"
          className={iconButtonClassName}
          onClick={() => {
            void onOpenOutline?.();
          }}
        >
          <OutlineIcon className="h-3.5 w-3.5" />
        </button>

        {shouldUseDirectRootFolderCreate ? (
          <button
            type="button"
            title="新規フォルダを追加"
            aria-label="新規フォルダを追加"
            className={iconButtonClassName}
            onClick={() => {
              void onCreateRootFolder?.();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <DropdownMenu
            modal={false}
            open={createMenuOpen}
            onOpenChange={(open) => {
              setCreateMenuOpen(open);
              if (!open && !suppressCloseAutoFocusRef.current) {
                suppressCloseAutoFocusRef.current = false;
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="追加"
                aria-label="追加メニューを開く"
                className={iconButtonClassName}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>

            <ExplorerMenuPanel
              actions={createMenuActions}
              align="end"
              variant="create"
              closeMenu={() => {
                suppressCloseAutoFocusRef.current = true;
                setCreateMenuOpen(false);
              }}
              onCloseAutoFocus={(event) => {
                if (!suppressCloseAutoFocusRef.current) return;
                suppressCloseAutoFocusRef.current = false;
                event.preventDefault();
              }}
            />
          </DropdownMenu>
        )}

        <TagFilterPopover
          allTags={allTags}
          className="h-7 w-7 rounded-lg border-0 bg-transparent text-[#888780] transition-colors hover:bg-[#f9fafb] hover:text-[#888780]"
        />

        <span title="設定" aria-label="設定" className={passiveIconClassName}>
          <SettingsIcon className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
};
