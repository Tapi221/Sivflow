import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/Components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Checkbox } from '@/Components/ui/checkbox';
import { Button } from '@/Components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { ArrowLeft, Save, RefreshCw, CheckCircle, X, Clock, AlertTriangle, Cloud } from 'lucide-react';
import DataRescuePanel from '@/Components/settings/DataRescuePanel';
import { getLocalDb } from '../services/localDB';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { SyncSettings as SyncSettingsType } from '@/types/sync';
import { DEFAULT_SYNC_SETTINGS } from '@/types/sync';

/**
 * 同期設定画面
 * - 自動同期トグル
 * - 間隔選択（5/15/30/60分）
 * - WiFi限定チェックボックス
 * - 同期診断タブ（過去7日間の統計）
 * - 同期診断タブ（過去7日間の統計）
 */

export default function SyncSettings() {
  const { reloadSyncSettings, syncService, syncStatus, lastSyncTime, conflictCount } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [settings, setSettings] = useState<SyncSettingsType>(DEFAULT_SYNC_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    successRate: 0,
    avgDuration: 0,
    errorRate: 0,
    totalSyncs: 0,
  });
  const [isChecking, setIsChecking] = useState(false);

  // START: DEBUG HOOKS FOR VERIFICATION
  const [debugStatus, setDebugStatus] = useState<any>(null);
  const [debugConflict, setDebugConflict] = useState<number | null>(null);
  
  const effectiveSyncStatus = debugStatus || syncStatus;
  const effectiveConflictCount = debugConflict !== null ? debugConflict : conflictCount;

  useEffect(() => {
    // 開発環境・テスト環境のみフックを有効化
    if (import.meta.env.DEV) {
      (window as any).forceSyncUI = (status: string | null, conflict: number | null) => {
        setDebugStatus(status);
        setDebugConflict(conflict);
        console.log(`[Debug] Forced UI Status: ${status}, Conflict: ${conflict}`);
      };
    }
  }, []);
  // END: DEBUG HOOKS

  const loadSettings = useCallback(async () => {
    try {
      const db = await getLocalDb();
      const saved = await db.syncSettings.get('default');
      if (saved) {
        setSettings(saved);
      }
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (showFeedback = false) => {
    if (!syncService) return;
    
    if (showFeedback) setIsChecking(true);
    try {
      const syncStats = await syncService.getSyncStats();
      setStats(syncStats);
      if (showFeedback) success('診断情報を更新しました');
    } catch (error) {
      console.error('Failed to load sync stats:', error);
      if (showFeedback) toastError('診断情報の更新に失敗しました');
    } finally {
      if (showFeedback) setIsChecking(false);
    }
  }, [syncService, success, toastError]);

  useEffect(() => {
    loadSettings();
    loadStats(false);
  }, [loadSettings, loadStats]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getLocalDb();
      await db.syncSettings.put(settings);
      await reloadSyncSettings();
      success('設定を保存しました');
    } catch (error) {
      console.error('Failed to save sync settings:', error);
      toastError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-10 w-10 shrink-0 rounded-full bg-white shadow-sm border border-slate-100 md:bg-transparent md:shadow-none md:border-none">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">同期設定</h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium">
            クラウド同期の動作をカスタマイズ
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4 md:space-y-6">
        <TabsList className="w-full grid grid-cols-2 h-11 md:h-10 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="settings" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">設定</TabsTrigger>
          <TabsTrigger value="diagnostics" className="rounded-lg text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">同期診断</TabsTrigger>
        </TabsList>

        {/* 設定タブ */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>同期オプション</CardTitle>
              <CardDescription>
                自動同期の動作を調整します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 自動同期 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">自動同期</h3>
                  <p className="text-sm text-gray-600">
                    定期的にクラウドと同期します
                  </p>
                </div>
                <Switch
                  checked={settings.autoSync}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoSync: checked })
                  }
                />
              </div>

              {/* 同期間隔 */}
              <div className="space-y-2">
                <label className="font-medium">同期間隔</label>
                <Select
                  value={String(settings.intervalMinutes)}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      intervalMinutes: Number(value) as 5 | 15 | 30 | 60,
                    })
                  }
                  disabled={!settings.autoSync}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5分ごと</SelectItem>
                    <SelectItem value="15">15分ごと</SelectItem>
                    <SelectItem value="30">30分ごと</SelectItem>
                    <SelectItem value="60">1時間ごと</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  バッテリー消費を抑えたい場合は間隔を長くしてください
                </p>
              </div>

              {/* WiFi限定 */}
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="wifiOnly"
                  checked={settings.wifiOnly}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, wifiOnly: checked as boolean })
                  }
                />
                <div>
                  <label htmlFor="wifiOnly" className="font-medium cursor-pointer">
                    WiFi接続時のみ同期
                  </label>
                  <p className="text-sm text-gray-600">
                    モバイルデータ通信量を節約できます
                  </p>
                </div>
              </div>

              {/* 保存ボタン */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>




        {/* 同期診断タブ */}
        <TabsContent value="diagnostics">
          <div className="space-y-6">
            {/* 1. Main Status Card */}
            <Card className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="pt-8 pb-8 text-center">
                {/* Icon & Label */}
                <div className="flex flex-col items-center justify-center gap-4 mb-6">
                  {effectiveSyncStatus === 'syncing' ? (
                    <div className="relative">
                      <RefreshCw className="w-16 h-16 text-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Cloud className="w-6 h-6 text-blue-500 fill-blue-100" />
                      </div>
                    </div>
                  ) : effectiveConflictCount > 0 ? (
                    /* Prioritize Conflict Display */
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                      </div>
                    </div>
                  ) : effectiveSyncStatus === 'success' ? (
                     <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-primary-600/10 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-primary-600" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-50">
                         <Cloud className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                  ) : effectiveSyncStatus === 'error' ? (
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-8 h-8 text-red-600" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                      <Cloud className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  
                  <h2 className="text-xl font-bold">
                    {effectiveSyncStatus === 'syncing' ? '同期中...' :
                     effectiveConflictCount > 0 ? 'データの競合があります' :
                     effectiveSyncStatus === 'success' ? '同期完了' :
                     effectiveSyncStatus === 'error' ? '一時的なエラー' :
                     '同期待機中'}
                  </h2>
                </div>

                {/* Reassurance Message */}
                <p className="text-base text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                  {effectiveSyncStatus === 'syncing' ? 
                    'データをクラウドに保存しています。そのままお待ちください。' :
                   effectiveConflictCount > 0 ?
                    '複数の端末で同時に編集されたデータがあります。右上のメニューから「競合解決」を行ってください。' :
                   effectiveSyncStatus === 'success' ? 
                    'あなたのデータは安全にバックアップされています。どの端末からでも最新のデータにアクセスできます。' :
                   effectiveSyncStatus === 'error' ? 
                    'クラウドへの接続に失敗しましたが、データは端末内に安全に保存されています。接続が回復し次第、自動的に再開します。' :
                    'まだ同期が実行されていません。ログインするとデータが安全にバックアップされます。'}
                </p>

                {/* Last Sync Time (Reuse Component Logic via helper or just text) */}
                 {lastSyncTime && (
                  <p className="text-sm text-slate-400">
                    {(() => {
                        const date = new Date(lastSyncTime);
                        const now = new Date();
                        const isToday = date.toDateString() === now.toDateString();
                        const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                        if (isToday) return `最終同期：今日 ${timeStr}`;
                        return `最終同期：${date.toLocaleDateString('ja-JP')} ${timeStr}`;
                    })()}
                  </p>
                 )}
              </CardContent>
            </Card>

            {/* Data Rescue Tool (Dev/Debug) */}
            <DataRescuePanel />

            {/* 2. Hidden Detail Section */}
            <details className="group">
              <summary className="flex items-center justify-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700 py-4 select-none">
                <span>詳細・履歴を見る</span>
                <Clock className="w-4 h-4 transition-transform group-open:rotate-180" />
              </summary>
              
              <div className="space-y-6 pt-2 animate-in slide-in-from-top-2 fade-in duration-300">
                {/* 統計カード (Existing) */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <Card>
                    <CardContent className="p-4 pt-5 md:pt-6">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                        <span className="text-xs md:text-sm text-gray-600 font-bold">成功率</span>
                      </div>
                      <p className="text-xl md:text-2xl font-black text-green-600 tracking-tight">
                        {stats.totalSyncs === 0 ? '-' : `${stats.successRate.toFixed(0)}%`}
                      </p>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardContent className="p-4 pt-5 md:pt-6">
                      <div className="flex items-center gap-2 mb-1.5">
                        <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                        <span className="text-xs md:text-sm text-gray-600 font-bold">総回数</span>
                      </div>
                      <p className="text-xl md:text-2xl font-black text-purple-600 tracking-tight">
                        {stats.totalSyncs}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Technical Diagnostics Actions */}
                <Card>
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      同期システムの健全性をマニュアルで確認します
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadStats(true)}
                      disabled={isChecking}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                      診断を実行
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </details>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
