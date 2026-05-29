import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchIosCalendars, fetchIosEvents, getIosCalendarPermissionStatus, isIosCalendarSupported, requestIosCalendarPermission } from "./iosCalendar.api";
import type { GoogleCalendarEvent } from "@core/calendar/calendarEvent.types";
import type { IosCalendarConnectionStatus, IosCalendarListItem, IosCalendarPermissionStatus, IosCalendarRange } from "./iosCalendar.types";

type LoadEventsInput = {
  calendarIds: string[];
  calendars: IosCalendarListItem[];
  range: IosCalendarRange | null;
};

const IOS_CALENDAR_PERMISSION_ERROR = "iOSカレンダーへのアクセス許可が必要です";
const IOS_CALENDAR_UNSUPPORTED_ERROR = "iOSカレンダー連携はiOS端末でのみ利用できます";

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
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const rangeRef = useRef<IosCalendarRange | null>(null);
  const isMountedRef = useRef(true);
  const selectedCalendarIdList = useMemo(() => Array.from(selectedCalendarIds), [selectedCalendarIds]);
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

      setError(err instanceof Error ? err.message : "iOSカレンダーの予定取得に失敗しました");
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

    if (!isMountedRef.current) return nextCalendars;

    setCalendars(nextCalendars);
    setSelectedCalendarIds(new Set(nextSelectedCalendarIds));

    return nextCalendars;
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!supported) {
        setPermissionStatus("denied");
        return;
      }

      const status = await getIosCalendarPermissionStatus();
      if (cancelled || !isMountedRef.current) return;

      setPermissionStatus(status);

      if (status !== "granted") return;

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
      setPermissionStatus(status);

      if (status !== "granted") {
        setIsEnabled(false);
        setError(IOS_CALENDAR_PERMISSION_ERROR);
        return;
      }

      setIsEnabled(true);

      const nextCalendars = await loadCalendars();
      await loadEvents({
        calendarIds: getDefaultSelectedCalendarIds(nextCalendars),
        calendars: nextCalendars,
        range: rangeRef.current,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "iOSカレンダー連携に失敗しました");
    } finally {
      setIsConnecting(false);
    }
  }, [loadCalendars, loadEvents, supported]);

  const disconnect = useCallback(() => {
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
      calendarIds: selectedCalendarIdList,
      calendars,
      range: requestedRange,
    });
  }, [calendars, loadEvents, selectedCalendarIdList]);

  const refresh = useCallback(async () => {
    if (permissionStatus !== "granted") {
      await connect();
      return;
    }

    setIsEnabled(true);

    const nextCalendars = await loadCalendars();
    const nextCalendarIds = selectedCalendarIdList.length > 0 ? selectedCalendarIdList : getDefaultSelectedCalendarIds(nextCalendars);

    await loadEvents({
      calendarIds: nextCalendarIds,
      calendars: nextCalendars,
      range: rangeRef.current,
    });
  }, [connect, loadCalendars, loadEvents, permissionStatus, selectedCalendarIdList]);

  return {
    calendars,
    connect,
    connectionStatus,
    disconnect,
    error,
    events,
    forceSync,
    isConnected: connectionStatus === "connected",
    isConnecting,
    isLoadingEvents,
    lastSyncedAt,
    permissionStatus,
    refresh,
    selectedCalendarIdList,
    selectedCalendarIds,
    syncRange,
    toggleCalendar,
  };
};