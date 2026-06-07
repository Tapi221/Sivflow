import type { GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  selectedDate: Date;
  accounts: GoogleAccountDisplay[];
  projectCalendarLinks: ProjectCalendarLink