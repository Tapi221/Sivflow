import { useCallback, useMemo, useRef, useState } from "react";
import type { Locale } from "@shared/i18n/locale.store";
import { useLocaleStore } from "@shared/i18n/locale.store";
import { Tag } from "@web-renderer/chip/icons";
import { CalendarIcon, GalleryIcon, HomeIcon, SettingIcon, SidebarOpenIcon } from "@web-renderer/chip/icons/icons.sidebar";
import { TagFilterPopover } from "@web-renderer/chip/panel/buttonclickpanel.desktop/ButtonClickPanel.TagFilter";
import { RightClickPanel } from "@web-renderer/chip/panel/rightclickpanel";
import { clampRightClickPanelPosition, resolveRightClickPanelTextWidth, RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE, useRightClickPanelDismiss } from "@web-renderer/chip/panel/rightClickPanel.utils";
import { cn } from "@web-renderer/lib/utils";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useCardSets } from "@/components/card/hooks/useCardSets";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { getFolderId } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useFolderCommands } from "@/features/folder/hooks/useFolderCommands";
import { useFoldersRead } from "@/features/folder/hooks/useFoldersRead";
import { useNotes } from "@/features/note/hooks/useNotes";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useTags } from "@/features/settings/hooks/useTags";
import type { AppLayoutOutletContext } from "@/layout/AppLayout";
import { LibraryHierarchySidebar, ProjectListSidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";
import { TagTreeSidebar } from "@/pane.desktop/leftpane/folder/TagTreeSidebar";
import { useFolderTagModeStore } from "@/pane.desktop/leftpane/folder/useFolderTagModeStore";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceTab } from "@/pane.desktop/tab.desktopnative/Tab";



type IconProps = {
  className?: string;
};
type ProjectAddMenuActionId = "create-note" | "create-card-set" | "create-folder" | "import-pdf";
type ProjectAddMenuItemDefinition = {
  id: ProjectAddMenuActionId;
  label: string;
};
type ProjectAddMenuState = {
  x: number;
  y: number;
  width: number;
};
type ProjectAddMenuProps = {
  x: number;
  y: number;
  width: number;
  itemDefinitions: readonly ProjectAddMenuItemDefinition[];
  ariaLabel: string;
  menuRef: RefObject<HTMLDivElement | null>;
  onCreateNote: () => void;
  onCreateCardSet: () => void;
  onCreateFolder: () => void;
  onImportPdf: () => void;
};
type SidebarLayeredDirectoryProps = {
  calendarContent?: ReactNode;
  onToggleLeftPanel?: () => void;
  onOpenSettings?: () => void;
};
type SidebarLayeredDirectoryCopy = {
  workspaceName: (ownerName: string) => string;
  workspaceOpenAriaLabel: (workspaceName: string) => string;
  sidebarCloseAriaLabel: string;
  workspaceNavigationAriaLabel: string;
  homeLabel: string;
  libraryLabel: string;
  tagsLabel: string;
  scheduleLabel: string;
  exploreLabel: string;
  settingsLabel: string;
  favoriteSectionLabel: string;
  favoriteEmptyMessage: string;
  projectSectionLabel: string;
  tagSectionLabel: string;
  defaultNewTagName: string;
  defaultNewNoteName: string;
  defaultNewFolderName: string;
  defaultNewProjectName: string;
  defaultNewCardSetName: string;
  importPdfLabel: string;
  untitledFolderName: string;
  addProjectAriaLabel: string;
  addSelectedFolderContentAriaLabel: string;
  addTagAriaLabel: string;
  filterAriaLabel: string;
  openProjectListAriaLabel: string;
  projectAddMenuAriaLabel: string;
  libraryTabTitle: string;
};



