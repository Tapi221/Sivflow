import { cn } from "@/lib/utils";
import type { ExplorerDetailSyncViewState } from "@/hooks/sync/useExplorerDetailSyncStates";

type ExplorerDetailSyncBadgeProps = {
  state: ExplorerDetailSyncViewState;
};

const syncBadgeClassNameByStatus = {
  synced: "border-[#dedbd2] bg-[#faf9f5] text-[#6f6b63]",
  syncing: "border-[#d8d6cf] bg-[#f7f6f1] text-[#5f625f]",
  pending: "border-[#dedbd2] bg-[#fbfaf6] text-[#746f65]",
  error: "border-[#e1d8d5] bg-[#fbf8f6] text-[#7a5d58]",
  conflict: "border-[#ddd8ce] bg-[#faf8f2] text-[#746a59]",
  unknown: "border-[#e1dfd8] bg-[#fafafa] text-[#777671]",
} satisfies Record<ExplorerDetailSyncViewState["status"], string>;

export const ExplorerDetailSyncBadge = ({
  state,
}: ExplorerDetailSyncBadgeProps) => {
  return (
    <span
      title={state.title}
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-[7px] border px-2",
        "text-[12px] leading-none shadow-[0_1px_0_rgba(36,35,31,0.02)]",
        syncBadgeClassNameByStatus[state.status],
      )}
    >
      <span className="truncate">{state.label}</span>
    </span>
  );
};
