import { MoreMenuButton } from "../../../chip/button/MoreMenuButton";
import { NewTaskButton } from "../../../chip/button/NewTaskButton";
import { DateFilterChip } from "../../../chip/chip/DateFilterChip";
import { FilterChip } from "../../../chip/chip/FilterChip";
import {BoardListToggleButton,
  type BoardListViewMode,} from "../../../chip/toggle/Toggle.boardlist";
import type { TaskGroupMode } from "../task/task.types";

type TaskListOption = {
  id: string;
  label: string;
};

type TaskToolbarProps = {
  filterDate: string | null;
  viewMode: BoardListViewMode;
  groupMode: TaskGroupMode;
  taskListOptions?: TaskListOption[];
  selectedTaskListIds?: string[];
  onClearFilterDate: () => void;
  onChangeViewMode: (viewMode: BoardListViewMode) => void;
  onChangeGroupMode: (groupMode: TaskGroupMode) => void;
  onOpenNewTaskModal: () => void;
  onOpenFilter?: () => void;
  onOpenMoreMenu?: () => void;
};

const GROUP_MODE_LABEL: Record<TaskGroupMode, string> = {
  status: "状態",
  section: "セクション",
};

export const TaskToolbar = ({
  filterDate,
  viewMode,
  groupMode,
  taskListOptions = [],
  selectedTaskListIds = [],
  onClearFilterDate,
  onChangeViewMode,
  onChangeGroupMode,
  onOpenNewTaskModal,
  onOpenFilter,
  onOpenMoreMenu,
}: TaskToolbarProps) => {
  const selectedTaskListIdSet = new Set(selectedTaskListIds);

  return (
    <div className="flex shrink-0 flex-col border-b border-[#e9eaed] bg-white">
      <div className="flex items-center justify-between px-4 py-2">
        {/* 左：フィルター群 */}
        <div className="flex items-center gap-2">
          {filterDate && (
            <DateFilterChip
              label={filterDate}
              onClear={onClearFilterDate}
            />
          )}

          <FilterChip onClick={onOpenFilter} />

          <div
            className="inline-flex rounded-lg bg-[#f4f5f7] p-0.5"
            role="group"
            aria-label="タスクの表示分類"
          >
            {(["status", "section"] as const).map((mode) => {
              const active = groupMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeGroupMode(mode)}
                  className={`h-7 rounded-md px-3 text-[12px] font-semibold transition-colors ${
                    active
                      ? "bg-white text-[#1c1c1e] shadow-sm"
                      : "text-[#8f929c] hover:text-[#4b5563]"
                  }`}
                >
                  {GROUP_MODE_LABEL[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 右：ビュー切替 + New Task */}
        <div className="flex items-center gap-2">
          <BoardListToggleButton
            viewMode={viewMode}
            onChange={onChangeViewMode}
          />

          <MoreMenuButton onClick={onOpenMoreMenu} />

          <NewTaskButton onClick={onOpenNewTaskModal} />
        </div>
      </div>

      {taskListOptions.length > 0 && (
        <div className="min-w-0 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2">
            {taskListOptions.map((taskListOption) => {
              const isSelected = selectedTaskListIdSet.has(taskListOption.id);
              const className = [
                "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-medium leading-none",
                isSelected
                  ? "border-[#63b59c] bg-[#eaf6f2] text-[#3f8874]"
                  : "border-[#e4e7eb] bg-[#f8fafb] text-[#7b818c]",
              ].join(" ");

              return (
                <span
                  key={taskListOption.id}
                  className={className}
                  title={taskListOption.label}
                >
                  {taskListOption.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
