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


const MoreIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
  </UiIcon>
);

const PinIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <path d="M9 4.75h6l-.65 5.2 3.15 3.15v1.9H6.5v-1.9l3.15-3.15L9 4.75Z" />
    <path d="M12 15v5" />
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
    <div className="flex min-h-[56px] items-center justify-between px-5 py-2">
      <div className="min-w-0 text-[17px] font-semibold tracking-[-0.01em] text-[#1f2933]">
        エクスプローラー
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="その他"
          aria-label="その他"
          className={iconButtonClassName}
        >
          <MoreIcon className="h-3.5 w-3.5" />
        </button>

        <span title="ピン留め" aria-label="ピン留め" className={passiveIconClassName}>
          <PinIcon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="sr-only">
        <button
          type="button"
          title="ブックマーク"
          aria-label="ブックマークを開く"
          onClick={() => {
            void onOpenBookmarks?.();
          }}
        >
          <BookmarkIcon />
        </button>

        <button
          type="button"
          title="アウトライン"
          aria-label="アウトラインを開く"
          onClick={() => {
            void onOpenOutline?.();
          }}
        >
          <OutlineIcon />
        </button>

        {shouldUseDirectRootFolderCreate ? (
          <button
            type="button"
            title="新規フォルダを追加"
            aria-label="新規フォルダを追加"
            onClick={() => {
              void onCreateRootFolder?.();
            }}
          >
            <Plus />
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
              <button type="button" title="追加" aria-label="追加メニューを開く">
                <Plus />
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

        <TagFilterPopover allTags={allTags} />
        <SettingsIcon />
      </div>
    </div>
  );
};
