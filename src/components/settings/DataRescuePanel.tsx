import { useState, useEffect } from "react";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocalDB, initializeDB, getLocalDb } from "@/services/localDB";
import { useAuth } from "@/contexts/AuthContext";
import {
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
} from "@/ui/icons";
import { useToast } from "@/contexts/ToastContext";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export default function DataRescuePanel() {
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [databases, setDatabases] = useState<
    (IDBDatabaseInfo & {
      counts?: unknown;
      tableDetails?: unknown;
      isCurrent?: boolean;
    })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<string>("");
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Live Stats for Summary Section
  const currentStats = useLiveQuery(
    async () => {
      if (!currentUser) return { folders: 0, cards: 0 };
      const db = await getLocalDb();
      const folders = await db.folders.count();
      const cards = await db.cards.count();
      return { folders, cards };
    },
    [currentUser],
    { folders: 0, cards: 0 },
  );

  const refreshList = async () => {
    setLoading(true);
    setScanResult("データベース一覧を取得中...");
    try {
      const dbs = await LocalDB.listDatabases();
      const db = await getLocalDb();
      const currentDbName = db.name;

      const enriched: unknown[] = [];
      console.log(`[Rescue] Scanning ${dbs.length} databases...`);

      for (let i = 0; i < dbs.length; i++) {
        const d = dbs[i];
        if (!d.name) {
          enriched.push(d);
          continue;
        }

        // Skip internal Firebase Auth/Heartbeat DBs to prevent locking/login issues
        if (
          d.name.includes("firebaseLocalStorage") ||
          d.name.includes("heat-database") ||
          d.name.includes("heartbeat")
        ) {
          continue;
        }

        setScanResult(`分析中 (${i + 1}/${dbs.length}): ${d.name}...`);

        try {
          const tempDb = new Dexie(d.name);
          // 3秒でタイムアウトさせる（スキャン時は短めで良い）
          await Promise.race([
            tempDb.open(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 3000),
            ),
          ]);

          const tableDetails: unknown = {};
          for (const table of tempDb.tables) {
            try {
              const count = await table.count();
              tableDetails[table.name] = count;
            } catch (e) {}
          }

          const counts: unknown = {
            folders:
              tableDetails["folders"] ||
              tableDetails["folder"] ||
              tableDetails["folder_list"] ||
              0,
            cards:
              tableDetails["cards"] ||
              tableDetails["card"] ||
              tableDetails["flashcards"] ||
              tableDetails["flash_cards"] ||
              0,
            logs:
              tableDetails["studyLogs"] ||
              tableDetails["study_logs"] ||
              tableDetails["learning_history"] ||
              tableDetails["history"] ||
              0,
            total: Object.values(tableDetails).reduce(
              (a: unknown, b: unknown) => a + b,
              0,
            ),
          };

          tempDb.close();

          // Only include if it has data
          if (counts.total > 0) {
            enriched.push({
              ...d,
              counts,
              tableDetails,
              isCurrent: d.name === currentDbName,
            });
          }
        } catch (e: unknown) {
          console.warn(
            `[Rescue] Skipping ${d.name} due to scan error/timeout:`,
            e.message,
          );
        }
      }

      // Sort: databases with actual cards/folders first
      enriched.sort((a, b) => {
        const aVal = (a.counts?.cards || 0) + (a.counts?.folders || 0);
        const bVal = (b.counts?.cards || 0) + (b.counts?.folders || 0);
        if (aVal !== bVal) return bVal - aVal;
        return (b.counts?.total || 0) - (a.counts?.total || 0);
      });

      setDatabases(enriched);
      setScanResult(
        `スキャン完了 (${enriched.length}個のバックアップが見つかりました)`,
      );
    } catch (e: unknown) {
      console.error("Failed to list databases", e);
      setScanResult(`スキャン失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleImport = async (targetDbName: string) => {
    if (!currentUser) return;

    setLogs([]); // Clear logs
    setImporting(targetDbName);
    setProgressMsg("初期化中...");
    const addLog = (m: string) => {
      setLogs((prev) => [
        ...prev.slice(-500),
        `${new Date().toLocaleTimeString()}: ${m}`,
      ]);
    };

    addLog(`復元開始: ${targetDbName}`);
    try {
      initializeDB(currentUser.uid);
      const targetUserDb = await getLocalDb();

      const result = await targetUserDb.importFromDatabase(
        targetDbName,
        currentUser.uid,
        (msg) => {
          setProgressMsg(msg);
          addLog(msg);
        },
      );
      addLog(`完了！ フォルダ: ${result.folders}, カード: ${result.cards}`);

      success(`復元が完了しました。反映には【再読み込み】が必要です。`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      console.error(e);
      addLog(`エラー: ${e.message}`);
      error(`復元失敗: ${e.message}`);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Summary Section */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/5 border-white/10 shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {currentStats?.folders || 0}
              </div>
              <div className="text-xs font-bold text-slate-400">
                作成済みフォルダ
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {currentStats?.cards || 0}
              </div>
              <div className="text-xs font-bold text-slate-400">
                作成済みカード
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Restoration Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-slate-400" />
              バックアップからの復元
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              このブラウザに保存されている過去のデータから復元できます
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshList}
            disabled={loading}
            className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            再スキャン
          </Button>
        </div>

        {databases.length === 0 && !loading ? (
          <Card className="border-dashed border-white/20 bg-white/5 rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Folder className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">
                復元可能なバックアップは見つかりませんでした
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {databases
              .filter((d) => !d.isCurrent)
              .map((d) => (
                <Card
                  key={d.name}
                  className="overflow-hidden border-white/10 hover:border-emerald-500/50 bg-white/5 transition-colors group rounded-xl"
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded-lg text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm">
                              Backup Data
                            </span>
                            <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-serif border border-white/10">
                              {d.name?.slice(-8)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex gap-3">
                            <span>
                              Folders: <b>{d.counts?.folders || 0}</b>
                            </span>
                            <span>
                              Cards: <b>{d.counts?.cards || 0}</b>
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-slate-700/50 hover:bg-emerald-600 text-white transition-colors border border-white/10 backdrop-blur-sm"
                        onClick={() => handleImport(d.name || "")}
                        disabled={importing !== null}
                      >
                        {importing === d.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-2" />
                            復元する
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* 3. Advanced Tools (Collapsible) */}
      <Collapsible
        open={isAdvancedOpen}
        onOpenChange={setIsAdvancedOpen}
        className="border-t border-white/10 pt-6"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex justify-between text-slate-400 hover:text-white hover:bg-white/5 h-12 rounded-xl"
          >
            <span className="flex items-center gap-2 text-xs font-bold">
              <RefreshCw className="w-4 h-4" />
              高度な機能 / トラブルシューティング
            </span>
            {isAdvancedOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Integrity Repair */}
          <Card className="border-sky-500/20 bg-sky-500/10 rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                データの正規化 (Normalization)
              </CardTitle>
              <CardDescription className="text-xs text-sky-200/70">
                重複してしまったフォルダなどを整理し、データを正しい状態に修復します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                className="bg-sky-600 hover:bg-sky-500 text-white w-full border border-sky-400/30"
                onClick={async () => {
                  if (!currentUser) return;
                  setLoading(true);
                  try {
                    initializeDB(currentUser.uid);
                    const userDb = await getLocalDb();
                    const result = await userDb.repairDataIntegrity(
                      currentUser.uid,
                      setProgressMsg,
                    );
                    success(
                      `修復完了: ${result.folders}個のフォルダ、${result.cards}件のカードを整理しました。`,
                    );
                    window.location.reload();
                  } catch (err: unknown) {
                    error(`エラー: ${err.message}`);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                修復を実行
              </Button>
            </CardContent>
          </Card>

          {/* Forensic Audit */}
          <Card className="border-red-500/20 bg-red-500/10 rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                詳細スキャン (Forensic Audit)
              </CardTitle>
              <CardDescription className="text-xs text-red-200/70">
                ブラウザ内の全ての領域を強制スキャンし、隠れたデータを探します（上級者向け）。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="destructive"
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 backdrop-blur-sm"
                onClick={async () => {
                  if (!confirm("大量のログが出力されますがよろしいですか？"))
                    return;
                  try {
                    await LocalDB.fullOriginForensicAudit((msg) =>
                      console.log(msg),
                    );
                    alert("完了しました。F12コンソールを確認してください。");
                  } catch (err: unknown) {
                    alert(err.message);
                  }
                }}
              >
                完全スキャンを実行
              </Button>
            </CardContent>
          </Card>

          {/* Logs Area */}
          {logs.length > 0 && (
            <div className="p-3 bg-black/40 rounded-lg border border-white/10 font-serif text-[9px] text-emerald-400 max-h-40 overflow-y-auto custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function HistoryIcon(props: unknown) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
      <path d="M3 3v9h9" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
