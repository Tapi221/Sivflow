import { GoogleCalendarWatchManager } from "@/sync/googlecalendar-sync/GoogleCalendarWatchManager";
import { GoogleCalendarSyncEngine } from "@/sync/googlecalendar-sync/GoogleCalendarSyncEngine";
import { auth } from "@/services/firebase";
import type { GCalForceSyncOptions, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent, GoogleCalendarListItem } from "./gcalSync.types";

type EngineContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};

type EngineState = {
  token: string;
  calIds: string;
  calendars: string;
};

export class GoogleCalendarEngineManager {
  private engines = new Map<string, GoogleCalendarSyncEngine>();

  private state = new Map<string, EngineState