const WORKSPACE_OWNER_FALLBACK_NAME = "Akari T";
const WORKSPACE_AVATAR_FALLBACK = "A";
const SIDEBAR_LAYERED_DIRECTORY_COPY: Record<Locale, SidebarLayeredDirectoryCopy> = {
  ja: {
    workspaceName: (ownerName) => `${ownerName}のWorkspace`,
    workspaceOpenAriaLabel: (workspaceName) => `${workspaceName}を開く`,
    sidebarCloseAriaLabel: "サイドバーを閉じる",
    workspaceNavigationAriaLabel: "ワークスペースナビゲーション",
    homeLabel: "ホーム",
    libraryLabel: "ライブラリ",
    tagsLabel: "タグ",
    scheduleLabel: "カレンダー",
    exploreLabel: "Explore",
    settingsLabel: "設定",
    favoriteSectionLabel: "お気に入り",
    favoriteEmptyMessage: "プロジェクトをお気に入りに追加すると、ここからすぐ開けます",
    projectSectionLabel: "プロジェクト",
    tagSectionLabel: "タグツリー",
    defaultNewTagName: "新規タグ",
    defaultNewNoteName: "新規ノート",
    defaultNewFolderName: "新規フォルダ",
    defaultNewProjectName: "新規プロジェクト",
    defaultNewCardSetName: "新規カードセット",
    importPdfLabel: "PDFを追加",
    untitledFolderName: "無題のフォルダ",
    addProjectAriaLabel: "プロジェクトを追加",
    addSelectedFolderContentAriaLabel: "選択中のフォルダに追加",
    addTagAriaLabel: "タグを追加",
    filterAriaLabel: "絞り込みを開く",
    openProjectListAriaLabel: "プロジェクト一覧を開く",
    projectAddMenuAriaLabel: "project add menu",
    libraryTabTitle: "Library",
  },
  en: {
    workspaceName: (ownerName) => `${ownerName}'s Workspace`,
    workspaceOpenAriaLabel: (workspaceName) => `Open ${workspaceName}`,
    sidebarCloseAriaLabel: "Close sidebar",
    workspaceNavigationAriaLabel: "Workspace navigation",
    homeLabel: "Home",
    libraryLabel: "Library",
    tagsLabel: "Tags",
    scheduleLabel: "Calendar",
    exploreLabel: "Explore",
    settingsLabel: "Settings",
    favoriteSectionLabel: "Favorites",
    favoriteEmptyMessage: "Add projects to favorites to open them quickly here",
    projectSectionLabel: "Projects",
    tagSectionLabel: "Tag tree",
    defaultNewTagName: "New tag",
    defaultNewNoteName: "New note",
    defaultNewFolderName: "New folder",
    defaultNewProjectName: "New project",
    defaultNewCardSetName: "New card set",
    importPdfLabel: "Add PDF",
    untitledFolderName: "Untitled folder",
    addProjectAriaLabel: "Add project",
    addSelectedFolderContentAriaLabel: "Add content to selected folder",
    addTagAriaLabel: "Add tag",
    filterAriaLabel: "Open filter",
    openProjectListAriaLabel: "Open project list",
    projectAddMenuAriaLabel: "project add menu",
    libraryTabTitle: "Library",
  },
  zh: {
    workspaceName: (ownerName) => `${ownerName} 的工作区`,
    workspaceOpenAriaLabel: (workspaceName) => `打开${workspaceName}`,
    sidebarCloseAriaLabel: "关闭侧边栏",
    workspaceNavigationAriaLabel: "工作区导航",
    homeLabel: "首页",
    libraryLabel: "资料库",
    tagsLabel: "标签",
    scheduleLabel: "日历",
    exploreLabel: "探索",
    settingsLabel: "设置",
    favoriteSectionLabel: "收藏",
    favoriteEmptyMessage: "将项目添加到收藏后，可从这里快速打开",
    projectSectionLabel: "项目",
    tagSectionLabel: "标签树",
    defaultNewTagName: "新建标签",
    defaultNewNoteName: "新建笔记",
    defaultNewFolderName: "新建文件夹",
    defaultNewProjectName: "新建项目",
    defaultNewCardSetName: "新建卡片集",
    importPdfLabel: "添加 PDF",
    untitledFolderName: "未命名文件夹",
    addProjectAriaLabel: "添加项目",
    addSelectedFolderContentAriaLabel: "向所选文件夹添加内容",
    addTagAriaLabel: "添加标签",
    filterAriaLabel: "打开筛选",
    openProjectListAriaLabel: "打开项目列表",
    projectAddMenuAriaLabel: "项目添加菜单",
    libraryTabTitle: "资料库",
  },
};
const PROJECT_ADD_MENU_PANEL_ID = "layered-project-add-menu";
const EMPTY_COLLECTION: never[] = [];
const OPENABLE_ENTITY_SELECTOR = "[data-directory-entity-kind='cardSet'], [data-directory-entity-kind='document'], [data-directory-entity-kind='note']";
const ROOT_CLASS_NAME = "relative isolate z-[1] flex h-full min-h-0 w-60 min-w-60 shrink-0 flex-col overflow-hidden bg-transparent font-sans text-stone-500 antialiased [-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag] [&_svg]:pointer-events-none";
const PRIMARY_NAV_CLASS_NAME = "flex flex-col gap-2.5 px-4 pb-3 pt-3.5";
const WORKSPACE_HEADER_CLASS_NAME = "flex min-h-6 items-center gap-2";
const WORKSPACE_TOGGLE_CLASS_NAME = "flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-md border-0 bg-transparent p-0 text-zinc-400 outline-none transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:bg-stone-100 focus-visible:text-stone-800 disabled:opacity-55";
const WORKSPACE_BUTTON_CLASS_NAME = "flex min-w-0 flex-1 items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 text-left text-sm font-semibold leading-5 text-stone-950 outline-none transition-colors hover:bg-stone-100 focus-visible:bg-stone-100";
const WORKSPACE_AVATAR_CLASS_NAME = "flex h-6 min-w-6 items-center justify-center rounded-md bg-stone-100 text-xs font-bold leading-none text-stone-600";
const NAV_CLASS_NAME = "flex w-full items-center justify-start gap-2";
const NAV_ICON_CLASS_NAME = "h-5 min-w-5 w-5";
const SECTION_STRIP_CLASS_NAME = "flex flex-col gap-3.5 py-1";
const FAVORITES_SECTION_CLASS_NAME = "flex min-w-0 flex-col gap-2 px-4";
const SECTION_CLASS_NAME = "flex min-w-0 flex-col gap-2";
const SECTION_ROW_CLASS_NAME = "flex min-h-6 items-center gap-1 px-4";
const SECTION_HEADING_CLASS_NAME = "m-0 text-sm font-bold leading-5 tracking-normal text-stone-950";
const SECTION_HEADING_BUTTON_CLASS_NAME = "flex min-w-0 flex-1 items-center gap-2 border-0 bg-transparent p-0 text-left text-sm font-bold leading-5 tracking-normal text-stone-950";
const SECTION_CHEVRON_CLASS_NAME = "h-3.5 min-w-3.5 w-3.5 text-zinc-400";
const ADD_BUTTON_CLASS_NAME = "flex h-5 min-h-5 w-5 min-w-5 items-center justify-center rounded-full border-0 bg-transparent p-0 text-stone-500 outline-none transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:bg-stone-100 focus-visible:text-stone-800";
const EMPTY_MESSAGE_CLASS_NAME = "m-0 pr-3 text-xs font-bold leading-4 tracking-normal text-stone-500";
const PROJECT_ADD_MENU_ITEM_CLASS_NAME = "flex min-h-8 w-full items-center px-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none";



