import { cn } from "@/lib/utils";
import type { ExplorerDetailSyncViewState } from "@/hooks/sync/useExplorerDetailSyncStates";

type ExplorerDetailSyncBadgeProps = {
  state: ExplorerDetailSyncViewState;
};

const syncBadgeClassNameByStatus = {
  synced: "border-[#d7dde4] bg-[#f6f8fa] text-[#63707d]",
  syncing: "border-[#b9d2ea] bg-[#eef7ff] text-[#2368a6]",
  pending: "border-[#ead28e] bg-[#fff8dd] text-[#846211]",
  error: "border-[#f0b7ae] bg-[#fff1ef] text-[#a43d32]",
  conflict: "border-[#f0c779] bg-[#fff4d8] text-[#83550d]",
  unknown: "border-[#dce2e8] bg-[#fafbfc] text-[#7a858f]",
} satisfies Record<ExplorerDetailSyncViewState["status"], string>;

export const ExplorerDetailSyncBadge = ({
  state,
}: ExplorerDetailSyncBadgeProps) => {
  return (
    <span
      title={state.title}
      data-sync-status={state.status}
      className={cn(
        "explorer-detail-sync-badge inline-flex h-6 max-w-full items-center rounded-full border px-2",
        "text-[12px] font-semibold leading-none shadow-[0_1px_0_rgba(255,255,255,0.72)]",
        syncBadgeClassNameByStatus[state.status],
      )}
    >
      <span className="truncate">{state.label}</span>
    </span>
  );
};
