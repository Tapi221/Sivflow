import { ScheduleScreen } from "@/screens/ScheduleScreen.desktop";

const Tasks = () => {
  return (
    <div className="h-full min-h-0 w-full">
      <ScheduleScreen initialActiveMode="task" />
    </div>
  );
};

export default Tasks;
