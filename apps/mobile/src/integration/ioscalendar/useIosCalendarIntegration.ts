import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { createIosCalendarEvent, deleteIosCalendarEvent, fetchIosCalendars, fetchIosEvents, getIosCalendarPermissionStatus, isIosCalendarSupported, requestIosCalendarPermission, updateIosCalendarEvent } from "./iosCalendar.api";
import type { GoogleCalendarEvent } from "@core/calendar/calendarEvent.types";
import type { IosCalendarConnectionStatus, IosCalendarEvent, IosCalendarListItem, IosCalendarPermissionStatus, IosCalendarRange, IosCalendarWritableEventDeleteInput, IosCalendarWritableEventInput, IosCalendarWritableEventUpdateInput } from "./iosCalendar.types";

type LoadEventsInput = {
  calendarIds: string[];
  calendars: IosCalendarListItem[];
  range: IosCalendarRange | null;
};

const IOS_CALENDAR_PERMISSION_ERROR = "iOSカレンダーへのアクセス許可が必要です";
const IOS_CALENDAR_UNSUPPORTED_ERROR = "iOSカレンダー連携はiOS端末でのみ利用できます";
const IOS_CALENDAR_CREATE_ERROR = "iOSカレンダー予定の作成に失敗しました";
const IOS_CALENDAR_UPDATE_ERROR = "iOSカレンダー予定の更新に失敗しました";
const IOS_CALENDAR_DELETE_ERROR = "iOSカレンダー予定の削除に失敗しました";

const normalizeRange = (range: IosCalendarRange): IosCalendarRange => range.rangeStart <= range.rangeEnd
  ? range
  : {
    rangeStart: range.rangeEnd,
    rangeEnd: range.rangeStart,
  };

const isSameRange = (a: IosCalendarRange | null, b: IosCalendarRange): boolean => a?.rangeStart.getTime() === b.rangeStart.getTime() && a.rangeEnd.getTime() === b.rangeEnd.getTime();

const getDefaultSelectedCalendarIds = (calendars: IosCalendarListItem[]): string[] => calendars.filter((calendar) => calendar.selected).map((calendar) => calendar.id);

const getConnectionStatus = ({ error, isEnabled, permissionStatus, supported }: { error: string | null; isEnabled: boolean; permissionStatus: IosCalendarPermissionStatus; supported: boolean }): IosCalendarConnectionStatus => {
  if (!supported) return "unsupported";
  if (permissionStatus !== "granted" || !isEnabled) return "needsPermission";
  if (error) return "error";
  return "connected";
};

const toErrorMessage = (error: unknown, fallback: string): string => error instanceof Error ? error.message : fallback;

const buildSelectedCalendarIdList = (ids: Set<string>): string[] => Array.from(ids);

