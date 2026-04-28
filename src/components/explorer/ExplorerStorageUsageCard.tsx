import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

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

const StorageGaugeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 7.5C4 5.57 7.58 4 12 4C16.42 4 20 5.57 20 7.5C20 9.43 16.42 11 12 11C7.58 11 4 9.43 4 7.5Z"
      stroke="currentColor"
      strokeWidth="1.55"
    />
    <path
      d="M4 7.5V16.5C4 18.43 7.58 20 12 20C16.42 20 20 18.43 20 16.5V7.5"
      stroke="currentColor"
      strokeWidth="1.55"
    />
    <path
      d="M4 12C4 13.93 7.58 15.5 12 15.5C16.42 15.5 20 13.93 20 12"
      stroke="currentColor"
      strokeWidth="1.55"
    />
  </svg>
);

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
      className={cn(
        "explorer-storage-usage-card rounded-[14px] border border-[var(--mf-explorer-border)]",
        "bg-[rgba(255,255,252,0.76)] px-3 py-3 text-[var(--mf-explorer-text)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_8px_20px_rgba(38,49,39,0.045)]",
      )}
      aria-label="ストレージ使用量"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "explorer-storage-usage-card__icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px]",
            "bg-[var(--mf-explorer-brand-soft)] text-[var(--mf-explorer-brand)]",
          )}
        >
          <StorageGaugeIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold leading-4">
            ストレージ
          </div>
          <div className="truncate text-[11px] leading-4 text-[var(--mf-explorer-text-muted)]">
            {usageText}
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--mf-explorer-text-muted)]">
          {percentLabel}
        </span>
      </div>

      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={usagePercent ?? 0}
        aria-valuetext={usageText}
        className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(95,138,106,0.11)]"
      >
        <span
          className="block h-full rounded-full bg-[var(--mf-explorer-brand)] transition-[width] duration-300"
          style={
            {
              width: `${usagePercent ?? 0}%`,
            } satisfies CSSProperties
          }
        />
      </div>
    </section>
  );
};
