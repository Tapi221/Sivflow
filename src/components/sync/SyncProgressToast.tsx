import { useSync } from "@/hooks/sync/useSync";

export const SyncProgressToast = () => {
  const { syncProgress } = useSync();

  if (!syncProgress) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <div className="flex min-w-[240px] items-center gap-4 rounded-[24px] border border-white bg-white/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-primary-600/15">
          <div className="h-2.5 w-2.5 rounded-full bg-primary-600/70" />
        </div>
        <div className="flex-1">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600">
            Cloud Sync
          </p>
          <p className="max-w-[160px] truncate text-xs font-bold text-slate-600">
            {syncProgress}
          </p>
        </div>
      </div>
    </div>
  );
};