const buildProjectAddMenuItemDefinitions = (copy: SidebarLayeredDirectoryCopy): ProjectAddMenuItemDefinition[] => [
  { id: "create-note", label: copy.defaultNewNoteName },
  { id: "create-card-set", label: copy.defaultNewCardSetName },
  { id: "create-folder", label: copy.defaultNewFolderName },
  { id: "import-pdf", label: copy.importPdfLabel },
];
const getFolderName = (folder: FolderTreeNode, untitledFolderName: string): string => {
  const name = folder.folderName ?? folder.folder_name;
  return typeof name === "string" && name.trim() ? name.trim() : untitledFolderName;
};
const getUniqueTagName = (baseName: string, tagNames: readonly string[]): string => {
  const usedTagNameSet = new Set(tagNames.map((tagName) => tagName.trim().toLowerCase()).filter((tagName) => tagName.length > 0));
  const normalizedBaseName = baseName.toLowerCase();
  if (!usedTagNameSet.has(normalizedBaseName)) return baseName;
  let suffix = 2;
  while (usedTagNameSet.has(`${normalizedBaseName} ${suffix}`)) suffix += 1;
  return `${baseName} ${suffix}`;
};
const createFolderLookup = (rootFolders: FolderTreeNode[], getChildFolders: (folderId: string) => FolderTreeNode[]): Map<string, FolderTreeNode> => {
  const map = new Map<string, FolderTreeNode>();
  const stack = [...rootFolders];
  while (stack.length > 0) {
    const folder = stack.pop();
    if (!folder) continue;
    const folderId = getFolderId(folder);
    if (!folderId || map.has(folderId)) continue;
    map.set(folderId, folder);
    stack.push(...getChildFolders(folderId));
  }
  return map;
};
const getWorkspaceOwnerName = (displayName: string | null | undefined, email: string | null | undefined): string => {
  const trimmedDisplayName = displayName?.trim();
  if (trimmedDisplayName) return trimmedDisplayName;
  const emailLocalPart = email?.split("@")[0]?.trim();
  if (emailLocalPart) return emailLocalPart;
  return WORKSPACE_OWNER_FALLBACK_NAME;
};
const getWorkspaceInitial = (workspaceOwnerName: string): string => {
  const initial = workspaceOwnerName.trim().charAt(0);
  return initial ? initial.toUpperCase() : WORKSPACE_AVATAR_FALLBACK;
};
const getProjectAddMenuWidth = (itemDefinitions: readonly ProjectAddMenuItemDefinition[]): number => resolveRightClickPanelTextWidth(itemDefinitions.map((item) => item.label), 132);
const getProjectAddMenuPosition = (event: ReactMouseEvent<HTMLElement>, itemDefinitions: readonly ProjectAddMenuItemDefinition[]): ProjectAddMenuState => {
  const rect = event.currentTarget.getBoundingClientRect();
  const width = getProjectAddMenuWidth(itemDefinitions);
  const height = itemDefinitions.length * RIGHT_CLICK_PANEL_ITEM_MIN_HEIGHT + RIGHT_CLICK_PANEL_SURFACE_VERTICAL_EDGE;
  return { ...clampRightClickPanelPosition(rect.right - width, rect.bottom + 6, { width, height }), width };
};
const getActiveLibraryFolderId = (tab: WorkspaceTab | null): string | null => {
  if (!tab || tab.sectionKey !== "library") return null;
  if (tab.kind === "explorer") return tab.explorerState.selectedFolderId;
  if (tab.kind === "document" || tab.kind === "card" || tab.kind === "note") return tab.folderId;
  return null;
};
const isOpenableEntityEventTarget = (target: EventTarget | null): boolean => {
  return target instanceof HTMLElement && target.closest(OPENABLE_ENTITY_SELECTOR) !== null;
};
const scheduleLeftPanelClose = (onToggleLeftPanel?: () => void) => {
  if (!onToggleLeftPanel) return;
  window.setTimeout(onToggleLeftPanel, 0);
};
const getNavActionClassName = (isActive: boolean): string => cn(
  "flex h-7 min-h-7 w-7 min-w-7 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-stone-500 outline-none transition-[background-color,color,transform] duration-150 hover:bg-stone-100 hover:text-stone-800 focus-visible:bg-stone-100 focus-visible:text-stone-800 active:scale-95 disabled:cursor-default",
  isActive && "bg-stone-100 text-stone-800",
);



