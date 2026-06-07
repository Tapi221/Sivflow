import TreeViewLayout from "@/components/folder/layout/TreeViewLayout";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import { useFoldersRead } from "@/hooks/folder/useFoldersRead";

const WorkspaceScreen = () => {
  const { folders } = useFoldersRead();

  return (
    <CarvePanel>
      <TreeViewLayout
        folders={folders}
        isSectionListMode={true}
        selectedFolderId={null}
        selectedItem={null}
        selectedCardId={null}
        selectedDocumentId={null