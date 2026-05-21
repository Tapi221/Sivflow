import {
  BoardListToggleButton,
  type BoardListViewMode,
} from "../chip/Toggle.boardlist";
import { DateFilterChip } from "../chip/DateFilterChip";
import { FilterChip } from "../chip/FilterChip";
import { MoreMenuButton } from "../chip/MoreMenuButton";
import { NewTaskButton } from "../chip/NewTaskButton";

type TaskToolbarProps = {
  filterDate: string | null;
  viewMode: BoardListViewMode;
  onClearFilterDate: () => void;
  onChangeViewMode: (viewMode: BoardListViewMode) => void;
  onOpenNewTaskModal: () => void;
  onOpenFilter?: () => void;
  onOpenMoreMenu?: () => void;
};

export const TaskToolbar = ({
  filterDate,
  viewMode,
  onClearFilterDate,
  onChangeViewMode,
  onOpenNewTaskModal,
  onOpenFilter,
  onOpenMoreMenu,
}: TaskToolbarProps) => {
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