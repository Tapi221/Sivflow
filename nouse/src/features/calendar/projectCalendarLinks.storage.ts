import type { CalendarProvider, ProjectCalendarLink, ProjectCalendarSyncDirection } from "./scheduleScreen.types";



type CreateProjectCalendarLinkInput = {
  projectId: string;
  provider: CalendarProvider;
  accountId: string;
  externalCalendarId: string;
  externalCalendarName: string;
  syncDirection?: ProjectCalendarSyncDirection;
  createdByApp: boolean;
  color?: string;
  lastSyncedAt?: string;
};
type StoredProjectCalendarLink = Partial<ProjectCalendarLink>;



const PROJECT_CALENDAR_LINKS_STORAGE_KEY = "sivflow:schedule:project-calendar-links";
const LEGACY_PROJECT_CALENDAR_LINKS_STORAGE_KEY = "flashcard-master:schedule:project-calendar-links";
const DEFAULT_SYNC_DIRECTION: ProjectCalendarSyncDirection = "twoWay";
const SUPPORTED_CALENDAR_PROVIDERS = new Set<CalendarProvider>(["local", "google", "appleEventKit", "appleCalDav"]);
const SUPPORTED_SYNC_DIRECTIONS = new Set<ProjectCalendarSyncDirection>(["importOnly", "exportOnly", "twoWay"]);



const encodeLinkIdPart = (value: string): string => encodeURIComponent(value.trim());
const readString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
const readOptionalString = (value: unknown): string | undefined => {
  const result = readString(value);
  return result ?? undefined;
};
const readBoolean = (value: unknown): boolean => value === true;
const normalizeProvider = (value: unknown): CalendarProvider | null => {
  if (typeof value !== "string") return null;
  if (!SUPPORTED_CALENDAR_PROVIDERS.has(value as CalendarProvider)) return null;

  return value as CalendarProvider;
};
const normalizeSyncDirection = (value: unknown): ProjectCalendarSyncDirection => {
  if (typeof value !== "string") return DEFAULT_SYNC_DIRECTION;
  if (!SUPPORTED_SYNC_DIRECTIONS.has(value as ProjectCalendarSyncDirection)) return DEFAULT_SYNC_DIRECTION;

  return value as ProjectCalendarSyncDirection;
};
const normalizeCreatedLinkSyncDirection = (
  value: ProjectCalendarSyncDirection | undefined,
): ProjectCalendarSyncDirection => value ?? DEFAULT_SYNC_DIRECTION;
const readStoredProjectCalendarLinksRaw = (): string | null => {
  const current = window.localStorage.getItem(PROJECT_CALENDAR_LINKS_STORAGE_KEY);
  if (current) return current;

  const legacy = window.localStorage.getItem(LEGACY_PROJECT_CALENDAR_LINKS_STORAGE_KEY);
  if (!legacy) return null;

  window.localStorage.setItem(PROJECT_CALENDAR_LINKS_STORAGE_KEY, legacy);
  window.localStorage.removeItem(LEGACY_PROJECT_CALENDAR_LINKS_STORAGE_KEY);
  return legacy;
};
const buildProjectCalendarLinkId = (provider: CalendarProvider, accountId: string, externalCalendarId: string): string => ["project-calendar-link", encodeLinkIdPart(provider), encodeLinkIdPart(accountId), encodeLinkIdPart(externalCalendarId)].join(":");
const normalizeStoredProjectCalendarLink = (item: unknown): ProjectCalendarLink | null => {
  if (typeof item !== "object" || item === null) return null;

  const stored = item as StoredProjectCalendarLink;
  const provider = normalizeProvider(stored.provider);
  const projectId = readString(stored.projectId);
  const accountId = readString(stored.accountId);
  const externalCalendarId = readString(stored.externalCalendarId);
  const externalCalendarName = readString(stored.externalCalendarName);

  if (!provider || !projectId || !accountId || !externalCalendarId || !externalCalendarName) {
    return null;
  }

  return {
    id: readString(stored.id) ?? buildProjectCalendarLinkId(provider, accountId, externalCalendarId),
    projectId,
    provider,
    accountId,
    externalCalendarId,
    externalCalendarName,
    syncDirection: normalizeSyncDirection(stored.syncDirection),
    createdByApp: readBoolean(stored.createdByApp),
    color: readOptionalString(stored.color),
    lastSyncedAt: readOptionalString(stored.lastSyncedAt),
  };
};
const createProjectCalendarLink = ({ projectId, provider, accountId, externalCalendarId, externalCalendarName, syncDirection, createdByApp, color, lastSyncedAt }: CreateProjectCalendarLinkInput): ProjectCalendarLink => ({ id: buildProjectCalendarLinkId(provider, accountId, externalCalendarId), projectId, provider, accountId, externalCalendarId, externalCalendarName, syncDirection: normalizeCreatedLinkSyncDirection(syncDirection), createdByApp, color, lastSyncedAt });
const readStoredProjectCalendarLinks = (): ProjectCalendarLink[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = readStoredProjectCalendarLinksRaw();
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const linksById = new Map<string, ProjectCalendarLink>();

    for (const item of parsed) {
      const link = normalizeStoredProjectCalendarLink(item);
      if (!link) continue;

      linksById.set(link.id, link);
    }

    return Array.from(linksById.values());
  } catch {
    return [];
  }
};
const persistProjectCalendarLinks = (links: ProjectCalendarLink[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PROJECT_CALENDAR_LINKS_STORAGE_KEY, JSON.stringify(links));
    window.localStorage.removeItem(LEGACY_PROJECT_CALENDAR_LINKS_STORAGE_KEY);
  } catch {
    // localStorage が利用できない環境でも、画面上のリンク状態は維持する。
  }
};



export { PROJECT_CALENDAR_LINKS_STORAGE_KEY, buildProjectCalendarLinkId, createProjectCalendarLink, readStoredProjectCalendarLinks, persistProjectCalendarLinks };


export type { CreateProjectCalendarLinkInput };
