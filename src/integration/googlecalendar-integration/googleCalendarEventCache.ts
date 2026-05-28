import { Dexie } from "dexie";
import type { GoogleCalendarEvent } from "./gcalSync.types";

type GoogleCalendarEventCacheRow = {
  id: string;
  accountId: string;
  calendarId: string;
  eventId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: number;
  endsAt: number;
  isAllDay: boolean;
  accentColor: string;
  projectId?: string;
  updatedAt: number;
};

type CalendarEventCacheDatabase = Dexie & {
  googleCalendarEvents: Dexie.Table<GoogleCalendarEventCacheRow, string>;
};

type ReadCachedGoogleCalendarEventsOptions = {
  accountIds?: readonly string[];
  calendarIds?: readonly string[];
  rangeStart?: Date;
  rangeEnd?: Date;
};

const GOOGLE_CALENDAR_EVENT_CACHE_DB_NAME = "flashcard-master-google-calendar-event-cache";
const GOOGLE_CALENDAR_EVENT_CACHE_ACCOUNT_FALLBACK = "__unknown_account__";
const GOOGLE_CALENDAR_EVENT_CACHE_CHUNK_SIZE = 500;

let cacheDb: CalendarEventCacheDatabase | null = null;

const canUseIndexedDb = (): boolean => typeof indexedDB !== "undefined";

const getCacheDb = (): CalendarEventCacheDatabase | null => {
  if (!canUseIndexedDb()) return null;
  if (cacheDb) return cacheDb;

  const db = new Dexie(GOOGLE_CALENDAR_EVENT_CACHE_DB_NAME) as CalendarEventCacheDatabase;

  db.version(1).stores({
    googleCalendarEvents: "id, accountId, calendarId, eventId, startsAt, endsAt, updatedAt, [accountId+calendarId], [accountId+calendarId+startsAt], [accountId+calendarId+endsAt]",
  });

  cacheDb = db;
  return cacheDb;
};

const getResolvedAccountId = (accountId: string | undefined): string => accountId && accountId.length > 0 ? accountId : GOOGLE_CALENDAR_EVENT_CACHE_ACCOUNT_FALLBACK;

const createCacheRowId = (accountId: string, calendarId: string, eventId: string): string => `${accountId}\u001f${calendarId}\u001f${eventId}`;

const toCacheRow = (accountId: string, event: GoogleCalendarEvent): GoogleCalendarEventCacheRow => ({
  id: createCacheRowId(accountId, event.calendarId, event.id),
  accountId,
  calendarId: event.calendarId,
  eventId: event.id,
  title: event.title,
  description: event.description,
  location: event.location,
  startsAt: event.startsAt.getTime(),
  endsAt: event.endsAt.getTime(),
  isAllDay: event.isAllDay,
  accentColor: event.accentColor,
  projectId: event.projectId,
  updatedAt: Date.now(),
});

const toCalendarEvent = (row: GoogleCalendarEventCacheRow): GoogleCalendarEvent => ({
  id: row.eventId,
  accountId: row.accountId === GOOGLE_CALENDAR_EVENT_CACHE_ACCOUNT_FALLBACK ? undefined : row.accountId,
  calendarId: row.calendarId,
  projectId: row.projectId,
  title: row.title,
  description: row.description,
  location: row.location,
  startsAt: new Date(row.startsAt),
  endsAt: new Date(row.endsAt),
  isAllDay: row.isAllDay,
  accentColor: row.accentColor,
});

const isValidRange = (rangeStart: Date, rangeEnd: Date): boolean => Number.isFinite(rangeStart.getTime()) && Number.isFinite(rangeEnd.getTime()) && rangeStart < rangeEnd;