const IconPlus = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const IconChevronDown = ({ className }: IconProps) => (<svg viewBox="0 0 16 16" fill="none" className={className}><path d="M4 6.25L8 10.25L12 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ProjectAddMenu = ({ x, y, width, itemDefinitions, ariaLabel, menuRef, onCreateNote, onCreateCardSet, onCreateFolder, onImportPdf }: ProjectAddMenuProps) => {
  const handleItemClick = (event: ReactMouseEvent<HTMLButtonElement>, id: ProjectAddMenuActionId) => {
    event.preventDefault();
    event.stopPropagation();
    if (id === "create-note") {
      onCreateNote();
      return;
    }
    if (id === "create-card-set") {
      onCreateCardSet();
      return;
    }
    if (id === "create-folder") {
      onCreateFolder();
      return;
    }
    onImportPdf();
  };
  return (
    <RightClickPanel id={PROJECT_ADD_MENU_PANEL_ID} x={x} y={y} width={width} panelRef={menuRef} style={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} ariaLabel={ariaLabel}>
      {itemDefinitions.map((item) => (
        <button key={item.id} type="button" className={PROJECT_ADD_MENU_ITEM_CLASS_NAME} role="menuitem" onClick={(event) => handleItemClick(event, item.id)}>
          <span>{item.label}</span>
        </button>
      ))}
    </RightClickPanel>
  );
};
const SidebarLayeredDirectory = ({ calendarContent, onToggleLeftPanel, onOpenSettings }: SidebarLayeredDirectoryProps) => {
  const navigate = useNavigate();
  const { onOpenSettings: outletOpenSettings, onToggleLeftPanel: outletToggleLeftPanel } = useOutletContext<AppLayoutOutletContext>();
  const { currentUser } = useAuthSession();
  const locale = useLocaleStore((state) => state.locale);
  const copy = SIDEBAR_LAYERED_DIRECTORY_COPY[locale];
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const setFolderTagMode = useFolderTagModeStore((state) => state.setFolderTagMode);
  const { addTag, tags } = useTags();
  const { createCardSet } = useCardSets(undefined, { enabled: false });
  const { createFolder } = useFolderCommands();
  const { createNote } = useNotes(undefined, { enabled: false });
  const { folders } = useFoldersRead();
  const openSearch = useSearchStore((state) => state.open);
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const openNoteTab = useWorkspaceTabsStore((state) => state.openNoteTab);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);
  const [, setProjectAddExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const projectAddMenuRef = useRef<HTMLDivElement | null>(null);
  const [projectAddMenu, setProjectAddMenu] = useState<ProjectAddMenuState | null>(null);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const treeFolders = useMemo(() => folders as FolderTreeNode[], [folders]);
  const { rootFolders, getChildFolders, getNextOrderIndex } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets: EMPTY_COLLECTION, documents: EMPTY_COLLECTION, isFiltering: false });
  const folderById = useMemo(() => createFolderLookup(rootFolders, getChildFolders), [getChildFolders, rootFolders]);
  const selectedFolderId = useMemo(() => getActiveLibraryFolderId(activeTab), [activeTab]);
  const selectedFolder = selectedFolderId ? folderById.get(selectedFolderId) ?? null : null;
  const selectedNavigationFolderId = selectedFolderId;
  const sectionLabel = folderTagMode === "tag" ? copy.tagSectionLabel : selectedFolder ? getFolderName(selectedFolder, copy.untitledFolderName) : copy.projectSectionLabel;
  const shouldShowFavoriteSection = !selectedFolderId;
  const existingTagNames = useMemo(() => tags.map((tag) => tag.name), [tags]);
  const projectAddMenuItemDefinitions = useMemo(() => buildProjectAddMenuItemDefinitions(copy), [copy]);
  const workspaceOwnerName = useMemo(() => getWorkspaceOwnerName(currentUser?.displayName, currentUser?.email), [currentUser?.displayName, currentUser?.email]);
  const workspaceName = useMemo(() => copy.workspaceName(workspaceOwnerName), [copy, workspaceOwnerName]);
  const workspaceInitial = useMemo(() => getWorkspaceInitial(workspaceOwnerName), [workspaceOwnerName]);
  const isHomeActive = activeTab?.sectionKey === "home";
  const isFolderActive = activeTab?.sectionKey === "library" && folderTagMode === "folder";
  const isTagActive = activeTab?.sectionKey === "library" && folderTagMode === "tag";
  const isScheduleActive = activeTab?.sectionKey === "schedule";
  const shouldShowCalendarContent = calendarContent !== undefined;
  const shouldShowDirectoryContent = !shouldShowCalendarContent;
  const resolvedOnOpenSettings = onOpenSettings ?? outletOpenSettings;
  const resolvedOnToggleLeftPanel = onToggleLeftPanel ?? outletToggleLeftPanel;
  const { fileInputRef, handleToolbarAddDocument, currentFileAccept, handleToolbarFileInputChange } = useFolderDocumentUpload({ actionFolderId: selectedNavigationFolderId, getNextOrderIndex, setExpandedFolders: setProjectAddExpandedFolderIds });
  const closeProjectAddMenu = useCallback(() => {
    setProjectAddMenu(null);
  }, []);
  useRightClickPanelDismiss(PROJECT_ADD_MENU_PANEL_ID, projectAddMenu !== null, projectAddMenuRef, closeProjectAddMenu);
  const handleCreateRootFolder = useCallback(() => {
    void createFolder(copy.defaultNewProjectName);
  }, [copy.defaultNewProjectName, createFolder]);
  const handleCreateRootTag = useCallback(() => {
    void addTag(getUniqueTagName(copy.defaultNewTagName, existingTagNames));
  }, [addTag, copy.defaultNewTagName, existingTagNames]);
  const handleOpenHome = useCallback(() => {
    navigate("/schedule");
    openSectionTab("home");
  }, [navigate, openSectionTab]);
  const handleOpenProjectList = useCallback(() => {
    navigate("/schedule");
    setFolderTagMode("folder");
    openExplorerTab({ title: copy.libraryTabTitle, explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [copy.libraryTabTitle, navigate, openExplorerTab, setFolderTagMode]);
  const handleOpenTagTree = useCallback(() => {
    navigate("/schedule");
    setFolderTagMode("tag");
    openExplorerTab({ title: copy.libraryTabTitle, explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null } });
  }, [copy.libraryTabTitle, navigate, openExplorerTab, setFolderTagMode]);
  const handleOpenProjectAddMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectAddMenu(getProjectAddMenuPosition(event, projectAddMenuItemDefinitions));
  }, [projectAddMenuItemDefinitions]);
  const handleCreateSelectedFolderNote = useCallback(() => {
    if (!selectedNavigationFolderId) return;
    closeProjectAddMenu();
    void (async () => {
      const note = await createNote(copy.defaultNewNoteName, selectedNavigationFolderId, { orderIndex: getNextOrderIndex(selectedNavigationFolderId) });
      openNoteTab({ noteId: note.id, title: note.title, folderId: note.folderId });
    })();
  }, [closeProjectAddMenu, copy.defaultNewNoteName, createNote, getNextOrderIndex, openNoteTab, selectedNavigationFolderId]);
  const handleCreateSelectedFolderCardSet = useCallback(() => {
    if (!selectedNavigationFolderId) return;
    closeProjectAddMenu();
    void (async () => {
      const cardSet = await createCardSet(copy.defaultNewCardSetName, selectedNavigationFolderId);
      navigate("/schedule");
      setFolderTagMode("folder");
      openExplorerTab({ title: copy.libraryTabTitle, explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: selectedNavigationFolderId, selectedItem: { type: "cardSet", id: cardSet.id } } });
    })();
  }, [closeProjectAddMenu, copy.defaultNewCardSetName, copy.libraryTabTitle, createCardSet, navigate, openExplorerTab, selectedNavigationFolderId, setFolderTagMode]);
  const handleCreateSelectedFolderChild = useCallback(() => {
    if (!selectedNavigationFolderId) return;
    closeProjectAddMenu();
    void createFolder(copy.defaultNewFolderName, selectedNavigationFolderId);
  }, [closeProjectAddMenu, copy.defaultNewFolderName, createFolder, selectedNavigationFolderId]);
  const handleImportSelectedFolderPdf = useCallback(() => {
    handleToolbarAddDocument();
    closeProjectAddMenu();
  }, [closeProjectAddMenu, handleToolbarAddDocument]);
  const handleOpenSchedule = useCallback(() => {
    navigate("/schedule");
    openSectionTab("schedule");
  }, [navigate, openSectionTab]);
  const handleOpenExplore = useCallback(() => {
    openSearch();
  }, [openSearch]);
  const handleOpenSettings = useCallback(() => {
    resolvedOnOpenSettings();
  }, [resolvedOnOpenSettings]);
  const handleDirectoryClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isOpenableEntityEventTarget(event.target)) return;
    scheduleLeftPanelClose(resolvedOnToggleLeftPanel);
  }, [resolvedOnToggleLeftPanel]);
  const handleDirectoryKeyDownCapture = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!isOpenableEntityEventTarget(event.target)) return;
    scheduleLeftPanelClose(resolvedOnToggleLeftPanel);
  }, [resolvedOnToggleLeftPanel]);
  return (
    <div className={ROOT_CLASS_NAME} onClickCapture={handleDirectoryClickCapture} onKeyDownCapture={handleDirectoryKeyDownCapture}>
      <div className={PRIMARY_NAV_CLASS_NAME}>
        <div className={WORKSPACE_HEADER_CLASS_NAME}>
          <button type="button" className={WORKSPACE_TOGGLE_CLASS_NAME} onClick={resolvedOnToggleLeftPanel} aria-label={copy.sidebarCloseAriaLabel} disabled={!resolvedOnToggleLeftPanel}>
            <SidebarOpenIcon className={NAV_ICON_CLASS_NAME} />
          </button>
          <button type="button" className={WORKSPACE_BUTTON_CLASS_NAME} onClick={handleOpenProjectList} aria-label={copy.workspaceOpenAriaLabel(workspaceName)}>
            <span className={WORKSPACE_AVATAR_CLASS_NAME} aria-hidden="true">{workspaceInitial}</span>
            <span className="block min-w-0 overflow-hidden truncate text-stone-950">{workspaceName}</span>
          </button>
        </div>
        <nav className={NAV_CLASS_NAME} aria-label={copy.workspaceNavigationAriaLabel}>
          <button type="button" className={getNavActionClassName(isHomeActive)} onClick={handleOpenHome} aria-current={isHomeActive ? "page" : undefined} aria-label={copy.homeLabel} title={copy.homeLabel}>
            <HomeIcon className={NAV_ICON_CLASS_NAME} />
          </button>
          <button type="button" className={getNavActionClassName(isFolderActive)} onClick={handleOpenProjectList} aria-current={isFolderActive ? "page" : undefined} aria-label={copy.libraryLabel} title={copy.libraryLabel}>
            <ExplorerChromeFolderIcon className={NAV_ICON_CLASS_NAME} />
          </button>
          <button type="button" className={getNavActionClassName(isTagActive)} onClick={handleOpenTagTree} aria-current={isTagActive ? "page" : undefined} aria-label={copy.tagsLabel} title={copy.tagsLabel}>
            <Tag className={NAV_ICON_CLASS_NAME} />
          </button>
          <button type="button" className={getNavActionClassName(isScheduleActive)} onClick={handleOpenSchedule} aria-current={isScheduleActive ? "page" : undefined} aria-label={copy.scheduleLabel} title={copy.scheduleLabel}>
            <CalendarIcon className={NAV_ICON_CLASS_NAME} />
          </button>
          <button type="button" className={getNavActionClassName(false)} onClick={handleOpenExplore} aria-label={copy.exploreLabel} title={copy.exploreLabel}>
            <GalleryIcon className={NAV_ICON_CLASS_NAME} />
          </button>
          <button type="button" className={getNavActionClassName(false)} onClick={handleOpenSettings} aria-label={copy.settingsLabel} title={copy.settingsLabel}>
            <SettingIcon className={NAV_ICON_CLASS_NAME} />
          </button>
        </nav>
      </div>
      {shouldShowDirectoryContent ? (
        <>
          <div className={SECTION_STRIP_CLASS_NAME}>
            {shouldShowFavoriteSection ? (
              <section className={FAVORITES_SECTION_CLASS_NAME} aria-label={copy.favoriteSectionLabel}>
                <h2 className={SECTION_HEADING_CLASS_NAME}>{copy.favoriteSectionLabel}</h2>
                <p className={EMPTY_MESSAGE_CLASS_NAME}>{copy.favoriteEmptyMessage}</p>
              </section>
            ) : null}
            <section className={SECTION_CLASS_NAME} aria-label={sectionLabel}>
              <div className={SECTION_ROW_CLASS_NAME}>
                {folderTagMode !== "tag" && selectedFolder ? (
                  <button type="button" className={SECTION_HEADING_BUTTON_CLASS_NAME} onClick={handleOpenProjectList} aria-label={copy.openProjectListAriaLabel}>
                    <span className="block truncate">{sectionLabel}</span>
                    <IconChevronDown className={SECTION_CHEVRON_CLASS_NAME} />
                  </button>
                ) : (
                  <h2 className={SECTION_HEADING_CLASS_NAME}>{sectionLabel}</h2>
                )}
                <TagFilterPopover allTags={existingTagNames} ariaLabel={copy.filterAriaLabel} className={ADD_BUTTON_CLASS_NAME} />
                {folderTagMode === "tag" ? (
                  <button type="button" onClick={handleCreateRootTag} aria-label={copy.addTagAriaLabel} title={copy.addTagAriaLabel} className={ADD_BUTTON_CLASS_NAME}>
                    <IconPlus className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" onClick={selectedFolder ? handleOpenProjectAddMenu : handleCreateRootFolder} aria-label={selectedFolder ? copy.addSelectedFolderContentAriaLabel : copy.addProjectAriaLabel} title={selectedFolder ? copy.addSelectedFolderContentAriaLabel : copy.addProjectAriaLabel} className={ADD_BUTTON_CLASS_NAME}>
                    <IconPlus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </section>
          </div>
          <input ref={fileInputRef} type="file" accept={currentFileAccept} className="hidden" tabIndex={-1} onChange={handleToolbarFileInputChange} />
          <div className="min-h-0 flex-1">
            {folderTagMode === "tag" ? <TagTreeSidebar /> : selectedNavigationFolderId ? <LibraryHierarchySidebar parentFolderId={selectedNavigationFolderId} /> : <ProjectListSidebar />}
          </div>
        </>
      ) : null}
      {shouldShowCalendarContent ? <div className="min-h-0 flex-1">{calendarContent}</div> : null}
      {shouldShowDirectoryContent && projectAddMenu ? <ProjectAddMenu x={projectAddMenu.x} y={projectAddMenu.y} width={projectAddMenu.width} itemDefinitions={projectAddMenuItemDefinitions} ariaLabel={copy.projectAddMenuAriaLabel} menuRef={projectAddMenuRef} onCreateNote={handleCreateSelectedFolderNote} onCreateCardSet={handleCreateSelectedFolderCardSet} onCreateFolder={handleCreateSelectedFolderChild} onImportPdf={handleImportSelectedFolderPdf} /> : null}
    </div>
  );
};



export { LibraryHierarchySidebar, ProjectListSidebar, SidebarLayeredDirectory, TagTreeSidebar };
