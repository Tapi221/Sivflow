import { useCallback, useMemo, useState } from "react";
import { getFallbackProjectColor, getFolderProjectColor, isProjectColor } from "@/components/folder/explorer/model/projectColor";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";
import { getFolderId, UNTITLED_PROJECT_NAME } from "@/components/folder/explorer/model/utils";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import type { AppCalendarItem } from "./scheduleScreen.types";
import { useFolderCommands } from "@/features/folder/hooks/useFolderCommands";
import { useFoldersRead } from "@/features/folder/hooks/useFoldersRead";



type CreateRootFolderProjectInput = {
  label: string;
  color?: string;
  checked?: boolean;
};
type UseRootFolderProjectsResult = {
  appProjects: AppCalendarItem[];
  rootFolders: FolderTreeNode[];
  loading: boolean;
  error: string | null;
  createRootFolderProject: (input: CreateRootFolderProjectInput) => Promise<AppCalendarItem | null>;
  findProjectByLabel: (label: string) => AppCalendarItem | null;
  setProjectVisibility: (projectId: string, checked: boolean) => void;
  toggleProject: (projectId: string) => void;
  updateRootFolderProjectColor: (projectId: string, color: string) => Promise<void>;
};
type LegacyStoredAppProject = AppCalendarItem;
type ProjectVisibilityMap = Record<string, boolean>;
type StoredLegacyProject = Partial<AppCalendarItem>;



const LEGACY_APP_PROJECTS_STORAGE_KEY = "flashcard-master:schedule:app-projects";
const PROJECT_VISIBILITY_STORAGE_KEY = "flashcard-master:schedule:root-folder-project-visibility";
const EMPTY_COLLECTION: never[] = [];



const normalizeRootFolderProjectLabel = (label: string): string => label.trim().toLowerCase();
const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const getFolderProjectLabel = (folder: FolderTreeNode): string => {
  const record = folder as { folderName?: unknown; folder_name?: unknown; name?: unknown; };
  return readTrimmedString(record.folderName) ?? readTrimmedString(record.folder_name) ?? readTrimmedString(record.name) ?? UNTITLED_PROJECT_NAME;
};
const createLegacyFallbackProjectId = (label: string, index: number): string => `legacy-app-project:${index}:${normalizeRootFolderProjectLabel(label)}`;
const readProjectVisibilityMap = (): ProjectVisibilityMap => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(PROJECT_VISIBILITY_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const visibility: ProjectVisibilityMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof key === "string" && typeof value === "boolean") {
        visibility[key] = value;
      }
    });

    return visibility;
  } catch {
    return {};
  }
};
const persistProjectVisibilityMap = (visibility: ProjectVisibilityMap) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PROJECT_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // localStorage が利用できない環境では、現在の React state だけで表示状態を維持する。
  }
};
const readLegacyStoredAppProjects = (): LegacyStoredAppProject[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_APP_PROJECTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item, index): LegacyStoredAppProject[] => {
      const project = item as StoredLegacyProject;
      const label = readTrimmedString(project.label);
      if (!label) return [];

      const id = readTrimmedString(project.id) ?? createLegacyFallbackProjectId(label, index);
      const color = isProjectColor(project.color) ? project.color : getFallbackProjectColor(id);

      return [
        {
          id,
          label,
          color,
          checked: typeof project.checked === "boolean" ? project.checked : true,
        },
      ];
    });
  } catch {
    return [];
  }
};
const clearLegacyStoredAppProjects = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LEGACY_APP_PROJECTS_STORAGE_KEY);
  } catch {
    // localStorage が利用できない環境では何もしない。
  }
};
const useRootFolderProjects = (): UseRootFolderProjectsResult => {
  const { folders, loading, error } = useFoldersRead();
  const { createFolder, updateFolder } = useFolderCommands();
  const [visibilityByProjectId, setVisibilityByProjectId] = useState<ProjectVisibilityMap>(readProjectVisibilityMap);
  const treeFolders = useMemo(() => folders as unknown as FolderTreeNode[], [folders]);
  const { rootFolders } = useExplorerDerivedData({ treeFolders, treeCards: EMPTY_COLLECTION, cardSets: EMPTY_COLLECTION, documents: EMPTY_COLLECTION, isFiltering: false });

  const appProjects = useMemo<AppCalendarItem[]>(() => rootFolders.map((folder) => {
    const id = getFolderId(folder);
    return {
      id,
      label: getFolderProjectLabel(folder),
      color: getFolderProjectColor(folder),
      checked: visibilityByProjectId[id] ?? true,
    };
  }), [rootFolders, visibilityByProjectId]);

  const projectByNormalizedLabel = useMemo(() => new Map(appProjects.map((project) => [normalizeRootFolderProjectLabel(project.label), project])), [appProjects]);

  const findProjectByLabel = useCallback((label: string): AppCalendarItem | null => projectByNormalizedLabel.get(normalizeRootFolderProjectLabel(label)) ?? null, [projectByNormalizedLabel]);

  const setProjectVisibility = useCallback((projectId: string, checked: boolean) => {
    setVisibilityByProjectId((prev) => {
      const next = { ...prev, [projectId]: checked };
      persistProjectVisibilityMap(next);
      return next;
    });
  }, []);

  const toggleProject = useCallback((projectId: string) => {
    setVisibilityByProjectId((prev) => {
      const next = { ...prev, [projectId]: !(prev[projectId] ?? true) };
      persistProjectVisibilityMap(next);
      return next;
    });
  }, []);

  const createRootFolderProject = useCallback(async ({ label, color, checked = true }: CreateRootFolderProjectInput): Promise<AppCalendarItem | null> => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return null;

    const existingProject = findProjectByLabel(trimmedLabel);
    if (existingProject) {
      setProjectVisibility(existingProject.id, checked);
      return { ...existingProject, checked };
    }

    const resolvedColor = isProjectColor(color) ? color : getFallbackProjectColor(trimmedLabel);
    const projectId = await createFolder(trimmedLabel, undefined, { color: resolvedColor, cloudSyncEnabled: true });
    const project = { id: projectId, label: trimmedLabel, color: resolvedColor, checked };
    setProjectVisibility(projectId, checked);

    return project;
  }, [createFolder, findProjectByLabel, setProjectVisibility]);

  const updateRootFolderProjectColor = useCallback(async (projectId: string, color: string) => {
    if (!isProjectColor(color)) return;

    await updateFolder(projectId, { folderColor: color });
  }, [updateFolder]);

  return {
    appProjects,
    rootFolders,
    loading,
    error,
    createRootFolderProject,
    findProjectByLabel,
    setProjectVisibility,
    toggleProject,
    updateRootFolderProjectColor,
  };
};



export { normalizeRootFolderProjectLabel, readLegacyStoredAppProjects, clearLegacyStoredAppProjects, useRootFolderProjects };


export type { CreateRootFolderProjectInput, UseRootFolderProjectsResult, LegacyStoredAppProject };
