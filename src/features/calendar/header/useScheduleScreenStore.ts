import { create } from "zustand";



type ScheduleScreenState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};



const useScheduleScreenStore = create<ScheduleScreenState>(
  (set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  }),
);



export { useScheduleScreenStore };
