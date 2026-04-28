import { cn } from "@/lib/utils";
import type { ExplorerDetailSyncViewState } from "@/hooks/sync/useExplorerDetailSyncStates";

type ExplorerDetailSyncBadgeProps = {
  state: ExplorerDetailSyncViewState;
};

const syncBadgeClassNameByStatus = {
  synced:
    "border-[var(--mf-explorer-success-border)] bg-[var(--mf-explorer-success-bg)] text-[var(--mf-explorer-success-text)]",
  syncing:
    "border-[var(--mf-explorer-info-border)] bg-[var(--mf-explorer-info-bg)] text-[var(--mf-explorer-info-text)]",
  pending: "border-[#ead79c] bg-[#fff9e8] text-[#7b6420]",
  error: "border-[#efc2bb] bg-[#fff4f2] text-[#9d4439]",
  conflict: "border-[#e9c990] bg-[#fff7e7] text-[#8a5b18]",
  unknown:
    "border-[var(--mf-explorer-border)] bg-[var(--mf-explorer-chip-bg)] text-[var(--mf-explorer-text-muted)]",
} satisfies Record<ExplorerDetailSyncViewState["status"], string>;

export const ExplorerDetailSyncBadge = ({
  state,
}: ExplorerDetailSyncBadgeProps) => {
  return (
    <span
      title={state.title}
      data-sync-status={state.status}
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-full border px-2.5",
        "text-[12px] font-semibold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        syncBadgeClassNameByStatus[state.status],
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          state.status === "synced" && "bg-[var(--mf-explorer-success-dot)]",
          state.status === "syncing" && "bg-[var(--mf-explorer-info-dot)]",
          state.status === "pending" && "bg-[#d99f28]",
          state.status === "error" && "bg-[#cc4b3f]",
          state.status === "conflict" && "bg-[#c98125]",
          state.status === "unknown" && "bg-[var(--mf-explorer-text-faint)]",
        )}
      />
      <span className="truncate">{state.label}</span>
    </span>
  );
};
