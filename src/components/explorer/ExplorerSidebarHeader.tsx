import { useMemo, useRef, useState } from "react";
import { Plus } from "@/ui/icons";
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
      className="flex items-center justify-end px-2.5 pt-1.5 pb-1"
      style={{ minHeight: 34 }}
    >
      <div className="flex shrink-0 items-center gap-1">
        {shouldUseDirectRootFolderCreate ? (
          <button
            type="button"
            title="新規フォルダを追加"
            aria-label="新規フォルダを追加"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)] transition-colors hover:bg-[#f9fafb] hover:text-[#4b5563]"
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
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)] transition-colors hover:bg-[#f9fafb] hover:text-[#4b5563]"
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

        <TagFilterPopover
          allTags={allTags}
          className="h-7 w-7 rounded-lg border-0 bg-transparent text-[rgba(107,114,128,0.92)] transition-colors hover:bg-[#f9fafb] hover:text-[#4b5563]"
        />
      </div>
    </div>
  );
};
