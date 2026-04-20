import { useMemo, useRef, useState } from "react";
import { Folder, Plus } from "@/ui/icons";
import { TagFilterPopover } from "./TagFilterPopover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExplorerMenuPanel } from "@/components/folder/components/menus/ExplorerMenuPanel";
import { buildExplorerCreateMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";

interface ExplorerSidebarHeaderProps {
  allTags: string[];
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onAddDocument?: () => void | Promise<void>;
  onBulkImport?: () => void | Promise<void>;
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  preferDirectRootFolderCreate?: boolean;
}

export const ExplorerSidebarHeader = ({
  allTags,
  onCreateRootFolder,
  onCreateCardSet,
  onAddDocument,
  onBulkImport,
  canCreateCardSet = false,
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
        canAddDocuments,
        canBulkImport,
        onCreateRootFolder,
        onCreateCardSet,
        onAddDocument,
        onBulkImport,
      }),
    [
      canAddDocuments,
      canBulkImport,
      canCreateCardSet,
      onAddDocument,
      onBulkImport,
      onCreateCardSet,
      onCreateRootFolder,
    ],
  );

  const shouldUseDirectRootFolderCreate =
    preferDirectRootFolderCreate &&
    Boolean(onCreateRootFolder) &&
    !canCreateCardSet &&
    !canAddDocuments;

  return (
    <div
      className="ds-nav-tabs flex items-center justify-between px-2"
      style={{ height: 36 }}
    >
      <div className="flex min-w-0 items-center gap-2 px-2">
        <Folder className="h-3.5 w-3.5 text-[var(--sidebar-text-muted,#6e6e80)]" />
        <span className="truncate text-xs font-medium text-[var(--sidebar-text-muted,#6e6e80)]">
          フォルダ
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {shouldUseDirectRootFolderCreate ? (
          <button
            type="button"
            title="新規フォルダを追加"
            aria-label="新規フォルダを追加"
            className="ds-nav-action ds-nav-action--icon flex items-center"
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
                className="ds-nav-action ds-nav-action--icon flex items-center"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <ExplorerMenuPanel
              actions={createMenuActions}
              align="end"
              className="w-44"
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
      </div>
    </div>
  );
};
