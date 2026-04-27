import { cn } from "@/lib/utils";
import type { ExplorerDetailSyncViewState } from "@/hooks/sync/useExplorerDetailSyncStates";

type ExplorerDetailSyncBadgeProps = {
  state: ExplorerDetailSyncViewState;
};

const syncBadgeClassNameByStatus = {
  synced: "border-[#c9dff4] bg-[#f2f8fd] text-[#37627e]",
  syncing: "border-[#93c5fd] bg-[#eff6ff] text-[#1d4ed8]",
  pending: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
  error: "border-[#fecaca] bg-[#fef2f2] text-[#b42318]",
  conflict: "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]",
  unknown: "border-[#d6e0e8] bg-[#f8fafc] text-[#667085]",
} satisfies Record<ExplorerDetailSyncViewState["status"], string>;

export const ExplorerDetailSyncBadge = ({
  state,
}: ExplorerDetailSyncBadgeProps) => {
  return (
    <span
      title={state.title}
      data-sync-status={state.status}
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-[7px] border px-2",
        "text-[12px] font-medium leading-none shadow-none",
        syncBadgeClassNameByStatus[state.status],
      )}
    >
      <span className="truncate">{state.label}</span>
    </span>
  );
};
