import { useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot, query, type Unsubscribe } from "firebase/firestore";
import { firestoreDb } from "@/services/firebase";

type UseGoogleCalendarPushSyncOptions = {
  userId: string | null;
  selectedCalendarIds: Set<string>;
  onNotification: (calendarId: string) => void;
};

const PUSH_SYNC_DEBOUNCE_MS = 250;