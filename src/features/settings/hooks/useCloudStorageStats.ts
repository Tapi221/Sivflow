import { useCallback, useEffect, useRef, useState } from "react";
import { isCloudStorageStatsOutdated, rebuildCloudStorageStats, subscribeToCloudStorageStats } from "@/services/cloudStorageStatsService";
import type { CloudStorageStats } from "@/types";



type UseCloudStorageStatsResult = {
  stats: CloudStorageStats | null;
  loading: boolean;
  error: string | null;
  rebuilding: boolean;
  refresh: () => Promise<void>;
};



const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown; }).message === "string"
  ) {
    const message = (error as { message: string; }).message.trim();
    if (message.length > 0) {
      return message;
    }
  }

  return "クラウド使用量の取得に失敗しました。";
};
const useCloudStorageStats = (userId: string | null | undefined): UseCloudStorageStatsResult => {
  const [stats, setStats] = useState<CloudStorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const autoRepairAttemptedRef = useRef<string | null>(null);

  const runRebuild = useCallback(
    async (mode: "auto" | "manual"): Promise<void> => {
      if (!userId) {
        return;
      }

      if (mode === "auto" && autoRepairAttemptedRef.current === userId) {
        return;
      }

      if (mode === "auto") {
        autoRepairAttemptedRef.current = userId;
      }

      setRebuilding(true);
      setError(null);

      try {
        const rebuilt = await rebuildCloudStorageStats(userId);
        setStats(rebuilt);
      } catch (rebuildError) {
        setError(getErrorMessage(rebuildError));
        throw rebuildError;
      } finally {
        setRebuilding(false);
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      setError(null);
      setRebuilding(false);
      autoRepairAttemptedRef.current = null;
      return;
    }

    setLoading(true);
    setError(null);
    autoRepairAttemptedRef.current = null;

    const unsubscribe = subscribeToCloudStorageStats(
      userId,
      (nextStats) => {
        setStats(nextStats);
        setLoading(false);
        setError(null);

        if (nextStats && !isCloudStorageStatsOutdated(nextStats)) {
          autoRepairAttemptedRef.current = null;
          return;
        }

        void runRebuild("auto").catch(() => undefined);
      },
      (snapshotError) => {
        setError(getErrorMessage(snapshotError));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [runRebuild, userId]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      return;
    }

    autoRepairAttemptedRef.current = null;
    await runRebuild("manual");
  }, [runRebuild, userId]);

  return {
    stats,
    loading,
    error,
    rebuilding,
    refresh,
  };
};



export { useCloudStorageStats };
