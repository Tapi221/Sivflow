import { create } from "zustand";

type CalendarDockPanelState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useCalendarDockPanelStore = create<CalendarDockPanelState>(
  (set) => ({
    isOpen: false,
    open: () => {
      set({ isOpen: true });
    },
    close: () => {
      set({ isOpen: false });
    },
    toggle: () => {
      set((state) => ({
        isOpen: !state.isOpen,
      }));
    },
  }),
);