export const useIosCalendarIntegration = () => {
  const supported = isIosCalendarSupported();
  const [permissionStatus, setPermissionStatus] = useState<IosCalendarPermissionStatus>("undetermined");
  const [isEnabled, setIsEnabled] = useState(false);
  const [calendars, setCalendars] = useState<IosCalendarListItem[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(() => new Set());
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [range, setRange] = useState<IosCalendarRange | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isWritingEvent, setIsWritingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const calendarsRef = useRef<IosCalendarListItem[]>([]);
  const isEnabledRef = useRef(false);
  const permissionStatusRef = useRef<IosCalendarPermissionStatus>("undetermined");
  const rangeRef = useRef<IosCalendarRange | null>(null);
  const isMountedRef = useRef(true);
  const selectedCalendarIdsRef = useRef<Set<string>>(new Set());
  const selectedCalendarIdList = useMemo(() => buildSelectedCalendarIdList(selectedCalendarIds), [selectedCalendarIds]);
  const connectionStatus = getConnectionStatus({
    error,
    isEnabled,
    permissionStatus,
    supported,
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    calendarsRef.current = calendars;
  }, [calendars]);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    permissionStatusRef.current = permissionStatus;
  }, [permissionStatus]);

  useEffect(() => {
    selectedCalendarIdsRef.current = selectedCalendarIds;
  }, [selectedCalendarIds]);

  const loadEvents = useCallback(async ({ calendarIds, calendars: nextCalendars, range: nextRange }: LoadEventsInput) => {
    if (!supported || !nextRange || calendarIds.length === 0) {
      setEvents([]);
      return;
    }

    setIsLoadingEvents(true);
    setError(null);

    try {
      const nextEvents = await fetchIosEvents({
        calendarIds,
        calendars: nextCalendars,
        rangeEnd: nextRange.rangeEnd,
        rangeStart: nextRange.rangeStart,
      });

      if (!isMountedRef.current) return;

      setEvents(nextEvents);
      setLastSyncedAt(new Date());
    } catch (err) {
      if (!isMountedRef.current) return;

      setError(toErrorMessage(err, "iOSカレンダーの予定取得に失敗しました"));
      setEvents([]);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingEvents(false);
      }
    }
  }, [supported]);

  const loadCalendars = useCallback(async (): Promise<IosCalendarListItem[]> => {
    const nextCalendars = await fetchIosCalendars();
    const nextSelectedCalendarIds = getDefaultSelectedCalendarIds(nextCalendars);

    calendarsRef.current = nextCalendars;
    selectedCalendarIdsRef.current = new Set(nextSelectedCalendarIds);

    if (!isMountedRef.current) return nextCalendars;

    setCalendars(nextCalendars);
    setSelectedCalendarIds(new Set(nextSelectedCalendarIds));

    return nextCalendars;
  }, []);

  const syncCurrentRange = useCallback(async (nextCalendars: IosCalendarListItem[] = calendarsRef.current) => {
    await loadEvents({
      calendarIds: buildSelectedCalendarIdList(selectedCalendarIdsRef.current),
      calendars: nextCalendars,
      range: rangeRef.current,
    });
  }, [loadEvents]);

  const ensureWritableCalendars = useCallback(async (): Promise<IosCalendarListItem[]> => {
    if (!supported) throw new Error(IOS_CALENDAR_UNSUPPORTED_ERROR);

    let status = permissionStatusRef.current;

    if (status !== "granted") {
      status = await requestIosCalendarPermission();
      permissionStatusRef.current = status;
      setPermissionStatus(status);
    }

    if (status !== "granted") {
      isEnabledRef.current = false;
      setIsEnabled(false);
      throw new Error(IOS_CALENDAR_PERMISSION_ERROR);
    }

    isEnabledRef.current = true;
    setIsEnabled(true);

    return calendarsRef.current.length > 0 ? calendarsRef.current : loadCalendars();
  }, [loadCalendars, supported]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!supported) {
        setPermissionStatus("denied");
        return;
      }

      const status = await getIosCalendarPermissionStatus();
      if (cancelled || !isMountedRef.current) return;

      permissionStatusRef.current = status;
      setPermissionStatus(status);

      if (status !== "granted") return;

      isEnabledRef.current = true;
      setIsEnabled(true);

      const nextCalendars = await loadCalendars();
      if (cancelled || !isMountedRef.current) return;

      await loadEvents({
        calendarIds: getDefaultSelectedCalendarIds(nextCalendars),
        calendars: nextCalendars,
        range: rangeRef.current,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCalendars, loadEvents, supported]);

  useEffect(() => {
    if (permissionStatus !== "granted" || !isEnabled) return;

    void loadEvents({
      calendarIds: selectedCalendarIdList,
      calendars,
      range,
    });
  }, [calendars, isEnabled, loadEvents, permissionStatus, range, selectedCalendarIdList]);

  const connect = useCallback(async () => {
    if (!supported) {
      setError(IOS_CALENDAR_UNSUPPORTED_ERROR);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const status = await requestIosCalendarPermission();
      permissionStatusRef.current = status;
      setPermissionStatus(status);

      if (status !== "granted") {
        isEnabledRef.current = false;
        setIsEnabled(false);
        setError(IOS_CALENDAR_PERMISSION_ERROR);
        return;
      }

      isEnabledRef.current = true;
      setIsEnabled(true);

      const nextCalendars = await loadCalendars();
      await loadEvents({
        calendarIds: getDefaultSelectedCalendarIds(nextCalendars),
        calendars: nextCalendars,
        range: rangeRef.current,
      });
    } catch (err) {
      setError(toErrorMessage(err, "iOSカレンダー連携に失敗しました"));
    } finally {
      setIsConnecting(false);
    }
  }, [loadCalendars, loadEvents, supported]);

  const disconnect = useCallback(() => {
    calendarsRef.current = [];
    isEnabledRef.current = false;
    selectedCalendarIdsRef.current = new Set();
    setIsEnabled(false);
    setCalendars([]);
    setSelectedCalendarIds(new Set());
    setEvents([]);
    setError(null);
    setLastSyncedAt(null);
  }, []);

  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(calendarId)) {
        nextIds.delete(calendarId);
      } else {
        nextIds.add(calendarId);
      }

      selectedCalendarIdsRef.current = nextIds;
      return nextIds;
    });
  }, []);

  const syncRange = useCallback((nextRange: IosCalendarRange) => {
    const normalizedRange = normalizeRange(nextRange);
    rangeRef.current = normalizedRange;

    setRange((currentRange) => isSameRange(currentRange, normalizedRange) ? currentRange : normalizedRange);
  }, []);

  const forceSync = useCallback(async (nextRange?: Partial<IosCalendarRange>) => {
    const requestedRange = nextRange?.rangeStart && nextRange.rangeEnd
      ? normalizeRange({ rangeStart: nextRange.rangeStart, rangeEnd: nextRange.rangeEnd })
      : rangeRef.current;

    if (requestedRange) {
      rangeRef.current = requestedRange;
      setRange((currentRange) => isSameRange(currentRange, requestedRange) ? currentRange : requestedRange);
    }

    await loadEvents({
      calendarIds: buildSelectedCalendarIdList(selectedCalendarIdsRef.current),
      calendars: calendarsRef.current,
      range: requestedRange,
    });
  }, [loadEvents]);

  const refresh = useCallback(async () => {
    if (permissionStatusRef.current !== "granted") {
      await connect();
      return;
    }

    isEnabledRef.current = true;
    setIsEnabled(true);

    const nextCalendars = await loadCalendars();
    const currentSelectedCalendarIds = buildSelectedCalendarIdList(selectedCalendarIdsRef.current);
    const nextCalendarIds = currentSelectedCalendarIds.length > 0 ? currentSelectedCalendarIds : getDefaultSelectedCalendarIds(nextCalendars);

    await loadEvents({
      calendarIds: nextCalendarIds,
      calendars: nextCalendars,
      range: rangeRef.current,
    });
  }, [connect, loadCalendars, loadEvents]);

  const createEvent = useCallback(async (event: IosCalendarWritableEventInput): Promise<IosCalendarEvent> => {
    setIsWritingEvent(true);
    setError(null);

    try {
      const nextCalendars = await ensureWritableCalendars();
      const created = await createIosCalendarEvent({ event, calendars: nextCalendars });
      await syncCurrentRange(nextCalendars);
      return created;
    } catch (err) {
      const message = toErrorMessage(err, IOS_CALENDAR_CREATE_ERROR);
      if (isMountedRef.current) setError(message);
      throw err;
    } finally {
      if (isMountedRef.current) setIsWritingEvent(false);
    }
  }, [ensureWritableCalendars, syncCurrentRange]);

  const updateEvent = useCallback(async (event: IosCalendarWritableEventUpdateInput): Promise<IosCalendarEvent> => {
    setIsWritingEvent(true);
    setError(null);

    try {
      const nextCalendars = await ensureWritableCalendars();
      const updated = await updateIosCalendarEvent({ event, calendars: nextCalendars });
      await syncCurrentRange(nextCalendars);
      return updated;
    } catch (err) {
      const message = toErrorMessage(err, IOS_CALENDAR_UPDATE_ERROR);
      if (isMountedRef.current) setError(message);
      throw err;
    } finally {
      if (isMountedRef.current) setIsWritingEvent(false);
    }
  }, [ensureWritableCalendars, syncCurrentRange]);

  const deleteEvent = useCallback(async (event: IosCalendarWritableEventDeleteInput): Promise<void> => {
    setIsWritingEvent(true);
    setError(null);

    try {
      const nextCalendars = await ensureWritableCalendars();
      await deleteIosCalendarEvent({ event, calendars: nextCalendars });
      await syncCurrentRange(nextCalendars);
    } catch (err) {
      const message = toErrorMessage(err, IOS_CALENDAR_DELETE_ERROR);
      if (isMountedRef.current) setError(message);
      throw err;
    } finally {
      if (isMountedRef.current) setIsWritingEvent(false);
    }
  }, [ensureWritableCalendars, syncCurrentRange]);

  useEffect(() => {
    if (!supported) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (permissionStatusRef.current !== "granted" || !isEnabledRef.current) return;

      void refresh();
    });

    return () => {
      subscription.remove();
    };
  }, [refresh, supported]);

  return {
    calendars,
    connect,
    connectionStatus,
    createEvent,
    deleteEvent,
    disconnect,
    error,
    events,
    forceSync,
    isConnected: connectionStatus === "connected",
    isConnecting,
    isLoadingEvents,
    isWritingEvent,
    lastSyncedAt,
    permissionStatus,
    refresh,
    selectedCalendarIdList,
    selectedCalendarIds,
    syncRange,
    toggleCalendar,
    updateEvent,
  };
};
