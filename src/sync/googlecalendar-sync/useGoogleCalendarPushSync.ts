import { useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, query, type Unsubscribe } from "firebase/firestore";
import { firestoreDb } from "@/services/firebase";

type UseGoogleCalendarPushSyncOptions = { userId: string | null; selectedCalendarIds: Set<string>; onNotification: (calendarId: string) => void };

type DebounceTimer = ReturnType<typeof setTimeout>;

const NOTIFICATION_DEBO