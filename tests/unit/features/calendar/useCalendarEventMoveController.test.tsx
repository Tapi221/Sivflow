// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyCalendarEventMoveOverrides, useCalendarEventMoveController } from "@/features/calendar/useCalendarEventMoveController";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

type Deferred<T> = {
  promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void; };

type ToastOptions = {
  action?: { label?: string; onClick?: () => void; }; duration?: number; description?: string; id?: string; };
