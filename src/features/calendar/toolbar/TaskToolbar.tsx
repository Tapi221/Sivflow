import { MoreMenuButton } from "../../../chip/button/MoreMenuButton";
import { NewTaskButton } from "../../../chip/button/NewTaskButton";
import { DateFilterChip } from "../../../chip/chip/DateFilterChip";
import { FilterChip } from "../../../chip/chip/FilterChip";
import {
  BoardListToggleButton,
  type BoardListViewMode,
} from "../../../chip/toggle/Toggle.boardlist";

type TaskListOption = {
  id: string;
  label: string;
};

type TaskToolbarProps = {
  filterDate: string | null;
  viewMode: BoardListViewMode;
  taskListOptions?: TaskListOption[];
  selectedTaskListIds?: string[];
  onClearFilterDate: () => void;
  onChangeViewMode: (viewMode: BoardListViewMode) => void;
  onSelectAllTaskLists?: () => void;
  onOpenNewTaskModal: () => void;
  onOpenFilter?: () => void;
  onOpenMoreMenu?: () => void;
};

export const TaskToolbar = ({
  filterDate,
  viewMode,
  taskListOptions = [],
  selectedTaskListIds = [],
  onClearFilterDate,
  onChangeViewMode,
  onSelectAllTaskLists,
  onOpenNewTaskModal,
  onOpenFilter,
  onOpenMoreMenu,
}: TaskToolbarProps) => {
  const selectedLabels = taskListOptions
    .filter((option) => selectedTaskListIds.includes(option.id))
    .map((option) => option.label);
  const taskListLabel = selectedLabels.length === 0
    ? "すべての ToDo リスト"
    : selectedLabels.length <= 2
      ? selectedLabels.join("、")
      : `${selectedLabels.slice(0, 2).join("、")} 他${selectedLabels.length - 2}`;

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[#e9eaed] px-4 py-2">
      {/* 左：フィルター群 */}
      <div className="flex items-center gap-2">
        {filterDate && (
          <DateFilterChip
            label={filterDate}
            onClear={onClearFilterDate}
          />
        )}

        {taskListOptions.length > 0 && (
          <button
            type="button"
            onClick={onSelectAllTaskLists}
            className="h-9 max-w-[260px] truncate rounded-full border border-[#e5e5ea] bg-white px-3 text-[13px] font-medium text-[#4b5563] shadow-sm outline-none transition-colors hover:bg-[#f8f9fb] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/10"
            title="クリックするとすべての ToDo リスト表示に戻ります"
          >
            {taskListLabel}
          </button>
        )}

        <FilterChip onClick={onOpenFilter} />
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
  );
};
