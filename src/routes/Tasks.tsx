import { CalendarWorkspaceToolbar } from "@/features/calendar/toolbar/CalendarToolbar";

const Tasks = () => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white text-[#25272d]">
      <CalendarWorkspaceToolbar
        activeMode="calendar"
        onSelectCalendar={() => undefined}
        onSelectTimeline={() => undefined}
      />
      <div className="px-5 py-6 text-[13px] font-medium leading-[17px] text-[#8f929c]">
        タスク
      </div>
    </div>
  );
};

export default Tasks;
