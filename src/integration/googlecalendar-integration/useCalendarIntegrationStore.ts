import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────────────────────────
// 型
// ─────────────────────────────────────────────

type CalendarIntegrationPersistedState = {
  wasConnected: boolean;
  accountEmail: string | null;
  selectedCalendarIds: string[];

  // ★追加：変更検知用
  lastChangedAt: number;
};

type CalendarIntegrationActions = {
  markConnected: (email: string | null, calendarIds: string[]) => void;
  markDisconnected: () => void;
  setSelectedCalendarIds: (ids: string[]) => void;
  toggleCalendarId: (id: string) => void;

  // ★追加
  touch: () => void;
};

type CalendarIntegrationStore =
  CalendarIntegrationPersistedState &
  CalendarIntegrationActions;

// ─────────────────────────────────────────────
// store
// ─────────────────────────────────────────────

export const useCalendarIntegrationStore =
  create<CalendarIntegrationStore>()(
    persist(
      (set, get) => ({
        wasConnected: false,
        accountEmail: null,
        selectedCalendarIds: [],
        lastChangedAt: Date.now(),

        markConnected: (email, calendarIds) =>
          set({
            wasConnected: true,
            accountEmail: email,
            selectedCalendarIds: calendarIds,
            lastChangedAt: Date.now(),
          }),

        markDisconnected: () =>
          set({
            wasConnected: false,
            accountEmail: null,
            selectedCalendarIds: [],
            lastChangedAt: Date.now(),
          }),

        setSelectedCalendarIds: (ids) =>
          set({
            selectedCalendarIds: ids,
            lastChangedAt: Date.now(),
          }),

        toggleCalendarId: (id) => {
          const current = get().selectedCalendarIds;
          const next = current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id];

          set({
            selectedCalendarIds: next,
            lastChangedAt: Date.now(),
          });
        },

        touch: () => set({ lastChangedAt: Date.now() }),
      }),
      {
        name: "flashcard-master.calendar-integration",
        partialize: (state) => ({
          wasConnected: state.wasConnected,
          accountEmail: state.accountEmail,
          selectedCalendarIds: state.selectedCalendarIds,
          // lastChangedAtは永続化しない（重要）
        }),
      },
    ),
  );