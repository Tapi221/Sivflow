import { useMemo, useRef, useState } from "react";

import { UiIcon } from "@/ui/UiIcon";
import type { UiIconProps } from "@/ui/UiIcon";
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

const MoreHorizontalIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.8} {...props}>
    <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
  </UiIcon>
);

const PinIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <path d="M9.25 4.75h5.5" />
    <path d="M10.25 4.75v5.5l-2.5 2.5v1.5h8.5v-1.5l-2.5-2.5v-5.5" />
    <path d="M12 14.25v5" />
  </UiIcon>
);

const headerIconButtonClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)] transition-colors hover:bg-[#f9fafb] hover:text-[#4b5563]";

const passiveHeaderIconClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)]";

export const ExplorerSidebarHeader = ({
  allTags,
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

  const hasCreateActions = createMenuActions.length > 0;

  return (
    <div
      className="flex items-center justify-between gap-3 px-5 pb-2 pt-4"
      style={{ minHeight: 52 }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-[15px] font-semibold tracking-[0.01em] text-[#3f3e39]"
          title="エクスプローラー"
        >
          エクスプローラー
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {shouldUseDirectRootFolderCreate ? (
          <button
            type="button"
            title="新規フォルダを追加"
            aria-label="新規フォルダを追加"
            className={headerIconButtonClassName}
            onClick={() => {
              void onCreateRootFolder?.();
            }}
          >
            <MoreHorizontalIcon className="h-3.5 w-3.5" />
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
            <DropdownMenuTrigger asChild disabled={!hasCreateActions}>
              <button
                type="button"
                title="メニュー"
                aria-label="エクスプローラーのメニューを開く"
                className={headerIconButtonClassName}
                disabled={!hasCreateActions}
              >
                <MoreHorizontalIcon className="h-3.5 w-3.5" />
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

        <span
          title="ピン留め"
          aria-label="ピン留め"
          className={passiveHeaderIconClassName}
        >
          <PinIcon className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
};
