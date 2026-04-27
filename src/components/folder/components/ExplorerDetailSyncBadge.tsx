import { cn } from "@/lib/utils";

export type ExplorerDetailSyncStatus =
  | "synced"
  | "syncing"
  | "pending"
  | "error"
  | "conflict"
  | "unknown";

export type ExplorerDetailSyncViewState = {
  status: ExplorerDetailSyncStatus;
  title: string;
  lastSyncedAt?: unknown;
  lastError?: string | null;
};

type SyncBadgeMeta = {
  label: string;
  className: string;
};

const syncBadgeMeta: Record<ExplorerDetailSyncStatus, SyncBadgeMeta> = {
  synced: {
    label: "同期済み",
    className: "border-[#dedbd2] bg-[#faf9f5] text-[#6f6b63]",
  },
  syncing: {
    label: "同期中",
    className: "border-[#d8d6cf] bg-[#f7f6f1] text-[#5f625f]",
  },
  pending: {
    label: "同期待ち",
    className: "border-[#dedbd2] bg-[#fbfaf6] text-[#746f65]",
  },
  error: {
    label: "エラー",
    className: "border-[#e1d8d5] bg-[#fbf8f6] text-[#7a5d58]",
  },
  conflict: {
    label: "競合",
    className: "border-[#ddd8ce] bg-[#faf8f2] text-[#746a59]",
  },
  unknown: {
    label: "未確認",
    className: "border-[#e1dfd8] bg-[#fafafa] text-[#777671]",
  },
};

export const createUnknownExplorerDetailSyncState = (): ExplorerDetailSyncViewState => ({
  status: "unknown",
  title: "同期状態を確認中です",
});

export const ExplorerDetailSyncBadge = ({
  state,
}: {
  state: ExplorerDetailSyncViewState;
}) => {
  const meta = syncBadgeMeta[state.status];

  return (
    <span
      title={state.title}
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-[7px] border px-2",
        "text-[12px] leading-none shadow-[0_1px_0_rgba(36,35,31,0.02)]",
        meta.className,
      )}
    >
      <span className="truncate">{meta.label}</span>
    </span>
  );
};
