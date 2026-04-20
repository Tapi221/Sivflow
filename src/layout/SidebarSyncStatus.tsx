import { useAuth } from "@/contexts/AuthContext";
import "./Sidebar.css";

type SyncTone = "idle" | "syncing" | "success" | "error" | "waiting";

const formatLastSyncText = (
  lastSyncTime: string | number | Date | null | undefined,
) => {
  if (!lastSyncTime) return "最終同期: 未実行";

  const date = new Date(lastSyncTime);

  if (Number.isNaN(date.getTime())) {
    return "最終同期: 不明";
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeText = date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) {
    return `最終同期: 今日 ${timeText}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `最終同期: 昨日 ${timeText}`;
  }

  const dateText = date.toLocaleDateString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  });

  return `最終同期: ${dateText} ${timeText}`;
};

const getSyncTone = ({
  syncStatus,
  syncNotice,
}: {
  syncStatus: string | null | undefined;
  syncNotice: string | null | undefined;
}): SyncTone => {
  if (syncNotice === "wifi_wait") return "waiting";
  if (syncStatus === "syncing") return "syncing";
  if (syncStatus === "error") return "error";
  if (syncStatus === "success") return "success";
  return "idle";
};

const getSyncLabel = ({
  syncStatus,
  syncNotice,
  lastSyncTime,
}: {
  syncStatus: string | null | undefined;
  syncNotice: string | null | undefined;
  lastSyncTime: string | number | Date | null | undefined;
}) => {
  if (syncNotice === "wifi_wait") return "Wi-Fi待機中";
  if (syncStatus === "syncing") return "同期中...";
  if (syncStatus === "error") return "同期エラー";
  if (lastSyncTime) return formatLastSyncText(lastSyncTime);
  return "最終同期: 未実行";
};

export const SidebarSyncStatus = () => {
  const { syncStatus, syncNotice, lastSyncTime } = useAuth();

  const tone = getSyncTone({ syncStatus, syncNotice });
  const label = getSyncLabel({ syncStatus, syncNotice, lastSyncTime });

  return (
    <div
      className={`sidebar__sync-status sidebar__sync-status--${tone}`}
      aria-live="polite"
      title={label}
    >
      <span className="sidebar__sync-status-dot" aria-hidden="true" />
      <span className="sidebar__sync-status-label">{label}</span>
    </div>
  );
};
