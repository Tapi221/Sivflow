import CreateCardSelectionDialog from "@/components/card/overlays/CreateCardSelectionDialog";
import CreationModeDialog from "@/components/card/overlays/CreationModeDialog";

interface TreeViewDialogsProps {
  isCreateSelectionOpen: boolean;
  setIsCreateSelectionOpen: (open: boolean) => void;
  isModeSelectionOpen: boolean;
  setIsModeSelectionOpen: (open: boolean) => void;
  onSelectCreateMode: (mode: "single" | "continuous") => void;
  onSelectDetailedMode: (
    mode: string,
    options?: { hideTitle?: boolean },
  ) => void;
}

export const TreeViewDialogs = (
  {
    isCreateSelectionOpen,
    setIsCreateSelectionOpen,
    isModeSelectionOpen,
    setIsModeSelectionOpen,
    onSelectCreateMode,
    onSelectDetailedMode,
  }: TreeViewDialogsProps
) => {
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
    </>
  );
};
