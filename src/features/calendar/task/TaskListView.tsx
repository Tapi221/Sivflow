import { format } from "date-fns";
import {
  CheckSquareFilledIcon,
  SquareOutlineIcon,
} from "@/components/icons/schedule.icons";
import { TASK_COLUMNS } from "./task.types";
import type { Task } from "./task.types";

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

            return (
              <tr
                key={task.id}
                className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
              >
                <td className="w-7 py-2.5 pr-2 align-top">
                  <button
                    type="button"
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#9ca3af] hover:text-[#193a5c]"
                    aria-label={isDone ? "Mark task as not done" : "Complete task"}
                    onClick={() => onToggleTaskDone(task.id, !isDone)}
                  >
                    {isDone ? (
                      <CheckSquareFilledIcon className="h-4 w-4 text-[#193a5c]" />
                    ) : (
                      <SquareOutlineIcon className="h-4 w-4" />
                    )}
                  </button>
                </td>

                <td className="py-2.5 pr-4 font-medium text-[#1f2329]">
                  {task.title}
                </td>

                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-1.5 text-[#4c5361]">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: col?.dotColor }}
                    />
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