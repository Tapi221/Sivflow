import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── アクセストークン管理は useGoogleCalendarIntegration.ts の localStorage に一元化。
// このストアは UI 状態（接続済みフラグ・選択カレンダーID）のみ管理する。

type CalendarIntegrationPersistedState = {
  wasConnected: boolean;
  accountEmail: string | null;
  selectedCalendarIds: string[];
};

type CalendarIntegrationActions = {
  markConnected: (email: string | null, calendarIds: string[]) => void;
  markDisconnected: () => void;
  setSelectedCalendarIds: (ids: string[]) => void;
  toggleCalendarId: (id: string) => void;
};

type CalendarIntegrationStore = CalendarIntegrationPersistedState &
  CalendarIntegrationActions;

export const useCalendarIntegrationStore = create<CalendarIntegrationStore>()(
  persist(
    (set, get) => ({
      wasConnected: false,
      accountEmail: null,
      selectedCalendarIds: [],

      markConnected: (email, calendarIds) =>
        set({
          wasConnected: true,
          accountEmail: email,
          selectedCalendarIds: calendarIds,
        }),

      markDisconnected: () =>
        set({
          wasConnected: false,
          accountEmail: null,
          selectedCalendarIds: [],
        }),

      setSelectedCalendarIds: (ids) => set({ selectedCalendarIds: ids }),

      toggleCalendarId: (id) => {
        const current = get().selectedCalendarIds;
        const next = current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id];
        set({ selectedCalendarIds: next });
      },
    }),
    {
      name: "flashcard-master.calendar-integration",
      partialize: (state) => ({
        wasConnected: state.wasConnected,
        accountEmail: state.accountEmail,
        selectedCalendarIds: state.selectedCalendarIds,
      }),
    },
  ),
);
