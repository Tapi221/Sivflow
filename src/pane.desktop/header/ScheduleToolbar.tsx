import { CalendarIcon } from "@/chip/icons/icons.sidebar";
import type { CalendarWorkspaceToolbarProps } from "@/features/calendar/scheduleScreen.types";
import { CalendarTagStrip } from "./CalendarTagStrip";

export const CalendarToolbar = ({
  viewMode: _viewMode,
  onSelectViewMode: _onSelectViewMode,
}: CalendarWorkspaceToolbarProps) => {
  return (
    <div className="calendar-workspace-toolbar flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pl-[var(--workspace-content-gutter)] pr-[var(--workspace-content-gutter)]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative inline-grid h-8 w-max grid-flow-col items-center rounded-xl bg-[#f7f7f7] p-0.5" aria-label="Calendar">
          <div className="relative z-10 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg border border-[#eeeeee] bg-white p-0 text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <CalendarIcon aria-hidden="true" className="block h-4 w-4 shrink-0 text-[#8c8c8c]" />
          </div>
        </div>
        <CalendarTagStrip />
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
