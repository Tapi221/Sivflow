import { useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, query, type Unsubscribe } from "firebase/firestore";
import { firestoreDb } from "@/services/firebase";

type UseGoogleCalendarPushSyncOptions = { userId: string | null; selectedCalendarIds: Set<string>; onNotification: (calendarId: string) => void };

<<<<<<< HEAD
const PUSH_SYNC_DEBOUNCE_MS = 250;
=======
type DebounceTimer = ReturnType<typeof setTimeout>;

const NOTIFICATION_DEBO
>>>>>>> da9ae81fae5856219806c56b2586862d62485f4e
