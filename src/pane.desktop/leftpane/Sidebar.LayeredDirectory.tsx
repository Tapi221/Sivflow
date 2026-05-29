import { LibraryHierarchySidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";

const PROJECT_SECTION_LABEL = "MYPROJECTS";

const SidebarLayeredDirectory = () => (
  <div className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[#5f6672] antialiased">
    <div className="shrink-0 pb-1 pl-3 pr-2 pt-2 text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[#9a9a9a]">
      {PROJECT_SECTION_LABEL}
    </div>
    <div className="min-h-0 flex-1">
      <LibraryHierarchySidebar />
    </div>
  </div>
);

export { LibraryHierarchySidebar, SidebarLayeredDirectory };
