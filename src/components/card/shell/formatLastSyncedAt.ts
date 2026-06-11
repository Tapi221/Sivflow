const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();
const formatLastSyncedAt = (lastSyncedAtMs: number | null) => {
  if ((lastSyncedAtMs === null || lastSyncedAtMs === undefined) || !Number.isFinite(lastSyncedAtMs)) {
    return "未同期";
  }

  const date = new Date(lastSyncedAtMs);
  if (Number.isNaN(date.getTime())) {
    return "未同期";
  }

  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (isSameDay(date, now)) {
    return `今日 ${timeLabel}`;
  }

  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return `${dateLabel} ${timeLabel}`;
};



export { formatLastSyncedAt };
