import { useMemo, useRef, useState } from "react";
import { UiIcon } from "@/ui/UiIcon";
import type { UiIconProps } from "@/ui/UiIcon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExplorerMenuPanel } from "@/components/folder/components/menus/ExplorerMenuPanel";
import { buildExplorerCreateMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { ExplorerChromePinIcon } from "@/components/explorer/icons";
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

const FolderIcon = ({ size = 16, ...props }: UiIconProps) => (
  <UiIcon size={size} strokeWidth={1.7} {...props}>
    <path d="M3.75 6.25V16.25C3.75 17.08 4.42 17.75 5.25 17.75H18.75C19.58 17.75 20.25 17.08 20.25 16.25V8.25C20.25 7.42 19.58 6.75 18.75 6.75H12.25L10.7 4.9C10.42 4.56 10 4.25 9.55 4.25H5.25C4.42 4.25 3.75 4.92 3.75 5.75V6.25Z" />
  </UiIcon>
);

const iconButtonClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-[5px] border-0 bg-transparent text-[#6b6b6b] transition-colors hover:bg-[#f0f0f0] hover:text-[#1a1a1a]";

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
      onCreateRootFolder,
      onAddDocument,
      onBulkImport,
      onCreateCard,
      onCreateCardSet,
    ],
  );

  return (
    <div
      className={cn(
        compact
          ? "border-b border-[#ebebeb] px-3 py-2"
          : "border-b border-transparent px-4 pt-5 pb-3",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {compact ? (
          <FolderIcon className="h-4 w-4 shrink-0 text-[#8b8b8b]" />
        ) : null}

        <h2
          className={cn(
            "min-w-0 flex-1 truncate font-semibold text-[#1a1a1a]",
            compact ? "text-[13px] leading-6" : "text-[18px] leading-7",
          )}
        >
          {compact ? "クイックアクセス" : "エクスプローラー"}
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
          className={cn(
            iconButtonClassName,
            "[--explorer-chrome-pin-stroke:#8b8a84] hover:[--explorer-chrome-pin-stroke:#1a1a1a]",
          )}
        >
          <ExplorerChromePinIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
