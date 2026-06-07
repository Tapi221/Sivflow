import type { ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";

const ScheduleScreen = (_props: ScheduleScreenProps) => {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-white text-sm text-[#6d6d6d]" data-testid="mobile-schedule-screen">
      モバイルスケジュール
    </div>
  );
};

export { ScheduleScreen };
