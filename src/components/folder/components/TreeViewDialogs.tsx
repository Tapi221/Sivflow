import type { ComponentProps } from "react";
import CreateCardSelectionDialog from "@/components/card/overlays/CreateCardSelectionDialog";
import CreationModeDialog from "@/components/card/overlays/CreationModeDialog";
import { ViewManagerDialog } from "@/components/folder/components/dialogs/ViewManagerDialog";
import type { ViewDef, ViewKind } from "@/components/folder/viewTypes";

type ViewManagerTags = ComponentProps<typeof ViewManagerDialog>["tags"];

interface TreeViewDialogsProps {
  isCreateSelectionOpen: boolean;
  setIsCreateSelectionOpen: (open: boolean) => void;
  isModeSelectionOpen: boolean;
  setIsModeSelectionOpen: (open: boolean) => void;
  isViewManagerOpen: boolean;
  setIsViewManagerOpen: (open: boolean) => void;
  onSelectCreateMode: (mode: "single" | "continuous") => void;
  onSelectDetailedMode: (
    mode: string,
    options?: { hideTitle?: boolean },
  ) => void;
  views: ViewDef[];
  tags: ViewManagerTags;
  categoryNameEntries: Array<[string, string]>;
  onAddView: (kind: ViewKind) => void | Promise<void>;
  onRenameView: (viewId: string, name: string) => void | Promise<void>;
  onDeleteView: (viewId: string) => void | Promise<void>;
  onUpdateCategoryName: (
    categoryId: string,
    displayName: string,
  ) => void | Promise<void>;
  onUpdateUngroupedLabel: (
    viewId: string,
    label: string,
  ) => void | Promise<void>;
  onUpdateViewOptions: (
    viewId: string,
    options: NonNullable<ViewDef["options"]>,
  ) => void | Promise<void>;
}

export function TreeViewDialogs({
  isCreateSelectionOpen,
  setIsCreateSelectionOpen,
  isModeSelectionOpen,
  setIsModeSelectionOpen,
  isViewManagerOpen,
  setIsViewManagerOpen,
  onSelectCreateMode,
  onSelectDetailedMode,
  views,
  tags,
  categoryNameEntries,
  onAddView,
  onRenameView,
  onDeleteView,
  onUpdateCategoryName,
  onUpdateUngroupedLabel,
  onUpdateViewOptions,
}: TreeViewDialogsProps) {
  return (
    <>
      <CreateCardSelectionDialog
        open={isCreateSelectionOpen}
        onOpenChange={setIsCreateSelectionOpen}
        onSelectMode={onSelectCreateMode}
      />

      <CreationModeDialog
        open={isModeSelectionOpen}
        onOpenChange={setIsModeSelectionOpen}
        onSelectMode={onSelectDetailedMode}
        onBack={() => {
          setIsModeSelectionOpen(false);
          setIsCreateSelectionOpen(true);
        }}
      />

      <ViewManagerDialog
        open={isViewManagerOpen}
        onOpenChange={setIsViewManagerOpen}
        views={views}
        tags={tags}
        categoryNameEntries={categoryNameEntries}
        onAddView={onAddView}
        onRenameView={onRenameView}
        onDeleteView={onDeleteView}
        onUpdateCategoryName={onUpdateCategoryName}
        onUpdateUngroupedLabel={onUpdateUngroupedLabel}
        onUpdateViewOptions={onUpdateViewOptions}
      />
    </>
  );
}
