import { GoogleCalendarWatchManager } from "@/sync/googlecalendar-sync/GoogleCalendarWatchManager";
import { GoogleCalendarSyncEngine } from "@/sync/googlecalendar-sync/GoogleCalendarSyncEngine";
import { auth } from "@/services/firebase";
import type { GCalForceSyncOptions, GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent, GoogleCalendarListItem } from "./gcalSync.types";

type EngineContext = { access