import { MoreMenuButton } from "../../../chip/button/MoreMenuButton";
import { NewTaskButton } from "../../../chip/button/NewTaskButton";
import { DateFilterChip } from "../../../chip/chip/DateFilterChip";
import { FilterChip } from "../../../chip/chip/FilterChip";
import { BoardListToggleButton, type BoardListViewMode } from "../../../chip/toggle/Toggle.boardlist";
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

const GROUP_MODE_OPTIONS: ReadonlyArray<{
  mode: TaskGroupMode;
  label: string;
}> = [
  { mode: "status", label: "状態" },
  { mode: "section", label: "セクション" },
];

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
      <div className="flex min-w-0 items-center gap-2 px-3 py-2 sm:px-4">
        {/* 左：フィルター群 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {filterDate && (
            <DateFilterChip
              label={filterDate}
              onClear={onClearFilterDate}
            />
          )}

          <FilterChip onClick={onOpenFilter} />

          <div
            className="inline-flex h-8 min-w-[72px] max-w-[150px] shrink items-center gap-0.5 overflow-hidden rounded-xl bg-[#f7f7f7] p-0.5 sm:max-w-none sm:shrink-0"
            role="radiogroup"
            aria-label="タスクの分類方法"
          >
            {GROUP_MODE_OPTIONS.map(({ mode, label }) => {
              const active = groupMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-label={label}
                  title={label}
                  aria-checked={active}
                  onClick={() => onChangeGroupMode(mode)}
                  className={`inline-flex h-7 min-w-0 flex-1 items-center gap-1 rounded-lg px-2 text-[11px] font-medium leading-none transition-colors duration-200 sm:flex-none sm:px-2.5 ${
                    active
                      ? "border border-[#eeeeee] bg-white text-[#6f7681] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                      : "text-[#a8adb5] hover:text-[#7b818c]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      active ? "bg-[#8d959f]" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右：ビュー切替 + New Task */}
        <div className="flex shrink-0 items-center gap-2">
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