const overlapsRange = (row: GoogleCalendarEventCacheRow, rangeStartMs: number, rangeEndMs: number): boolean => row.startsAt < rangeEndMs && row.endsAt > rangeStartMs;

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const readCachedGoogleCalendarEvents = async ({
  accountIds,
  calendarIds,
  rangeStart,
  rangeEnd,
}: ReadCachedGoogleCalendarEventsOptions = {}): Promise<GoogleCalendarEvent[]> => {
  const db = getCacheDb();
  if (!db) return [];

  const accountIdSet = accountIds && accountIds.length > 0 ? new Set(accountIds.map(getResolvedAccountId)) : null;
  const calendarIdSet = calendarIds && calendarIds.length > 0 ? new Set(calendarIds) : null;
  const rangeStartMs = rangeStart?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rangeEndMs = rangeEnd?.getTime() ?? Number.POSITIVE_INFINITY;

  const rows = await db.googleCalendarEvents.toArray();

  return rows
    .filter((row) => {
      if (accountIdSet && !accountIdSet.has(row.accountId)) return false;
      if (calendarIdSet && !calendarIdSet.has(row.calendarId)) return false;
      return overlapsRange(row, rangeStartMs, rangeEndMs);
    })
    .map(toCalendarEvent);
};

export const upsertCachedGoogleCalendarEvent = async (accountId: string | undefined, event: GoogleCalendarEvent): Promise<void> => {
  const db = getCacheDb();
  if (!db) return;

  const resolvedAccountId = getResolvedAccountId(accountId ?? event.accountId);

  await db.googleCalendarEvents.put(toCacheRow(resolvedAccountId, { ...event, accountId: resolvedAccountId }));
};

export const replaceCachedGoogleCalendarRange = async ({
  accountId,
  calendarId,
  rangeStart,
  rangeEnd,
  events,
}: {
  accountId: string | undefined;
  calendarId: string;
  rangeStart: Date;
  rangeEnd: Date;
  events: GoogleCalendarEvent[];
}): Promise<void> => {
  const db = getCacheDb();
  if (!db || !isValidRange(rangeStart, rangeEnd)) return;

  const resolvedAccountId = getResolvedAccountId(accountId);
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const table = db.googleCalendarEvents;

  await db.transaction("rw", table, async () => {
    const candidateRows = await table
      .where("[accountId+calendarId+startsAt]")
      .between([resolvedAccountId, calendarId, Dexie.minKey], [resolvedAccountId, calendarId, rangeEndMs], true, false)
      .toArray();
    const deleteIds = candidateRows
      .filter((row) => overlapsRange(row, rangeStartMs, rangeEndMs))
      .map((row) => row.id);

    for (const ids of chunk(deleteIds, GOOGLE_CALENDAR_EVENT_CACHE_CHUNK_SIZE)) {
      await table.bulkDelete(ids);
    }

    const rows = events.map((event) => toCacheRow(resolvedAccountId, { ...event, accountId: resolvedAccountId, calendarId }));

    for (const rowsChunk of chunk(rows, GOOGLE_CALENDAR_EVENT_CACHE_CHUNK_SIZE)) {
      await table.bulkPut(rowsChunk);
    }
  });
};

export const deleteCachedGoogleCalendarEvent = async (accountId: string | undefined, calendarId: string | undefined, eventId: string): Promise<void> => {
  const db = getCacheDb();
  if (!db) return;

  const resolvedAccountId = getResolvedAccountId(accountId);

  if (calendarId) {
    await db.googleCalendarEvents.delete(createCacheRowId(resolvedAccountId, calendarId, eventId));
    return;
  }

  const rows = await db.googleCalendarEvents.where("accountId").equals(resolvedAccountId).filter((row) => row.eventId === eventId).toArray();
  await db.googleCalendarEvents.bulkDelete(rows.map((row) => row.id));
};

export const clearCachedGoogleCalendarAccount = async (accountId: string | undefined): Promise<void> => {
  const db = getCacheDb();
  if (!db) return;

  await db.googleCalendarEvents.where("accountId").equals(getResolvedAccountId(accountId)).delete();
};
