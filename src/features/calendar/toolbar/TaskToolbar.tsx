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
  selectedTaskListId?: string | null;
  onClearFilterDate: () => void;
  onChangeViewMode: (viewMode: BoardListViewMode) => void;
  onSelectTaskList?: (taskListId: string | null) => void;
  onOpenNewTaskModal: () => void;
  onOpenFilter?: () => void;
  onOpenMoreMenu?: () => void;
};

export const TaskToolbar = ({
  filterDate,
  viewMode,
  taskListOptions = [],
  selectedTaskListId = null,
  onClearFilterDate,
  onChangeViewMode,
  onSelectTaskList,
  onOpenNewTaskModal,
  onOpenFilter,
  onOpenMoreMenu,
}: TaskToolbarProps) => {
  const canSwitchTaskList = taskListOptions.length > 0 && onSelectTaskList;

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

        {canSwitchTaskList && (
          <select
            value={selectedTaskListId ?? ""}
            onChange={(event) => {
              onSelectTaskList(event.target.value || null);
            }}
            aria-label="Google ToDo リストで表示を切り替え"
            className="h-9 rounded-full border border-[#e5e5ea] bg-white px-3 text-[13px] font-medium text-[#4b5563] shadow-sm outline-none transition-colors hover:bg-[#f8f9fb] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/10"
          >
            <option value="">すべての ToDo リスト</option>
            {taskListOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
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
