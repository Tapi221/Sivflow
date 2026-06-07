import { GoogleCalendarSyncEngine } from "@/sync/googlecalendar-sync/GoogleCalendarSyncEngine";
import type { GCalForceSyncOptions, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent, GoogleCalendarListItem } from "./gcalSync.types";

type EngineContext = {
  accessToken: string;
  selectedCalendarIds: Set<string>;
  calendars: GoogleCalendarListItem[];
};

type EngineState = {
  token: string;
