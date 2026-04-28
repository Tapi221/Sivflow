import { useEffect, useMemo, useState, type CSSProperties } from "react";

type StorageUsageState = {
  status: "loading" | "available" | "unavailable";
  usageBytes: number | null;
  quotaBytes: number | null;
};

const INITIAL_STORAGE_USAGE_STATE: StorageUsageState = {
  status: "loading",
  usageBytes: null,
  quotaBytes: null,
};

const STORAGE_USAGE_REFRESH_INTERVAL_MS = 60_000;

const formatStorageBytes = (bytes: number | null): string => {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const maximumFractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;

  return `${new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits,
  }).format(value)} ${units[unitIndex]}`;
};

const resolveStorageUsagePercent = (
  usageBytes: number | null,
  quotaBytes: number | null,
): number | null => {
  if (
    usageBytes === null ||
    quotaBytes === null ||
    !Number.isFinite(usageBytes) ||
    !Number.isFinite(quotaBytes) ||
    usageBytes < 0 ||
    quotaBytes <= 0
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((usageBytes / quotaBytes) * 100)),
  );
};

const readStorageUsage = async (): Promise<StorageUsageState> => {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== "function"
  ) {
    return {
      status: "unavailable",
      usageBytes: null,
      quotaBytes: null,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usageBytes =
      typeof estimate.usage === "number" ? estimate.usage : null;
    const quotaBytes =
      typeof estimate.quota === "number" ? estimate.quota : null;

    return {
      status:
        usageBytes === null && quotaBytes === null
          ? "unavailable"
          : "available",
      usageBytes,
      quotaBytes,
    };
  } catch {
    return {
      status: "unavailable",
      usageBytes: null,
      quotaBytes: null,
    };
  }
};

export const ExplorerStorageUsageCard = () => {
  const [storageUsage, setStorageUsage] = useState<StorageUsageState>(
    INITIAL_STORAGE_USAGE_STATE,
  );

  useEffect(() => {
    let cancelled = false;

    const updateStorageUsage = async () => {
      const nextStorageUsage = await readStorageUsage();
      if (cancelled) return;
      setStorageUsage(nextStorageUsage);
    };

    void updateStorageUsage();

    const refreshTimerId = window.setInterval(() => {
      void updateStorageUsage();
    }, STORAGE_USAGE_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void updateStorageUsage();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const usagePercent = useMemo(
    () =>
      resolveStorageUsagePercent(
        storageUsage.usageBytes,
        storageUsage.quotaBytes,
      ),
    [storageUsage.quotaBytes, storageUsage.usageBytes],
  );

  const usageLabel = useMemo(
    () => formatStorageBytes(storageUsage.usageBytes),
    [storageUsage.usageBytes],
  );

  const quotaLabel = useMemo(
    () => formatStorageBytes(storageUsage.quotaBytes),
    [storageUsage.quotaBytes],
  );

  const percentLabel = usagePercent === null ? "—" : `${usagePercent}%`;
  const isUnavailable = storageUsage.status === "unavailable";
  const isLoading = storageUsage.status === "loading";
  const usageText = isUnavailable
    ? "この環境では使用量を取得できません"
    : isLoading
      ? "ストレージ使用量を確認中"
      : `${usageLabel} / ${quotaLabel} 使用中`;

  return (
    <section
      className="explorer-storage-usage-card"
      aria-label="ストレージ使用量"
    >
      <div className="explorer-storage-usage-card__header">
        <h2 className="explorer-storage-usage-card__title">ストレージ</h2>
        <span className="explorer-storage-usage-card__detail">詳細</span>
      </div>

      <p className="explorer-storage-usage-card__usage">{usageText}</p>

      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={usagePercent ?? 0}
        aria-valuetext={usageText}
        className="explorer-storage-usage-card__meter"
      >
        <span
          className="explorer-storage-usage-card__meter-value"
          style={
            {
              width: `${usagePercent ?? 0}%`,
            } satisfies CSSProperties
          }
        />
      </div>

      <p className="explorer-storage-usage-card__percent">
        {percentLabel} 使用
      </p>
    </section>
  );
};
