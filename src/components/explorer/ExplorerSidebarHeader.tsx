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

const EllipsisIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.8} {...props}>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </UiIcon>
);

const PinIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <path d="M9.25 3.75h5.5" />
    <path d="M10.25 3.75v5.15l-2.75 2.35v1.25h9v-1.25l-2.75-2.35V3.75" />
    <path d="M12 12.5v6" />
  </UiIcon>
);

const iconButtonClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)] transition-colors hover:bg-[#f9fafb] hover:text-[#4b5563]";

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
}: ExplorerSidebarHeaderProps) => {
  const suppressCloseAutoFocusRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuActions = useMemo(
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

  return (
    <div className="border-b border-transparent px-4 pt-5 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[18px] font-semibold leading-7 text-[#111827]">
          エクスプローラー
        </h2>

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

        <button
          type="button"
          title="ピン留め"
          aria-label="ピン留め"
          className={iconButtonClassName}
        >
          <PinIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
