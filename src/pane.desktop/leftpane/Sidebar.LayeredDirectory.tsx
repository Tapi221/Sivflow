import { useCallback, useMemo } from "react";
import { ToggleFolderTag, type FolderTagTab } from "@/chip/toggle/Toggle.foldertag";
import { DEFAULT_NEW_PROJECT_NAME } from "@/components/folder/explorer/model/utils";
import { useFolderCommands } from "@/hooks/folder/useFolderCommands";
import { useFolderTagModeStore } from "@/hooks/folder/useFolderTagModeStore";
import { LibraryHierarchySidebar, ProjectListSidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";
import { TagTreeSidebar } from "@/pane.desktop/leftpane/folder/TagTreeSidebar";

type IconProps = {
  className?: string;
};

const PROJECT_SECTION_LABEL = "MY PROJECTS";
const TAG_SECTION_LABEL = "MY TAG TREE";
const ADD_PROJECT_ARIA_LABEL = "プロジェクトを追加";

const IconPlus = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);

const SidebarLayeredDirectory = () => {
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const setFolderTagMode = useFolderTagModeStore((state) => state.setFolderTagMode);
  const { createFolder } = useFolderCommands();
  const sectionLabel = folderTagMode === "tag" ? TAG_SECTION_LABEL : PROJECT_SECTION_LABEL;
  const folderTagTabs = useMemo<FolderTagTab[]>(() => [{ value: "folder", label: "Folder", onClick: () => setFolderTagMode("folder") }, { value: "tag", label: "Tag", onClick: () => setFolderTagMode("tag") }], [setFolderTagMode]);

  const handleCreateRootFolder = useCallback(() => {
    void createFolder(DEFAULT_NEW_PROJECT_NAME);
  }, [createFolder]);

  return (
    <div className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[#5f6672] antialiased">
      <div className="shrink-0 px-3 pb-5 pt-3">
        <ToggleFolderTag activeMode={folderTagMode} tabs={folderTagTabs} />
      </div>
      <div className="shrink-0 pb-1 pl-3 pr-2 pt-0">
        <div className="flex h-6 items-center gap-1.5">
          <div className="min-w-0 flex-1 text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[#9a9a9a]">
            <span className="block truncate">{sectionLabel}</span>
          </div>
          {folderTagMode !== "tag" ? (
            <button type="button" onClick={handleCreateRootFolder} aria-label={ADD_PROJECT_ARIA_LABEL} title={ADD_PROJECT_ARIA_LABEL} className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#8c8c8c] transition hover:bg-[#ececec] hover:text-[#5f6574] active:scale-[0.94]">
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {folderTagMode === "tag" ? <TagTreeSidebar /> : <LibraryHierarchySidebar />}
      </div>
    </div>
  );
};

export { LibraryHierarchySidebar, ProjectListSidebar, SidebarLayeredDirectory, TagTreeSidebar };
