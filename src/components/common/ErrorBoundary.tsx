import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Trash2 } from "@/ui/icons";
import { getActiveTabCountEstimate } from "@/utils/tabPresence";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 致命的なクラッシュをキャッチし、復旧UIを表示するコンポーネント
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private async getPendingSyncCount(): Promise<number | null> {
    try {
      const { getLocalDb } = await import("@/services/localDB");
      const db = await getLocalDb();
      const pending = await db.syncQueue
        .where("status")
        .equals("pending")
        .count();
      const processing = await db.syncQueue
        .where("status")
        .equals("processing")
        .count();
      return pending + processing;
    } catch (error) {
      console.warn("[ErrorBoundary] Failed to read pending sync count", error);
      return null;
    }
  }

  private getSyncWarningMessage(pendingSyncCount: number | null): string {
    if (pendingSyncCount === null) {
      return "未同期状況を確認できません。";
    }
    if (pendingSyncCount === 0) {
      return "未同期は検出されません。";
    }
    return `未同期の可能性: ${pendingSyncCount}件`;
  }

  private getTabHint(): string {
    const tabs = getActiveTabCountEstimate();
    if (tabs === null) {
      return "（同一サイトの他タブ状況: 不明）";
    }
    return `（同一サイトの推定タブ数: ${tabs}）`;
  }

  private deleteDatabaseByName(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const request = window.indexedDB.deleteDatabase(name);
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Delete database timed out: ${name}`));
      }, 5000);

      const complete = (handler: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        handler();
      };

      request.onsuccess = () => complete(resolve);
      request.onerror = () =>
        complete(() =>
          reject(
            request.error ?? new Error(`Failed to delete database: ${name}`),
          ),
        );
      request.onblocked = () =>
        complete(() =>
          reject(new Error(`Delete database blocked by another tab: ${name}`)),
        );
    });
  }

  private async clearIndexedDbDatabases(): Promise<void> {
    if (!window.indexedDB.databases) return;
    const databases = await window.indexedDB.databases();
    const names = databases
      .map((db) => db.name)
      .filter((name): name is string => Boolean(name));
    await Promise.all(names.map((name) => this.deleteDatabaseByName(name)));
  }

  private async closeLocalDbBestEffort(): Promise<void> {
    try {
      const { getLocalDb } = await import("@/services/localDB");
      const db = await getLocalDb();
      (db as unknown)?.close?.();
    } catch {
      // ignore: recovery flow should proceed even if local DB cannot be obtained
    }
  }

  private handleClearCache = async () => {
    const pendingSyncCount = await this.getPendingSyncCount();
    const syncWarning = this.getSyncWarningMessage(pendingSyncCount);
    const tabHint = this.getTabHint();

    const firstConfirmation = confirm(
      `キャッシュ復旧の最終手段を実行します。\n${syncWarning}\n\n` +
        `実行前に、このアプリの他タブを閉じてください。${tabHint}\n\n` +
        "実行内容:\n" +
        "- Cache API 全削除\n" +
        "- Service Worker 登録解除\n" +
        "- IndexedDB 削除\n" +
        "- Local/Session Storage クリア\n\n" +
        "続行しますか？",
    );
    if (!firstConfirmation) return;

    const secondConfirmation = confirm(
      `本当に実行しますか？\n` +
        `この操作は取り消せません。\n${syncWarning}\n${tabHint}`,
    );
    if (!secondConfirmation) return;

    try {
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
      }

      await this.closeLocalDbBestEffort();
      await this.clearIndexedDbDatabases();

      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error("[ErrorBoundary] Cache recovery failed", error);
      const isBlocked = String((error as Error)?.message ?? "").includes(
        "blocked",
      );
      const message = isBlocked
        ? `復旧操作が他タブにブロックされました。${tabHint}\n他タブを閉じて再実行してください。`
        : `復旧操作の一部に失敗しました。${tabHint}\nアプリの他タブを閉じてから再実行してください。`;
      alert(message);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          {/* @ts-expect-error shadcn card props widening mismatch */}
          <Card className="max-w-md w-full rounded-[32px] border-none shadow-xl overflow-hidden">
            {/* @ts-expect-error shadcn card header props widening mismatch */}
            <CardHeader className="bg-red-50 pb-6 pt-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              {/* @ts-expect-error shadcn card title props widening mismatch */}
              <CardTitle className="text-center text-red-800">
                問題が発生しました
              </CardTitle>
            </CardHeader>
            {/* @ts-expect-error shadcn card content props widening mismatch */}
            <CardContent className="p-8 pt-6">
              <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
                アプリケーションの実行中に予期せぬエラーが発生しました。
                データの不整合またはメモリ不足の可能性があります。
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl mb-8 overflow-auto max-h-32">
                <pre className="text-[10px] text-slate-500 font-serif">
                  {this.state.error?.message || "Unknown error"}
                  {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl h-12 font-bold shadow-md transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  アプリを再読み込み
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleClearCache}
                  className="w-full border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl h-12 font-bold transition-all"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  キャッシュをクリアして修復
                </Button>
              </div>

              <p className="text-[10px] text-slate-400 text-center mt-6">
                何度もこの画面が表示される場合は、サポートにお問い合わせください。
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (this as unknown).props.children;
  }
}
