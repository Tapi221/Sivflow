import { create } from "zustand";

type ScheduleScreenState = {
  isOpen: boolean;
  isDayDetailPanelOpen: boolean;
  canToggleDayDetailPanel: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openDayDetailPanel: () => void;
  closeDayDetailPanel: () => void;
  toggleDayDetailPanel: () => void;
  setCanToggleDayDetailPanel: (canToggleDayDetailPanel: boolean) => void;
};

export const useScheduleScreenStore = create<ScheduleScreenState>(
  (set) => ({
    isOpen: false,
    isDayDetailPanelOpen: true,
    canToggleDayDetailPanel: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    openDayDetailPanel: () => set({ isDayDetailPanelOpen: true }),
    closeDayDetailPanel: () => set({ isDayDetailPanelOpen: false }),
    toggleDayDetailPanel: () =>
      set((state) =>
        state.canToggleDayDetailPanel
          ? { isDayDetailPanelOpen: !state.isDayDetailPanelOpen }
          : {},
      ),
    setCanToggleDayDetailPanel: (canToggleDayDetailPanel) =>
      set({ canToggleDayDetailPanel }),
  }),
);
