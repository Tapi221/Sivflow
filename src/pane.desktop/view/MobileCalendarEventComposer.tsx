import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addHours, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import type { CalendarRecurrenceFrequency, CalendarRecurrenceRule, CalendarWeekday } from "@core/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import type { GCalWritableEventInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";