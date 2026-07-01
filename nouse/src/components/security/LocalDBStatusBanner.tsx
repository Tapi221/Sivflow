import { useEffect, useState } from "react";
import { AlertTriangle, Database, X } from "@web-renderer/chip/icons/icons";
import { clearLocalDBResetFailureReason, getLocalDBRuntimeStatus, LOCALDB_RECOVERY_GUIDE_URL, subscribeLocalDBRuntimeStatus } from "@/services/localdb";



const LocalDBStatusBanner = () => {
  const [status, setStatus] = useState(getLocalDBRuntimeStatus());

  useEffect(() => {
    return subscribeLocalDBRuntimeStatus(setStatus);
  }, []);

  const shouldShow = status.mode === "fallback" || !!status.resetFailedReason;
  if (!shouldShow) return null;

  const isFallback = status.mode === "fallback";
  const message =
    status.mode === "fallback"
      ? "ローカル保存が利用できません。このセッションはメモリのみで動作し、再読み込みで未同期データが失われる可能性があります。"
      : "前回セッションでローカルDBエラーが発生しました。";

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex flex-wrap items-start gap-3 text-sm">
        <div className="mt-0.5 flex items-center gap-2 font-bold">
          {status.mode === "fallback" ? (
            <AlertTriangle size={18} />
          ) : (
            <Database size={18} />
          )}
          <span>ストレージ警告</span>
        </div>
        <div className="flex-1 min-w-60">
          <p>{message}</p>
          {status.resetFailedReason && (
            <p className="mt-1 text-xs opacity-80 break-all">
              詳細: {status.resetFailedReason}
            </p>
          )}
          <a
            href={LOCALDB_RECOVERY_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-bold underline"
          >
            復旧手順（Chrome サイトデータ削除）
          </a>
        </div>
        {!isFallback && status.resetFailedReason && (
          <button
            type="button"
            onClick={clearLocalDBResetFailureReason}
            className="rounded p-1 text-amber-800 hover:bg-amber-200/70"
            aria-label="通知を閉じる"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};



export { LocalDBStatusBanner };
