import { format } from "date-fns";
import { AnimatedSquareCheckbox } from "@/features/calendar/chip/checkbox/AnimatedSquareCheckbox";
import { TASK_COLUMNS } from "./task.types";
import type { Task } from "./task.types";
import { TaskStatusDot } from "./TaskStatusDot";

type TaskListViewProps = {
  tasks: Task[];
  onToggleTaskDone: (taskId: string, done: boolean) => void;
};

export const TaskListView = ({ tasks, onToggleTaskDone }: TaskListViewProps) => {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#e9eaed]">
            <th className="w-7 pb-2 pr-2 text-left">
              <span className="sr-only">完了</span>
            </th>
            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
              タイトル
            </th>
            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
              ステータス
            </th>
            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
              優先度
            </th>
            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
              カテゴリ
            </th>
            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9aa0aa]">
              期日
            </th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => {
            const col = TASK_COLUMNS.find((c) => c.id === task.status);
            const isDone = task.status === "done";
            const checkboxColor = isDone ? "#193a5c" : "#9ca3af";

            return (
              <tr
                key={task.id}
                className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
              >
                <td className="w-7 py-2.5 pr-2 align-top">
                  <button
                    type="button"
                    className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                    aria-label={isDone ? "Mark task as not done" : "Complete task"}
                    onClick={() => onToggleTaskDone(task.id, !isDone)}
                  >
                    <AnimatedSquareCheckbox checked={isDone} color={checkboxColor} />
                  </button>
                </td>

                <td className="py-2.5 pr-4 font-medium leading-[18px] text-[#24262d]">
                  {task.title}
                </td>

                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-1.5 text-[#4c5361]">
                    <TaskStatusDot color={col?.dotColor} />
                    {col?.label}
                  </span>
                </td>

                <td className="py-2.5 pr-4 capitalize text-[#4c5361]">
                  {task.priority}
                </td>

                <td className="py-2.5 pr-4 text-[#4c5361]">
                  {task.category}
                </td>

                <td className="py-2.5 text-[#8f929c]">
                  {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};