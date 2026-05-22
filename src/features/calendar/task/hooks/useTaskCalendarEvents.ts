import { useMemo } from "react";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import type { Task, TaskStatus } from "../task.types";
import { useTaskStore } from "./useTaskStore";

const TASK_CALENDAR_ID = "manifolia-tasks";

const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "#8f929c",
  in_progress: "#185FA5",
  review: "#d97706",
  done: "#16a34a",
};

const parseDateOnly = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return Number.isNaN(date.getTime()) ? null : date;
};

const addOneDay = (date: Date): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};

const toTaskCalendarEvent = (task: Task): GoogleCalendarEvent | null => {
  if (task.scheduledStart && task.scheduledEnd) {
    const startsAt = new Date(task.scheduledStart);
    const endsAt = new Date(task.scheduledEnd);

    if (Number.isNaN(startsAt.getTime())) return null;
    if (Number.isNaN(endsAt.getTime())) return null;

    return {
      id: `task:${task.id}`,
      calendarId: TASK_CALENDAR_ID,
      title: task.title,
      startsAt,
      endsAt,
      isAllDay: false,
      accentColor: STATUS_COLOR[task.status],
    };
  }

  if (task.dueDate) {
    const startsAt = parseDateOnly(task.dueDate);

    if (!startsAt) return null;

    return {
      id: `task:${task.id}`,
      calendarId: TASK_CALENDAR_ID,
      title: task.title,
      startsAt,
      endsAt: addOneDay(startsAt),
      isAllDay: true,
      accentColor: STATUS_COLOR[task.status],
    };
  }

  return null;
};

export const useTaskCalendarEvents = (): GoogleCalendarEvent[] => {
  const tasks = useTaskStore((state) => state.tasks);

  return useMemo(() => {
    return tasks
      .map(toTaskCalendarEvent)
      .filter((event): event is GoogleCalendarEvent => event !== null);
  }, [tasks]);
};